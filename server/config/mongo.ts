import mongoose from 'mongoose';

export interface MongoStatus {
  isConnected: boolean;
  uri: string;
  databaseName: string;
  lastError: string | null;
  mode: 'PRODUCTION_MONGODB' | 'DEV_OFFLINE_PREVIEW';
}

const DEFAULT_LOCAL_MONGO = 'mongodb://127.0.0.1:27017/gadget_code';

export const mongoState: MongoStatus = {
  isConnected: false,
  uri: process.env.MONGODB_URI || DEFAULT_LOCAL_MONGO,
  databaseName: 'gadget_code',
  lastError: null,
  mode: process.env.NODE_ENV === 'production' ? 'PRODUCTION_MONGODB' : 'DEV_OFFLINE_PREVIEW',
};

export async function connectMongoDB(): Promise<boolean> {
  const uri = process.env.MONGODB_URI || DEFAULT_LOCAL_MONGO;
  mongoState.uri = uri;

  console.log(`\n================================================================`);
  console.log(`🔌 [DATABASE] Attempting MongoDB Connection...`);
  console.log(`   Target URI: ${uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`================================================================\n`);

  try {
    mongoose.set('strictQuery', false);
    
    // Attempt connection with a strict timeout
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
      socketTimeoutMS: 15000,
    });

    mongoState.isConnected = true;
    mongoState.databaseName = mongoose.connection.name || 'gadget_code';
    mongoState.lastError = null;
    mongoState.mode = 'PRODUCTION_MONGODB';

    // Drop legacy id_1 index from questions collection if it exists
    try {
      const collections = await mongoose.connection.db?.listCollections().toArray();
      if (collections?.some((c) => c.name === 'questions')) {
        const qColl = mongoose.connection.db?.collection('questions');
        const indexes = await qColl?.indexes();
        if (indexes?.some((idx) => idx.name === 'id_1')) {
          await qColl?.dropIndex('id_1');
          console.log('🧹 [DATABASE] Dropped legacy id_1 index from questions collection');
        }
      }
    } catch (indexErr) {
      // Non-blocking index cleanup
    }

    console.log(`\n================================================================`);
    console.log(`✅ [DATABASE CONNECTED] Successfully connected to MongoDB!`);
    console.log(`   Database Name: ${mongoState.databaseName}`);
    console.log(`   Status: Primary Production / Competition Storage is ACTIVE`);
    console.log(`================================================================\n`);

    // Listen for disconnects
    mongoose.connection.on('disconnected', () => {
      mongoState.isConnected = false;
      console.error('⚠️ [DATABASE ALERT] MongoDB disconnected from server!');
    });

    mongoose.connection.on('reconnected', () => {
      mongoState.isConnected = true;
      console.log('✅ [DATABASE RECONNECTED] MongoDB reconnected successfully.');
    });

    return true;
  } catch (err: any) {
    mongoState.isConnected = false;
    mongoState.lastError = err.message || String(err);

    console.error(`\n================================================================`);
    console.error(`❌ [DATABASE CONNECTION FAILURE] Could not connect to MongoDB!`);
    console.error(`   Target URI: ${uri}`);
    console.error(`   Error details: ${mongoState.lastError}`);
    console.error(`----------------------------------------------------------------`);
    console.error(`   ATTENTION FOR EVENT OPERATORS:`);
    console.error(`   MongoDB is the required database for GADGET CODE competitions.`);
    console.error(`   When running locally or on the competition LAN:`);
    console.error(`   1. Start your local MongoDB service (e.g., 'mongod' or brew services start mongodb)`);
    console.error(`   2. Set MONGODB_URI in your .env file: MONGODB_URI=mongodb://127.0.0.1:27017/gadget_code`);
    console.error(`================================================================\n`);

    // If strictly in production mode and explicit fallback is not allowed, throw error
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEV_FALLBACK !== 'true') {
      throw new Error(`Fatal: MongoDB connection failed in production mode (${mongoState.lastError})`);
    }

    console.warn(`⚠️ [DEV / TEST ONLY] Operating in development testing mode.`);
    console.warn(`   Do NOT use this mode for official competition runs without MongoDB.\n`);

    return false;
  }
}
