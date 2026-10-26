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

/**
 * Redacts password credentials from a MongoDB connection URI for safe logging (Finding PR-03).
 */
export function sanitizeMongoUri(uri: string): string {
  if (!uri || typeof uri !== 'string') return '';
  return uri.replace(/\/\/(?:([^:]+)(?::([^@]+))?@)/, (_, username) => {
    return `//${username ? `${username}:***@` : '***@'}`;
  });
}

/**
 * Connects to MongoDB.
 * Tries the primary URI (env.MONGODB_URI or supplied uri) first.
 * If that fails and we are in development, falls back to a local MongoDB instance.
 * Returns true on successful connection, false otherwise.
 */
export async function connectDatabase(uri?: string): Promise<boolean> {
  const primaryUri = uri ?? env.MONGODB_URI;
  const fallbackUri = 'mongodb://127.0.0.1:27017/apnavault';

  const tryConnect = async (connectionUri: string): Promise<boolean> => {
    if (!connectionUri || !connectionUri.trim()) {
      console.warn('[Database] MONGODB_URI is not provided. Skipping database connection.');
      return false;
    }
    attachConnectionListeners();
    try {
      await mongoose.connect(connectionUri, { serverSelectionTimeoutMS: 5000 });
      return true;
    } catch (error: unknown) {
      const safeUri = sanitizeMongoUri(connectionUri);
      const safeMessage = sanitizeMongoUri(error instanceof Error ? error.message : String(error));
      console.error(`[Database] Failed to connect to MongoDB at ${safeUri}: ${safeMessage}`);
      return false;
    }
  };

  // Attempt primary URI
  if (await tryConnect(primaryUri)) return true;

  // Fallback in development environment
  if (env.NODE_ENV === 'development' && primaryUri !== fallbackUri) {
    console.warn('[Database] Falling back to local MongoDB instance.');
    if (await tryConnect(fallbackUri)) return true;
  }

  return false;
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
