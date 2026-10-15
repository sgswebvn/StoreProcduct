import { NextRequest } from 'next/server';
import { ApiKeyService } from '@/modules/integrations/services/api-key.service';
import { ApiKeyScope, IApiKey } from '@/modules/integrations/infra/api-key.model';

export interface ApiKeyAuthResult {
  authenticated: boolean;
  apiKey?: IApiKey;
  errorStatus?: number;
  errorMessage?: string;
}

export async function authenticateApiKey(
  req: NextRequest,
  requiredScope?: ApiKeyScope
): Promise<ApiKeyAuthResult> {
  // Lấy API key từ Header X-API-Key hoặc Authorization
  let rawKey = req.headers.get('x-api-key');

  if (!rawKey) {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      rawKey = authHeader.slice(7).trim();
    }
  }

  if (!rawKey) {
    return {
      authenticated: false,
      errorStatus: 401,
      errorMessage: 'Yêu cầu API key trong header "X-API-Key" hoặc "Authorization: Bearer <key>".',
    };
  }

  const validation = await ApiKeyService.validateApiKey(rawKey, requiredScope);

  if (!validation.valid || !validation.apiKey) {
    return {
      authenticated: false,
      errorStatus: validation.reason?.includes('quyền') ? 403 : 401,
      errorMessage: validation.reason || 'API key không hợp lệ hoặc đã bị vô hiệu hóa.',
    };
  }

  return {
    authenticated: true,
    apiKey: validation.apiKey,
  };
}
