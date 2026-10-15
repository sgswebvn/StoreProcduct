/**
 * MongoDB connection singleton — Vercel-safe connection caching.
 *
 * Vercel serverless functions có thể bị cold start, nhưng cũng có thể
 * reuse container giữa các invocations. Pattern này cache connection
 * trong global scope để tránh tạo quá nhiều connection mới.
 */

import mongoose from 'mongoose';


/**
 * Global cache để tránh reconnect trên mỗi hot reload trong dev
 * hoặc mỗi serverless invocation trong production.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Extend globalThis để TypeScript không complain
declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global._mongooseCache ?? {
  conn: null,
  promise: null,
};

if (!global._mongooseCache) {
  global._mongooseCache = cached;
}

export async function connectDB(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined. Please set it in .env.local');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const dbName = process.env.MONGODB_DB || 'StoreProduct';

    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      dbName,
    };

    cached.promise = mongoose.connect(uri, opts).then((m) => {
      console.log('[DB] Connected to MongoDB');
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
