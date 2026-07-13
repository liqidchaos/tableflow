'use client';

import { useState } from 'react';
import { Bell, Sparkles, Menu, User, UtensilsCrossed, X } from 'lucide-react';
import type { ReactNode } from 'react';

interface GuestShellProps {
  venueName: string;
  tableName: string;
  activeTab?: 'concierge' | 'menu';
  onCallServer: () => void;
  onNavigate?: (tab: 'concierge' | 'menu') => void;
  children: ReactNode;
}

export function GuestShell({
  venueName,
  tableName,
  activeTab = 'concierge',
  onCallServer,
  onNavigate,
  children,
}: GuestShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  function navigate(tab: 'concierge' | 'menu') {
    onNavigate?.(tab);
    setMenuOpen(false);
  }

  function callServer() {
    setMenuOpen(false);
    onCallServer();
  }

  return (
    <div className="guest-dark min-h-screen">
      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-flagship-outline-variant/30 bg-flagship-background/80 px-gutter py-5 backdrop-blur-md md:hidden">
        <button
          type="button"
          className="-ml-2 p-2 text-flagship-on-surface-variant"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          aria-controls="guest-mobile-nav"
          onClick={() => setMenuOpen(true)}
        >
          <Menu size={24} />
        </button>
        <span className="bg-gradient-to-r from-gold to-gold-container bg-clip-text font-serif text-lg uppercase tracking-[0.2em] text-transparent">
          TableFlow
        </span>
        <button
          type="button"
          onClick={onCallServer}
          className="label-caps text-flagship-on-surface-variant transition-colors hover:text-gold"
        >
          Call server
        </button>
      </header>

      {menuOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal
          aria-label="Guest menu"
        >
          <button
            type="button"
            className="absolute inset-0 border-none bg-black/60"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <nav
            id="guest-mobile-nav"
            className="absolute inset-y-0 left-0 flex w-[min(100%,20rem)] flex-col border-r border-flagship-outline-variant/30 bg-flagship-surface-low px-6 py-8 shadow-[8px_0_32px_rgba(0,0,0,0.4)]"
          >
            <div className="mb-10 flex items-center justify-between">
              <span className="bg-gradient-to-r from-gold to-gold-container bg-clip-text font-serif text-base uppercase tracking-[0.2em] text-transparent">
                TableFlow
              </span>
              <button
                type="button"
                className="p-2 text-flagship-on-surface-variant"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              >
                <X size={22} />
              </button>
            </div>
            <p className="mb-6 text-sm text-flagship-on-surface-variant/70">
              {tableName} · {venueName}
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => navigate('concierge')}
                className={`flex items-center gap-4 rounded-lg px-4 py-3 text-left transition-colors ${
                  activeTab === 'concierge'
                    ? 'bg-flagship-surface-high/50 text-gold'
                    : 'text-flagship-on-surface-variant hover:bg-flagship-surface-highest/50 hover:text-flagship-on-surface'
                }`}
              >
                <Sparkles size={20} />
                <span>Concierge</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('menu')}
                className={`flex items-center gap-4 rounded-lg px-4 py-3 text-left transition-colors ${
                  activeTab === 'menu'
                    ? 'bg-flagship-surface-high/50 text-gold'
                    : 'text-flagship-on-surface-variant hover:bg-flagship-surface-highest/50 hover:text-flagship-on-surface'
                }`}
              >
                <UtensilsCrossed size={20} />
                <span>Menu</span>
              </button>
              <button
                type="button"
                onClick={callServer}
                className="flex items-center gap-4 rounded-lg px-4 py-3 text-left text-flagship-on-surface-variant transition-colors hover:bg-flagship-surface-highest/50 hover:text-flagship-on-surface"
              >
                <Bell size={20} />
                <span>Call server</span>
              </button>
            </div>
          </nav>
        </div>
      )}

      <aside className="fixed left-0 top-0 z-40 hidden h-full w-80 flex-col border-r border-flagship-outline-variant/20 bg-flagship-surface-low/50 px-8 py-12 backdrop-blur-xl md:flex">
        <div className="mb-16">
          <div className="mb-8 bg-gradient-to-r from-gold to-gold-container bg-clip-text font-serif text-[32px] font-light uppercase tracking-[0.2em] text-transparent">
            TableFlow
          </div>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-gold/30">
              <User size={20} className="text-gold/70" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-light text-flagship-on-surface">Concierge</h2>
              <p className="label-caps mt-1 text-flagship-on-surface-variant">At your service</p>
              <p className="text-sm text-flagship-on-surface-variant/70">
                {tableName} · {venueName}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-2">
          <button
            type="button"
            onClick={() => onNavigate?.('concierge')}
            className={`flex items-center gap-4 rounded-lg px-4 py-3 text-left transition-all ${
              activeTab === 'concierge'
                ? 'scale-[0.99] border-r-2 border-gold/70 bg-flagship-surface-high/50 text-gold'
                : 'text-flagship-on-surface-variant hover:bg-flagship-surface-highest/50 hover:text-flagship-on-surface'
            }`}
          >
            <Sparkles size={20} />
            <span>Concierge</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.('menu')}
            className={`flex items-center gap-4 rounded-lg px-4 py-3 text-left transition-all ${
              activeTab === 'menu'
                ? 'scale-[0.99] border-r-2 border-gold/70 bg-flagship-surface-high/50 text-gold'
                : 'text-flagship-on-surface-variant hover:bg-flagship-surface-highest/50 hover:text-flagship-on-surface'
            }`}
          >
            <UtensilsCrossed size={20} />
            <span>Menu</span>
          </button>
          <button
            type="button"
            onClick={onCallServer}
            className="flex items-center gap-4 rounded-lg px-4 py-3 text-left text-flagship-on-surface-variant transition-all hover:bg-flagship-surface-highest/50 hover:text-flagship-on-surface"
          >
            <Bell size={20} />
            <span>Table Service</span>
          </button>
        </nav>

        <div className="mt-auto border-t border-flagship-outline-variant/20 pt-8">
          <button
            type="button"
            onClick={onCallServer}
            className="label-caps flex w-full items-center justify-center gap-2 border border-gold/50 px-6 py-4 text-gold shadow-[0_0_15px_rgba(212,175,55,0.05)] transition-colors hover:bg-gold/10"
          >
            <Bell size={16} />
            Call server
          </button>
        </div>
      </aside>

      <main className="min-h-screen pb-40 pt-28 md:ml-80 md:pt-0">{children}</main>
    </div>
  );
}
