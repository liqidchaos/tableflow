import type { FloorTable } from '@tableflow/types';

const STAGE_CONFIG: Record<
  FloorTable['status'],
  { label: string; dot: string; pulse?: boolean }
> = {
  empty: { label: 'Open', dot: 'border border-luxury-on-surface-variant bg-transparent' },
  ordering: { label: 'Ordering', dot: 'bg-gold animate-pulse', pulse: true },
  eating: { label: 'Eating', dot: 'bg-luxury-on-surface-variant' },
  paying: { label: 'Paying', dot: 'bg-gold animate-pulse', pulse: true },
  needs_attention: { label: 'Attention', dot: 'bg-gold animate-pulse', pulse: true },
};

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

interface FloorTableCardProps {
  table: FloorTable;
  onClick?: () => void;
}

export function FloorTableCard({ table, onClick }: FloorTableCardProps) {
  const stage = STAGE_CONFIG[table.status];
  const isOpen = table.status === 'empty';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`carved-edge flex aspect-square flex-col items-center justify-center gap-4 p-6 transition-colors ${
        isOpen
          ? 'border-dashed border-luxury-outline-variant/50 bg-luxury-surface-lowest opacity-70 hover:bg-luxury-surface-low'
          : 'bg-luxury-surface-low hover:bg-luxury-surface-highest'
      }`}
    >
      <h3 className={`font-serif text-[clamp(1.75rem,4vw,2.5rem)] font-light ${isOpen ? 'text-luxury-on-surface-variant' : 'text-luxury-on-surface'}`}>
        {table.name}
      </h3>
      <div className="flex items-center gap-2 rounded-full border border-luxury-outline-variant/40 bg-luxury-surface-highest px-3 py-1">
        <span className={`h-2 w-2 rounded-full ${stage.dot}`} />
        <span className="label-caps text-[10px] text-luxury-on-surface-variant">{stage.label}</span>
      </div>
      <span className="text-sm text-luxury-on-surface-variant">
        {table.guest_count > 0 && `${table.guest_count} guest${table.guest_count > 1 ? 's' : ''}`}
        {table.guest_count > 0 && table.open_orders > 0 && ' · '}
        {table.open_orders > 0 && `${table.open_orders} order${table.open_orders > 1 ? 's' : ''}`}
        {table.pending_requests > 0 && ` · ${table.pending_requests} req`}
        {isOpen && table.guest_count === 0 && 'Ready'}
      </span>
      {table.assigned_staff_name && (
        <span className="label-caps text-[10px] text-luxury-on-surface-variant/80">
          {table.assigned_staff_name}
        </span>
      )}
    </button>
  );
}

export { formatDuration };
