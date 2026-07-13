'use client';

import { useEffect, useState } from 'react';
import { Button } from '@tableflow/ui';
import { OperatorPageHeader } from '@/components/dashboard/OperatorPageHeader';
import { useVenueContext } from '@/hooks/useVenueContext';
import type { Staff } from '@tableflow/types';

const ROLES = ['server', 'kitchen', 'manager'] as const;

export default function StaffPage() {
  const { venueId, authFetch, loading } = useVenueContext();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', display_name: '', role: 'server' as typeof ROLES[number] });

  async function loadStaff() {
    if (!venueId) return;
    const res = await authFetch(`/api/venues/${venueId}/staff`);
    if (res.ok) {
      const data = await res.json();
      setStaff(data.staff ?? []);
    }
  }

  useEffect(() => {
    if (!loading && venueId) loadStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, venueId]);

  async function addStaff(e: React.FormEvent) {
    e.preventDefault();
    const res = await authFetch(`/api/venues/${venueId}/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ email: '', display_name: '', role: 'server' });
      loadStaff();
    } else {
      const data = await res.json();
      alert(data.error?.message ?? 'Failed to add staff');
    }
  }

  async function toggleActive(staffId: string, isActive: boolean) {
    await authFetch(`/api/venues/${venueId}/staff/${staffId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !isActive }),
    });
    loadStaff();
  }

  return (
    <div>
      <OperatorPageHeader title="Staff" description="Servers, kitchen, and managers with venue access." />
      <div className="mb-6 flex justify-end">
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add Staff'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={addStaff} className="card mb-6">
          <div className="grid gap-3">
            <input className="input" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <input className="input" placeholder="Display name" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} required />
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as typeof ROLES[number] })}>
              {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
            <Button type="submit">Add Staff Member</Button>
          </div>
        </form>
      )}

      <div className="grid gap-3">
        {staff.map((member) => (
          <div
            key={member.id}
            className={`card flex flex-wrap items-center justify-between gap-4 ${member.is_active ? '' : 'opacity-50'}`}
          >
            <div>
              <h3 className="font-serif text-lg font-light">{member.display_name ?? 'Unnamed'}</h3>
              <p className="text-sm text-luxury-on-surface-variant">
                {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                {!member.is_active && ' · Inactive'}
              </p>
            </div>
            <Button variant="secondary" onClick={() => toggleActive(member.id, member.is_active)}>
              {member.is_active ? 'Deactivate' : 'Reactivate'}
            </Button>
          </div>
        ))}
        {staff.length === 0 && !loading && (
          <p className="text-luxury-on-surface-variant">No staff members yet. Add servers, kitchen staff, or managers.</p>
        )}
      </div>
    </div>
  );
}
