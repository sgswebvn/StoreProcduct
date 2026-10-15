/**
 * Standardized API response helpers.
 *
 * Mọi API route phải dùng các helper này để đảm bảo
 * response envelope nhất quán:
 *   { success: true, data: {...}, meta?: {...} }
 *   { success: false, error: { code: string, message: string, details?: unknown } }
 */

import { NextResponse } from 'next/server';

// ─── Pagination meta ─────────────────────────────────────────
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Success responses ────────────────────────────────────────

export function apiSuccess<T>(
  data: T,
  status: number = 200,
  meta?: PaginationMeta | Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    { success: true, data, ...(meta ? { meta } : {}) },
    { status }
  );
}

export function apiCreated<T>(data: T): NextResponse {
  return apiSuccess(data, 201);
}

export function apiNoContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

// ─── Error responses ──────────────────────────────────────────

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'BAD_REQUEST'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'MODULE_DISABLED'
  | 'OPTIMISTIC_LOCK_CONFLICT';

export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: unknown
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
    },
    { status }
  );
}

export const apiErrors = {
  notFound: (resource = 'Resource') =>
    apiError('NOT_FOUND', `${resource} not found`, 404),

  unauthorized: (message = 'Authentication required') =>
    apiError('UNAUTHORIZED', message, 401),

  forbidden: (message = 'You do not have permission to perform this action') =>
    apiError('FORBIDDEN', message, 403),

  validation: (details: unknown) =>
    apiError('VALIDATION_ERROR', 'Request validation failed', 422, details),

  conflict: (message: string) =>
    apiError('CONFLICT', message, 409),

  moduleDisabled: (moduleId: string) =>
    apiError('MODULE_DISABLED', `Module '${moduleId}' is not enabled`, 404),

  optimisticLock: () =>
    apiError(
      'OPTIMISTIC_LOCK_CONFLICT',
      'This record was modified by someone else. Please refresh and try again.',
      409
    ),

  internal: (message = 'An unexpected error occurred') =>
    apiError('INTERNAL_ERROR', message, 500),
} as const;
