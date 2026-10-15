import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';
import { APP_CONFIG } from '@/core/config/app.config';

import { ScriptInjector } from '@/components/layout/ScriptInjector';

export const metadata: Metadata = {
  title: {
    default: APP_CONFIG.name,
    template: `%s | ${APP_CONFIG.name}`,
  },
  description: `${APP_CONFIG.name} — ${APP_CONFIG.description}`,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <head>
        <ScriptInjector location="head" />
      </head>
      <body>
        <ScriptInjector location="body_start" />
        <ToastProvider>{children}</ToastProvider>
        <ScriptInjector location="footer" />
      </body>
    </html>
  );
}
