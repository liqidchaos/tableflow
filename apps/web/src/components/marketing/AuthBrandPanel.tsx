import Link from 'next/link';

export function AuthBrandPanel() {
  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-hidden bg-luxury-bg text-luxury-on-surface">
      <div className="absolute inset-0" aria-hidden>
        <div
          className="h-full w-full bg-cover bg-center"
          style={{ backgroundImage: "url('/marketing/guest-phone-table.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-luxury-bg via-luxury-bg/85 to-luxury-bg/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-luxury-bg/90 via-luxury-bg/50 to-transparent" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col justify-between p-8 md:p-12 lg:p-16">
        <div>
          <Link
            href="/"
            className="font-serif text-xl font-light uppercase tracking-[0.2em] text-gold no-underline md:text-2xl"
          >
            TableFlow
          </Link>
        </div>

        <div className="my-10 md:my-0">
          <p className="label-caps mb-4 text-gold/80">From scan to paid</p>
          <h1 className="mb-4 max-w-md font-serif text-3xl font-light leading-tight text-balance md:text-4xl">
            Run the floor without the Friday night backlog
          </h1>
          <p className="max-w-sm text-sm leading-relaxed text-luxury-on-surface-variant">
            Guest ordering, kitchen display, and payments. No POS integration, no app downloads.
          </p>
        </div>

        <p className="label-caps text-luxury-on-surface-variant/50">
          © {new Date().getFullYear()} TableFlow
        </p>
      </div>
    </div>
  );
}
