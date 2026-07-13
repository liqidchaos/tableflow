'use client';

import { useEffect, useState } from 'react';
import { Button } from '@tableflow/ui';
import { OperatorPageHeader } from '@/components/dashboard/OperatorPageHeader';
import { useVenueContext } from '@/hooks/useVenueContext';
import type { Staff, VenueTable } from '@tableflow/types';

interface TableWithSession extends VenueTable {
  active_session_id: string | null;
}

interface DynamicQrState {
  qr_code: string;
  expires_at: string;
}

export default function TablesPage() {
  const { venueId, authFetch, loading } = useVenueContext();
  const [tables, setTables] = useState<TableWithSession[]>([]);
  const [servers, setServers] = useState<Staff[]>([]);
  const [newTableName, setNewTableName] = useState('');
  const [qrMode, setQrMode] = useState<'static' | 'dynamic'>('static');
  const [dynamicQr, setDynamicQr] = useState<Record<string, DynamicQrState>>({});
  const [generatingQr, setGeneratingQr] = useState<string | null>(null);

  async function loadTables() {
    if (!venueId) return;
    const [tablesRes, staffRes] = await Promise.all([
      authFetch(`/api/venues/${venueId}/tables`),
      authFetch(`/api/venues/${venueId}/staff`),
    ]);
    if (tablesRes.ok) {
      const data = await tablesRes.json();
      setTables(data.tables);
    }
    if (staffRes.ok) {
      const data = await staffRes.json();
      setServers(
        (data.staff ?? []).filter(
          (s: Staff) => s.is_active && (s.role === 'server' || s.role === 'manager')
        )
      );
    }
  }

  useEffect(() => {
    if (!loading && venueId) loadTables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, venueId]);

  async function assignServer(tableId: string, staffId: string | null) {
    if (!venueId) return;
    await authFetch(`/api/venues/${venueId}/tables/${tableId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_staff_id: staffId }),
    });
    loadTables();
  }

  useEffect(() => {
    if (!loading && venueId) {
      authFetch(`/api/venues/${venueId}`)
        .then((r) => r.json())
        .then((v) => setQrMode(v.qr_mode ?? 'static'))
        .catch(() => {});
    }
  }, [loading, venueId, authFetch]);

  async function addTable(e: React.FormEvent) {
    e.preventDefault();
    await authFetch(`/api/venues/${venueId}/tables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTableName, capacity: 4 }),
    });
    setNewTableName('');
    loadTables();
  }

  function printQr(table: TableWithSession, qrCode?: string) {
    const code = qrCode ?? table.qr_code;
    if (!code) return;
    printQrSheets([{ table, code }]);
  }

  function printAllStaticQrs() {
    const sheets = tables
      .filter((t) => Boolean(t.qr_code))
      .map((table) => ({ table, code: table.qr_code as string }));
    if (sheets.length === 0) return;
    printQrSheets(sheets);
  }

  function printQrSheets(sheets: { table: TableWithSession; code: string }[]) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const pages = sheets
      .map(({ table, code }) => {
        const qrUrl = `/api/qr/${encodeURIComponent(code)}.png`;
        const guestUrl = `${window.location.origin}/g/${encodeURIComponent(code)}`;
        const expiry = dynamicQr[table.id]?.expires_at;
        return `
          <section class="sheet">
            <h1>${table.name}</h1>
            <p>Scan to order</p>
            ${expiry ? `<p class="meta">Expires ${new Date(expiry).toLocaleString()}</p>` : ''}
            <img src="${qrUrl}" alt="QR code for ${table.name}" />
            <p class="url">${guestUrl}</p>
          </section>
        `;
      })
      .join('');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head><title>TableFlow QR codes</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: Georgia, serif; margin: 0; background: #131313; color: #e5e2e1; }
          .sheet { text-align: center; padding: 48px; page-break-after: always; min-height: 100vh; }
          .sheet:last-child { page-break-after: auto; }
          h1 { font-size: 28px; margin-bottom: 8px; font-weight: 300; }
          img { width: 200px; height: 200px; margin: 24px 0; }
          p { color: #d0c5af; font-size: 14px; }
          .meta { font-size: 12px; }
          .url { font-size: 11px; word-break: break-all; }
          @media print {
            body { background: #fff; color: #111; }
            p, .meta, .url { color: #333; }
          }
        </style></head>
        <body>${pages}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  async function generateDynamicQr(tableId: string) {
    if (!venueId) return;
    setGeneratingQr(tableId);
    try {
      const res = await authFetch(`/api/venues/${venueId}/tables/${tableId}/dynamic-qr`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setDynamicQr((prev) => ({
          ...prev,
          [tableId]: { qr_code: data.qr_code, expires_at: data.expires_at },
        }));
      }
    } finally {
      setGeneratingQr(null);
    }
  }

  return (
    <div>
      <OperatorPageHeader title="Tables" description="Manage seating, QR codes, and guest entry points." />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <form onSubmit={addTable} className="card flex flex-1 flex-wrap gap-3">
          <input className="input min-w-[200px] flex-1" placeholder="Table name" value={newTableName} onChange={(e) => setNewTableName(e.target.value)} required />
          <Button type="submit">Add Table</Button>
        </form>
        {qrMode === 'static' && tables.some((t) => t.qr_code) && (
          <Button variant="secondary" onClick={printAllStaticQrs}>
            Print all QRs
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tables.map((table) => (
          <div key={table.id} className="card">
            <h3 className="font-serif text-lg font-light">{table.name}</h3>
            <p className="text-sm text-luxury-on-surface-variant">
              Capacity: {table.capacity} · {table.active_session_id ? 'Active session' : 'Empty'}
            </p>
            <label className="mt-3 block text-xs text-luxury-on-surface-variant">
              Assigned server
              <select
                className="input mt-1 w-full"
                value={table.assigned_staff_id ?? ''}
                onChange={(e) =>
                  assignServer(table.id, e.target.value ? e.target.value : null)
                }
              >
                <option value="">Unassigned (broadcast)</option>
                {servers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.display_name ?? 'Server'} ({s.role})
                  </option>
                ))}
              </select>
            </label>
            {table.qr_code && (
              <div className="mt-4">
                {qrMode === 'dynamic' ? (
                  <>
                    <p className="mb-2 text-sm text-luxury-on-surface-variant">
                      Dynamic QR — generate a fresh code for each seating
                    </p>
                    {dynamicQr[table.id] ? (
                      <>
                        <p className="break-all font-mono text-xs text-luxury-on-surface-variant">
                          {dynamicQr[table.id].qr_code}
                        </p>
                        <p className="text-xs text-luxury-outline">
                          Expires {new Date(dynamicQr[table.id].expires_at).toLocaleString()}
                        </p>
                        <img
                          src={`/api/qr/${encodeURIComponent(dynamicQr[table.id].qr_code)}.png`}
                          alt={`QR for ${table.name}`}
                          className="mt-2 h-[150px] w-[150px]"
                        />
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button variant="secondary" onClick={() => printQr(table, dynamicQr[table.id].qr_code)}>
                            Print QR
                          </Button>
                          <a
                            href={`/g/${encodeURIComponent(dynamicQr[table.id].qr_code)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="label-caps inline-flex items-center text-sm text-gold no-underline hover:underline"
                          >
                            Open guest menu
                          </a>
                        </div>
                      </>
                    ) : (
                      <Button onClick={() => generateDynamicQr(table.id)} disabled={generatingQr === table.id}>
                        {generatingQr === table.id ? 'Generating…' : 'Generate QR'}
                      </Button>
                    )}
                    <div className="mt-2">
                      <Button variant="secondary" onClick={() => generateDynamicQr(table.id)} disabled={generatingQr === table.id}>
                        Regenerate
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="break-all font-mono text-xs text-luxury-on-surface-variant">{table.qr_code}</p>
                    <img
                      src={`/api/qr/${encodeURIComponent(table.qr_code)}.png`}
                      alt={`QR for ${table.name}`}
                      className="mt-2 h-[150px] w-[150px]"
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => printQr(table)}>Print QR</Button>
                      <a
                        href={`/g/${encodeURIComponent(table.qr_code)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="label-caps inline-flex items-center text-sm text-gold no-underline hover:underline"
                      >
                        Open guest menu
                      </a>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
