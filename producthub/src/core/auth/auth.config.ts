import type { NextAuthConfig } from 'next-auth';
import type { Role, Permission } from '@/core/auth/permissions';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: Role;
  additionalPermissions: Permission[];
}

declare module 'next-auth' {
  interface Session {
    user: SessionUser;
  }
}

export const authConfig: NextAuthConfig = {
  secret: process.env.AUTH_SECRET || 'dev-fallback-secret-storeproduct-key-32chars',
  pages: {
    signIn: '/auth/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 ngày
  },
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.id = String(user.id);
        token.email = String(user.email);
        token.name = String(user.name);
        token.avatar = user.avatar ? String(user.avatar) : undefined;
        token.role = String(user.role);
        token.additionalPermissions = Array.isArray(user.additionalPermissions)
          ? user.additionalPermissions.map(String)
          : [];
      }
      return token;
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: { session: any; token: any }) {
      session.user = {
        id: token.id as string,
        email: token.email as string,
        name: token.name as string,
        avatar: token.avatar as string | undefined,
        role: token.role as Role,
        additionalPermissions: (token.additionalPermissions as Permission[]) ?? [],
      };
      return session;
    },
  },
  providers: [],
};
