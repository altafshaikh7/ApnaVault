import mongoose from 'mongoose';
import { env } from './env.js';

export type DatabaseState = 'disconnected' | 'connected' | 'connecting' | 'disconnecting';

export interface DatabaseStatus {
  state: DatabaseState;
  readyState: number;
  host?: string;
  name?: string;
}

const readyStateMap: Record<number, DatabaseState> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

export function getDatabaseStatus(): DatabaseStatus {
  const readyState = mongoose.connection.readyState;
  const state = readyStateMap[readyState] ?? 'disconnected';

  return {
    state,
    readyState,
    host: state === 'connected' ? mongoose.connection.host : undefined,
    name: state === 'connected' ? mongoose.connection.name : undefined,
  };
}

export async function connectDatabase(): Promise<boolean> {
  if (!env.MONGODB_URI) {
    console.warn('[Database] MONGODB_URI not provided. Skipping database connection.');
    return false;
  }

  mongoose.connection.on('connected', () => {
    console.log(`[Database] Connected to MongoDB host: ${mongoose.connection.host}, database: ${mongoose.connection.name}`);
  });

  mongoose.connection.on('error', (err: Error) => {
    console.error('[Database] MongoDB connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[Database] MongoDB disconnected');
  });

  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    return true;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Database] Failed to connect to MongoDB at ${env.MONGODB_URI}: ${message}`);
    return false;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
      console.log('[Database] MongoDB disconnected cleanly');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[Database] Error while disconnecting MongoDB: ${message}`);
    }
  }
}
