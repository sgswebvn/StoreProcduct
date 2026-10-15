import { auth } from '@/core/auth/auth';
import { redirect } from 'next/navigation';
import AdminShell from '@/components/layout/AdminShell';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Dashboard', template: '%s | ProductHub' },
};

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/login');
  }

  return <AdminShell user={session.user}>{children}</AdminShell>;
}
