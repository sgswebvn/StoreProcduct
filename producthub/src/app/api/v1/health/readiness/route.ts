import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/core/db/connect';

export async function GET() {
  try {
    await connectDB();
    const isDbConnected = mongoose.connection.readyState === 1;

    if (!isDbConnected) {
      return NextResponse.json(
        { status: 'unready', reason: 'Database is not connected' },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'unready', reason: error.message },
      { status: 503 }
    );
  }
}
