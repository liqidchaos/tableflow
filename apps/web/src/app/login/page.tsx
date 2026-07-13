'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@tableflow/ui';
import { AuthBrandPanel } from '@/components/marketing/AuthBrandPanel';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? 'Login failed');
      localStorage.setItem('access_token', data.access_token);
      if (data.venue_id) {
        localStorage.setItem('venue_id', data.venue_id);
        localStorage.setItem('venue_name', data.venue_name ?? '');
      }
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <AuthBrandPanel />
      <main className="flex items-center justify-center bg-luxury-surface-lowest p-6 md:p-12">
        <div className="carved-edge w-full max-w-[420px] bg-luxury-surface-low p-8">
          <h1 className="mb-2 font-serif text-2xl font-light text-luxury-on-surface">Sign in</h1>
          <p className="mb-6 text-luxury-on-surface-variant">Access your operator dashboard</p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              className="input border-luxury-outline-variant/40 bg-luxury-surface-high text-luxury-on-surface placeholder:text-luxury-on-surface-variant/60"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              className="input border-luxury-outline-variant/40 bg-luxury-surface-high text-luxury-on-surface placeholder:text-luxury-on-surface-variant/60"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <p className="text-sm text-error">{error}</p>}
            <Button type="submit" loading={loading}>Sign in</Button>
          </form>
          <p className="mt-4 text-center text-luxury-on-surface-variant">
            No account?{' '}
            <Link href="/register" className="text-gold no-underline hover:underline">
              Start free trial
            </Link>
          </p>
          <p className="mt-3 text-center text-sm text-luxury-on-surface-variant/70">
            <Link href="/terms" className="no-underline hover:text-luxury-on-surface">Terms</Link>
            {' · '}
            <Link href="/privacy" className="no-underline hover:text-luxury-on-surface">Privacy</Link>
            {' · '}
            <Link href="/pricing" className="no-underline hover:text-luxury-on-surface">Pricing</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
