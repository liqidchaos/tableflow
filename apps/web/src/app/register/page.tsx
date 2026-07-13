'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@tableflow/ui';
import { AuthBrandPanel } from '@/components/marketing/AuthBrandPanel';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', full_name: '', venue_name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? 'Registration failed');
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('venue_id', data.venue_id);
      if (data.venue_name) localStorage.setItem('venue_name', data.venue_name);
      if (data.stripe_onboarding_url) {
        window.location.href = data.stripe_onboarding_url;
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <AuthBrandPanel />
      <main className="flex items-center justify-center bg-luxury-surface-lowest p-6 md:p-12">
        <div className="carved-edge w-full max-w-[420px] bg-luxury-surface-low p-8">
          <h1 className="mb-2 font-serif text-2xl font-light text-luxury-on-surface">Create account</h1>
          <p className="mb-6 text-luxury-on-surface-variant">30-day free trial · No credit card required</p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {(['full_name', 'venue_name', 'email', 'password'] as const).map((field) => (
              <input
                key={field}
                className="input border-luxury-outline-variant/40 bg-luxury-surface-high text-luxury-on-surface placeholder:text-luxury-on-surface-variant/60"
                type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                placeholder={field.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                required
              />
            ))}
            {error && <p className="text-sm text-error">{error}</p>}
            <p className="text-sm text-luxury-on-surface-variant">
              By creating an account you agree to our{' '}
              <Link href="/terms" className="text-gold no-underline hover:underline">Terms</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-gold no-underline hover:underline">Privacy Policy</Link>.
            </p>
            <Button type="submit" loading={loading}>Start free trial</Button>
          </form>
          <p className="mt-4 text-center text-luxury-on-surface-variant">
            Have an account?{' '}
            <Link href="/login" className="text-gold no-underline hover:underline">Sign in</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
