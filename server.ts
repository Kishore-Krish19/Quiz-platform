// Must be the first import: modules loaded below read process.env at module scope
// (the Mongo URI in config/mongo), so .env has to be in place before they are evaluated.
import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import apiRouter from './server/routes/api';
import { setupQuizSocket } from './server/sockets/quizSocket';
import { seedInitialData } from './server/services/seedService';
import { connectMongoDB, mongoState } from './server/config/mongo';
import { db } from './server/config/db';
import { quizEngine } from './server/services/quizEngine';
import { initAuth } from './server/middleware/auth';
import { StartupConfigError } from './server/config/startupError';

async function startServer() {
  // Refuse to run with a published or guessable signing secret before anything else.
  initAuth();

  const app = express();
  const server = http.createServer(app);
  
  // Make PORT configurable via environment variables
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Initialize MongoDB Connection (Required for Competition / Production)
  try {
    await connectMongoDB();
    if (mongoState.isConnected) {
      // Replays writes an earlier run held during an outage, then loads the store.
      await db.attachMongo();
    }
  } catch (dbErr: any) {
    console.error('CRITICAL DATABASE ERROR ON BOOT:', dbErr.message);
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEV_FALLBACK !== 'true') {
      throw dbErr;
    }
  }
  if (!db.isUsingMongo()) {
    db.useFileStore();
  }

  // Initialize seed data (Admin, Players, Round 1 with 10 questions into MongoDB)
  await seedInitialData();

  // Middleware
  app.use(
    cors({
      origin: '*',
      credentials: true,
    })
  );
  app.use(express.json());

  // Socket.IO Server configuration with polling and websocket transports
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['polling', 'websocket'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  setupQuizSocket(io);

  // The engine is a singleton built at import time — before the database load above —
  // so its own recovery pass ran against an empty store on a MongoDB deployment. Now
  // that the session is really in memory, re-run it: reconcile the stored session
  // against the rounds that actually exist, then re-arm (or close out) a question
  // that was still live when the process died.
  quizEngine.reconcileSession();
  quizEngine.resumeActiveQuestion();

  // REST API Routes FIRST
  app.use('/api', apiRouter);

  // Vite middleware for development (with HMR disabled to avoid iframe websocket collisions), static dist for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bind to 0.0.0.0 for LAN competition connectivity
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n================================================================`);
    console.log(`🚀 GADGET CODE Quiz Platform is ONLINE`);
    console.log(`   Local URL:    http://localhost:${PORT}`);
    console.log(`   LAN Network:  http://0.0.0.0:${PORT}`);
    console.log(`   Database:     ${mongoState.isConnected ? 'MongoDB (ACTIVE)' : 'Development Sandbox'}`);
    console.log(`================================================================\n`);
  });
}

startServer().catch((err) => {
  if (err instanceof StartupConfigError) {
    console.error(`\n================================================================`);
    console.error(`⛔ STARTUP REFUSED: ${err.message}`);
    err.help.forEach((line) => console.error(`   ${line}`));
    console.error(`================================================================\n`);
  } else {
    console.error('Fatal server startup error:', err);
  }
  process.exit(1);
});
