import { redirect } from 'next/navigation';
import { auth } from '@/core/auth/auth';
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await auth();
  if (session) {
    redirect('/dashboard');
  } else {
    redirect('/auth/login');
  }
}
