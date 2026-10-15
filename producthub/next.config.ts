import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/admin',
        destination: '/dashboard',
      },
      {
        source: '/admin/users',
        destination: '/users',
      },
      {
        source: '/admin/roles',
        destination: '/users',
      },
      {
        source: '/admin/settings',
        destination: '/settings',
      },
      {
        source: '/admin/settings/scripts',
        destination: '/settings/scripts',
      },
      {
        source: '/admin/audit-logs',
        destination: '/audit-logs',
      },
      {
        source: '/admin/system/errors',
        destination: '/system/errors',
      },
    ];
  },
};

export default nextConfig;
