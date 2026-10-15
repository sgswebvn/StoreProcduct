import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { authConfig } from './auth.config';
import { connectDB } from '@/core/db/connect';
import User from '@/modules/users/infra/user.model';

export { type SessionUser } from './auth.config';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        await connectDB();

        const user = await User.findOne({
          email: (credentials.email as string).toLowerCase().trim(),
          status: 'active',
        }).select('+passwordHash');

        if (!user) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) return null;

        // Cập nhật lastLoginAt không await để không block
        User.updateOne(
          { _id: user._id },
          { lastLoginAt: new Date() }
        ).exec().catch(console.error);

        return {
          id: user._id.toString(),
          email: String(user.email),
          name: String(user.name),
          avatar: user.avatar ? String(user.avatar) : undefined,
          role: String(user.role),
          additionalPermissions: Array.isArray(user.additionalPermissions)
            ? user.additionalPermissions.map(String)
            : [],
        } as any;
      },
    }),
  ],
});
