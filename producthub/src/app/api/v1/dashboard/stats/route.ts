import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { auth } from '@/core/auth/auth';
import { apiSuccess, apiErrors } from '@/core/response/api-response';
import { connectDB } from '@/core/db/connect';
import Product from '@/modules/products/infra/product.model';
import Media from '@/modules/media/infra/media.model';
import User from '@/modules/users/infra/user.model';
import { AuditService } from '@/modules/audit/services/audit.service';
import { ErrorMonitoringService } from '@/modules/errors/services/error-monitoring.service';
import SystemError from '@/modules/errors/infra/system-error.model';

export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return apiErrors.unauthorized();
    }

    await connectDB();

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalProducts,
      activeProducts,
      draftProducts,
      archivedProducts,
      recentProducts,
      totalMedia,
      totalUsers,
      recentActivities,
      errorStats,
      recentErrors,
    ] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ status: 'active' }),
      Product.countDocuments({ status: 'draft' }),
      Product.countDocuments({ status: 'archived' }),
      Product.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Media.countDocuments({ status: 'active' }),
      User.countDocuments({ status: 'active' }),
      AuditService.getRecentActivities(6),
      ErrorMonitoringService.getErrorStats(),
      SystemError.find({ status: { $in: ['new', 'investigating'] } })
        .sort({ lastSeenAt: -1 })
        .limit(5)
        .lean(),
    ]);

    // Trạng thái DB
    const isDbConnected = mongoose.connection.readyState === 1;

    // Trạng thái Google Drive
    const isDriveConfigured = !!(
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_TOKEN_ENCRYPTION_KEY
    );

    return apiSuccess({
      counts: {
        products: {
          total: totalProducts,
          active: activeProducts,
          draft: draftProducts,
          archived: archivedProducts,
          recent7Days: recentProducts,
        },
        media: {
          total: totalMedia,
        },
        users: {
          total: totalUsers,
        },
      },
      health: {
        database: isDbConnected ? 'healthy' : 'disconnected',
        storage: isDriveConfigured ? 'configured' : 'not_configured',
        systemStatus:
          !isDbConnected
            ? 'incident'
            : errorStats.critical > 0
            ? 'warning'
            : 'healthy',
      },
      errors: errorStats,
      recentActivities,
      recentErrors,
    });
  } catch (error: any) {
    return apiErrors.internal(error.message);
  }
}
