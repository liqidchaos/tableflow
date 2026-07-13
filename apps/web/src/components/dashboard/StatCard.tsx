interface StatCardProps {
  label: string;
  value: string | number;
  highlight?: boolean;
}

export function StatCard({ label, value, highlight }: StatCardProps) {
  return (
    <div className="carved-edge relative overflow-hidden bg-luxury-surface-low p-6 md:p-8">
      {highlight && (
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-gold/10 to-transparent"
          aria-hidden
        />
      )}
      <span className="label-caps text-luxury-on-surface-variant">{label}</span>
      <p
        className={`mt-2 font-serif text-[clamp(2rem,4vw,2.5rem)] font-light leading-none ${
          highlight ? 'text-gold' : 'text-luxury-on-surface'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
