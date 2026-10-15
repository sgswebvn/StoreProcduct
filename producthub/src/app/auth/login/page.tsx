'use client';

import { Suspense, useState, useTransition } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './login.module.css';
import { StoreProductLogo } from '@/components/ui/StoreProductLogo';
import { APP_CONFIG } from '@/core/config/app.config';

function LoginForm() {
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get('callbackUrl');
  const callbackUrl = (!rawCallback || rawCallback === '/') ? '/dashboard' : rawCallback;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    startTransition(async () => {
      const result = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Email hoặc mật khẩu không chính xác. Vui lòng thử lại.');
      } else {
        // Chuyển hướng đầy đủ để cookie phiên được nạp hoàn toàn
        window.location.href = callbackUrl;
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      {error && (
        <div className={`alert alert-error ${styles.errorAlert}`} role="alert">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          {error}
        </div>
      )}

      <div className="form-group">
        <label className="form-label" htmlFor="email">
          Địa chỉ email
        </label>
        <input
          id="email"
          type="email"
          className="form-input"
          placeholder="admin@producthub.local"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          autoFocus
          disabled={isPending}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="password">
          Mật khẩu
        </label>
        <input
          id="password"
          type="password"
          className="form-input"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          disabled={isPending}
          required
        />
      </div>

      <button
        type="submit"
        className={`btn btn-primary btn-full btn-lg ${isPending ? 'btn-loading' : ''}`}
        disabled={isPending}
        id="btn-signin"
      >
        {!isPending && 'Đăng nhập'}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className={styles.container}>
      <div className={styles.bgDecor} aria-hidden="true">
        <div className={styles.bgCircle1} />
        <div className={styles.bgCircle2} />
      </div>

      <div className={styles.card}>
        <div className={styles.brand}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
            <StoreProductLogo size="lg" showText={true} />
          </div>
          <p className={styles.appTagline}>{APP_CONFIG.tagline}</p>
        </div>

        <h2 className={styles.heading}>Đăng nhập hệ thống</h2>
        <p className={styles.subheading}>Nhập thông tin xác thực để truy cập bảng điều khiển</p>

        <Suspense fallback={<div className="skeleton" style={{ height: '220px', borderRadius: '8px' }} />}>
          <LoginForm />
        </Suspense>

        <p className={styles.footer}>
          Cổng quản trị nội bộ bảo mật — Không hỗ trợ đăng ký công khai.
        </p>
      </div>
    </div>
  );
}

