'use client';

import { useState } from 'react';
import { Button } from '@tableflow/ui';

interface GuestErrorStateProps {
  message: string;
  onAskServer?: () => void;
  onRetry: () => void;
}

export function GuestErrorState({ message, onAskServer, onRetry }: GuestErrorStateProps) {
  const [serverTipVisible, setServerTipVisible] = useState(false);

  function handleAskServer() {
    if (onAskServer) {
      onAskServer();
      return;
    }
    setServerTipVisible(true);
  }

  return (
    <div className="guest-dark flex min-h-screen items-center justify-center px-6 py-16">
      <div
        role="alert"
        className="w-full max-w-md border border-luxury-outline-variant/40 bg-luxury-surface-low p-8 text-center shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
      >
        <p className="mb-6 bg-gradient-to-r from-gold to-gold-container bg-clip-text font-serif text-lg uppercase tracking-[0.2em] text-transparent">
          TableFlow
        </p>
        <h1 className="mb-3 font-serif text-2xl font-light text-luxury-on-surface">
          We couldn&apos;t open this table
        </h1>
        <p className="mb-8 text-luxury-on-surface-variant">{message}</p>
        {serverTipVisible && (
          <p className="mb-6 rounded-sm border border-gold/30 bg-gold/10 p-3 text-sm text-gold" role="status">
            Please find a staff member. They can reseat you or print a new QR for this table.
          </p>
        )}
        <div className="flex flex-col gap-3">
          <Button onClick={handleAskServer} style={{ width: '100%' }}>
            Ask a server
          </Button>
          <Button variant="secondary" onClick={onRetry} style={{ width: '100%' }}>
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
