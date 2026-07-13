'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutGrid,
  Grid2x2,
  ClipboardList,
  UtensilsCrossed,
  Package,
  BarChart2,
  Users,
  Settings,
  ChefHat,
  LogOut,
  HelpCircle,
  Bell,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useVenueContext } from '@/hooks/useVenueContext';
import { PaywallGate } from '@/components/PaywallGate';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const PRIMARY_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: LayoutGrid },
  { href: '/floor', label: 'Floor', icon: Grid2x2 },
  { href: '/analytics', label: 'Insights', icon: BarChart2 },
  { href: '/orders', label: 'Orders', icon: ClipboardList },
];

const SETUP_NAV: NavItem[] = [
  { href: '/menu', label: 'Menu', icon: UtensilsCrossed },
  { href: '/tables', label: 'Tables', icon: Grid2x2 },
  { href: '/staff', label: 'Staff', icon: Users },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/help', label: 'Help', icon: HelpCircle },
];

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = item.icon;
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-all duration-300 ${
        active
          ? 'border-r-2 border-gold bg-luxury-surface-high/80 font-medium text-gold'
          : 'text-luxury-on-surface-variant hover:bg-luxury-surface-highest/50 hover:text-luxury-on-surface'
      }`}
    >
      <Icon size={18} strokeWidth={active ? 2 : 1.5} />
      {item.label}
    </Link>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, venueName } = useVenueContext();

  function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('venue_id');
    localStorage.removeItem('venue_name');
    router.push('/login');
  }

  if (loading) {
    return (
      <div className="operator-dark flex min-h-screen items-center justify-center">
        <p className="font-serif text-xl font-light text-luxury-on-surface-variant">Loading…</p>
      </div>
    );
  }

  return (
    <div className="operator-dark flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-full w-72 flex-col border-r border-luxury-outline-variant/20 bg-luxury-surface-low/95 px-6 py-10 backdrop-blur-xl md:flex">
        <div className="mb-10">
          <Link href="/dashboard" className="font-serif text-2xl uppercase tracking-[0.2em] text-gold no-underline">
            TableFlow
          </Link>
          <p className="label-caps mt-3 truncate text-luxury-on-surface-variant">{venueName}</p>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          <p className="label-caps mb-2 px-4 text-luxury-on-surface-variant/60">Operations</p>
          {PRIMARY_NAV.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}

          <Link
            href="/kds"
            className="mt-2 flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-luxury-on-surface-variant transition-all hover:bg-luxury-surface-highest/50 hover:text-luxury-on-surface"
          >
            <ChefHat size={18} strokeWidth={1.5} />
            Kitchen Display
          </Link>

          <p className="label-caps mb-2 mt-8 px-4 text-luxury-on-surface-variant/60">Venue</p>
          {SETUP_NAV.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>

        <div className="mt-auto border-t border-luxury-outline-variant/20 pt-6">
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm text-luxury-on-surface-variant transition-colors hover:bg-luxury-surface-highest/50 hover:text-luxury-on-surface"
          >
            <LogOut size={18} strokeWidth={1.5} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b border-luxury-outline-variant/30 bg-luxury-bg/95 px-5 py-4 backdrop-blur-md md:hidden">
        <span className="font-serif text-lg uppercase tracking-[0.15em] text-gold">TableFlow</span>
        <div className="flex items-center gap-4">
          <Link href="/floor" className="text-luxury-on-surface-variant" aria-label="Floor">
            <Grid2x2 size={22} />
          </Link>
          <Link href="/orders" className="text-luxury-on-surface-variant" aria-label="Alerts">
            <Bell size={22} />
          </Link>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex justify-around border-t border-luxury-outline-variant/20 bg-luxury-surface-low/95 py-3 backdrop-blur-md md:hidden">
        {[
          { href: '/floor', label: 'Floor', icon: Grid2x2 },
          { href: '/analytics', label: 'Insights', icon: BarChart2 },
          { href: '/dashboard', label: 'Home', icon: LayoutGrid },
          { href: '/settings', label: 'Settings', icon: Settings },
        ].map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 text-[10px] uppercase tracking-widest no-underline ${
                active ? 'text-gold' : 'text-luxury-on-surface-variant'
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2 : 1.5} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <main className="min-h-screen flex-1 pb-24 pt-20 md:ml-72 md:pb-0 md:pt-0">
        <div className="mx-auto max-w-container px-gutter py-8 md:py-12">
          <PaywallGate>{children}</PaywallGate>
        </div>
      </main>
    </div>
  );
}
