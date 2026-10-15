import { NextRequest } from 'next/server';
import { auth } from '@/core/auth/auth';
import { hasPermission } from '@/core/auth/permissions';
import { apiSuccess, apiErrors } from '@/core/response/api-response';
import { SettingService } from '@/modules/settings/services/setting.service';

export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return apiErrors.unauthorized();
    }

    if (
      !hasPermission(
        session.user.role,
        session.user.additionalPermissions || [],
        'settings.read'
      )
    ) {
      return apiErrors.forbidden('Bạn không có quyền xem cấu hình hệ thống');
    }

    const [settingsGrouped, envStatus] = await Promise.all([
      SettingService.getAllGrouped(),
      Promise.resolve(SettingService.getEnvStatus()),
    ]);

    return apiSuccess({
      settings: settingsGrouped,
      env: envStatus,
    });
  } catch (error: any) {
    return apiErrors.internal(error.message);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return apiErrors.unauthorized();
    }

    if (
      !hasPermission(
        session.user.role,
        session.user.additionalPermissions || [],
        'settings.update'
      )
    ) {
      return apiErrors.forbidden('Bạn không có quyền cập nhật cấu hình hệ thống');
    }

    const { key, value, version } = await req.json();

    if (!key || version === undefined) {
      return apiErrors.badRequest('Thiếu thông tin key hoặc version cấu hình');
    }

    const updated = await SettingService.updateSetting(
      key,
      value,
      version,
      session.user.id
    );

    return apiSuccess(updated);
  } catch (error: any) {
    return apiErrors.badRequest(error.message);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return apiErrors.unauthorized();
    }

    if (
      !hasPermission(
        session.user.role,
        session.user.additionalPermissions || [],
        'settings.update'
      )
    ) {
      return apiErrors.forbidden('Bạn không có quyền đặt lại cấu hình mặc định');
    }

    const { key, action } = await req.json();

    if (action === 'reset' && key) {
      const result = await SettingService.resetToDefault(key, session.user.id);
      return apiSuccess(result);
    }

    return apiErrors.badRequest('Hành động không hợp lệ');
  } catch (error: any) {
    return apiErrors.badRequest(error.message);
  }
}
