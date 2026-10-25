import mongoose from 'mongoose';
import { env } from './env.js';

export type DatabaseState = 'disconnected' | 'connected' | 'connecting' | 'disconnecting';

export interface DatabaseStatus {
  state: DatabaseState;
  readyState: number;
  isConnected: boolean;
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
  const isConnected = readyState === 1;

  return {
    state,
    readyState,
    isConnected,
    host: isConnected ? mongoose.connection.host : undefined,
    name: isConnected ? mongoose.connection.name : undefined,
  };
}

export function isDatabaseReady(): boolean {
  return mongoose.connection.readyState === 1;
}

let connectionListenersAttached = false;

function attachConnectionListeners(): void {
  if (connectionListenersAttached) return;
  connectionListenersAttached = true;

  mongoose.connection.on('connected', () => {
    console.log(`[Database] Connected to MongoDB at ${mongoose.connection.host}/${mongoose.connection.name}`);
  });

  mongoose.connection.on('error', (err: Error) => {
    console.error('[Database] MongoDB connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[Database] MongoDB disconnected');
  });
}

export async function connectDatabase(uri?: string): Promise<boolean> {
  const connectionUri = uri !== undefined ? uri : env.MONGODB_URI;

  if (!connectionUri || !connectionUri.trim()) {
    console.warn('[Database] MONGODB_URI is not provided. Skipping database connection.');
    return false;
  }

  attachConnectionListeners();

  try {
    await mongoose.connect(connectionUri, {
      serverSelectionTimeoutMS: 5000,
    });
    return true;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Database] Failed to connect to MongoDB: ${message}`);
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
