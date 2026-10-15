/**
 * NextAuth v5 route handler.
 * Xử lý tất cả /api/auth/* requests.
 */
import { handlers } from '@/core/auth/auth';

export const { GET, POST } = handlers;
