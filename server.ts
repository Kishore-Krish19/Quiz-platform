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

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  
  // Make PORT configurable via environment variables
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Initialize MongoDB Connection (Required for Competition / Production)
  try {
    await connectMongoDB();
    if (mongoState.isConnected) {
      await db.loadFromMongoDB();
    }
  } catch (dbErr: any) {
    console.error('CRITICAL DATABASE ERROR ON BOOT:', dbErr.message);
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEV_FALLBACK !== 'true') {
      throw dbErr;
    }
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
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
