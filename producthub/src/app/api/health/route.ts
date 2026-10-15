import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/core/db/connect';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  let dbStatus: 'connected' | 'disconnected' | 'connecting' | 'error' = 'disconnected';
  let dbLatencyMs: number | null = null;

  try {
    if (process.env.MONGODB_URI) {
      const dbStart = Date.now();
      await connectDB();
      const state = mongoose.connection.readyState;
      dbLatencyMs = Date.now() - dbStart;

      if (state === 1) dbStatus = 'connected';
      else if (state === 2) dbStatus = 'connecting';
      else dbStatus = 'disconnected';
    }
  } catch (err) {
    dbStatus = 'error';
    console.error('[Health Check DB Error]', (err as Error).message);
  }

  const isHealthy = dbStatus === 'connected' || (!process.env.MONGODB_URI && process.env.NODE_ENV === 'development');

  return NextResponse.json(
    {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      services: {
        application: 'operational',
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
        },
      },
      responseTimeMs: Date.now() - startTime,
    },
    {
      status: isHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
