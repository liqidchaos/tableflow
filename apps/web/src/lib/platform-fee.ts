const PLATFORM_FEE_CAP_CENTS = 200; // $2.00 cap

export function getPlatformFeePct(venueFeePct?: number): number {
  if (venueFeePct != null && venueFeePct > 0) return venueFeePct;
  const envPct = parseFloat(process.env.STRIPE_PLATFORM_FEE_PCT ?? '0.004');
  return Number.isFinite(envPct) ? envPct : 0.004;
}

/** Platform fee in cents: min(amount * pct, $2.00) */
export function calcPlatformFeeCents(amountCents: number, venueFeePct?: number): number {
  if (amountCents <= 0) return 0;
  const pct = getPlatformFeePct(venueFeePct);
  return Math.min(Math.round(amountCents * pct), PLATFORM_FEE_CAP_CENTS);
}

export function platformFeeDollars(amountCents: number, venueFeePct?: number): number {
  return calcPlatformFeeCents(amountCents, venueFeePct) / 100;
}

export { PLATFORM_FEE_CAP_CENTS };
