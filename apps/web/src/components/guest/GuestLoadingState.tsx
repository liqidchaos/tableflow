'use client';

export function GuestLoadingState() {
  return (
    <div className="guest-dark flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <p className="mb-3 bg-gradient-to-r from-gold to-gold-container bg-clip-text font-serif text-lg uppercase tracking-[0.2em] text-transparent">
        TableFlow
      </p>
      <p className="mb-8 font-serif text-xl font-light text-luxury-on-surface">Getting your menu…</p>

      <div
        className="mb-10 h-1 w-48 overflow-hidden rounded-full bg-luxury-surface-high"
        role="progressbar"
        aria-label="Loading menu"
        aria-busy="true"
      >
        <div className="guest-load-bar h-full w-1/3 rounded-full bg-gold" />
      </div>

      <div className="grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-3" aria-hidden>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="guest-load-skeleton h-28 rounded-lg bg-luxury-surface-high"
            style={{ animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
