'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';

const FOOTER_LINKS = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/pricing', label: 'Pricing' },
];

const NAV_LINKS = [
  { href: '/#orchestration', label: 'Heritage' },
  { href: '/#kitchen', label: 'Precision' },
  { href: '/', label: 'The Experience', active: true },
];

export function MarketingChrome({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <div className="flex min-h-screen flex-col bg-flagship-background text-flagship-on-surface">
      <header
        className={`fixed inset-x-0 top-0 z-50 h-nav border-b border-flagship-outline-variant/30 transition-[background,backdrop-filter] duration-300 ${
          scrolled ? 'bg-flagship-background/90 backdrop-blur-md' : 'bg-flagship-background/80 backdrop-blur-sm'
        }`}
      >
        <div className="marketing-container flex h-full max-w-container items-center justify-between">
          <Link
            href="/"
            className="font-serif text-xl font-light uppercase tracking-[0.2em] text-gold no-underline md:text-2xl"
          >
            TableFlow
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => {
              const isActive = link.active && pathname === '/';
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-base no-underline transition-colors duration-300 ${
                    isActive
                      ? 'border-b border-gold pb-1 font-semibold text-gold opacity-80'
                      : 'text-flagship-on-surface-variant hover:text-gold'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link
              href="/register"
              className="label-caps btn-flagship-primary glowing-gold rounded-sm px-6 py-3 no-underline"
            >
              Reserve
            </Link>
          </nav>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-sm border border-flagship-outline-variant/40 text-flagship-on-surface md:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="border-t border-flagship-outline-variant/30 bg-flagship-background/95 backdrop-blur-xl md:hidden">
            <nav className="marketing-container flex flex-col gap-1 py-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-sm px-3 py-3 text-base font-medium text-flagship-on-surface no-underline hover:bg-flagship-surface-high"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/register"
                className="label-caps btn-flagship-primary glowing-gold mt-2 block rounded-sm px-6 py-3 text-center no-underline"
                onClick={() => setMobileOpen(false)}
              >
                Reserve
              </Link>
            </nav>
          </div>
        )}
      </header>

      <div className="flex-1">{children}</div>

      <footer className="mt-auto border-t border-flagship-outline-variant/20 bg-flagship-background py-section-gap">
        <div className="marketing-container flex max-w-container flex-col items-center gap-6 text-center">
          <Link
            href="/"
            className="font-serif text-xl font-light uppercase tracking-[0.25em] text-gold no-underline"
          >
            TableFlow
          </Link>
          <div className="flex flex-wrap justify-center gap-6">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="label-caps text-flagship-on-surface-variant no-underline transition-colors hover:text-flagship-on-surface"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <p className="label-caps m-0 text-flagship-on-surface-variant/50">
            © {new Date().getFullYear()} TableFlow Digital Flagship. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
