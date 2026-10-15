import { NextRequest } from 'next/server';
import { apiSuccess, apiErrors } from '@/core/response/api-response';
import { ScriptService } from '@/modules/settings/services/script.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = (searchParams.get('scope') as 'storefront' | 'admin') || 'admin';
    const scripts = await ScriptService.getActiveScripts(scope);
    return apiSuccess(scripts);
  } catch (error: any) {
    return apiErrors.internal(error.message);
  }
}
