import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { auth } from '@/core/auth/auth';
import { apiSuccess, apiErrors } from '@/core/response/api-response';
import { connectDB } from '@/core/db/connect';
import { ErrorMonitoringService } from '@/modules/errors/services/error-monitoring.service';

export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return apiErrors.unauthorized();
    }

    // Kiểm tra DB
    await connectDB();
    const dbState = mongoose.connection.readyState;
    const dbStatus =
      dbState === 1
        ? 'healthy'
        : dbState === 2
        ? 'connecting'
        : 'unhealthy';

    // Kiểm tra Google Drive (chỉ kiểm tra token & config, không upload/xóa file giả)
    const driveConfigured = !!(
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_TOKEN_ENCRYPTION_KEY
    );

    // Error stats
    const errorStats = await ErrorMonitoringService.getErrorStats();

    // Memory info
    const mem = process.memoryUsage();

    return apiSuccess({
      status: dbState === 1 ? 'operational' : 'degraded',
      services: {
        database: {
          name: 'MongoDB Atlas',
          status: dbStatus,
          readyState: dbState,
        },
        storage: {
          name: 'Google Drive Storage',
          status: driveConfigured ? 'configured' : 'not_configured',
        },
      },
      errors: errorStats,
      system: {
        uptimeSeconds: Math.floor(process.uptime()),
        memoryUsedMB: Math.round(mem.rss / 1024 / 1024),
      },
      checkedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return apiErrors.internal(error.message);
  }
}
