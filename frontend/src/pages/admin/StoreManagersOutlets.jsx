import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users2, Store, MapPin, Building2, Search, X, CheckCircle2,
  AlertTriangle, ChevronDown, ChevronLeft, ChevronRight,
  UserCheck, UserX, RefreshCw, Loader2, Check, AlertCircle,
  Briefcase, ArrowRightLeft
} from 'lucide-react';
import { adminApi } from '../../api/admin.api';

// ─── Constants ───────────────────────────────────────────────────────────────
const PAGE_SIZE = 25;
const DEPOTS = ['Peliyagoda', 'Kandy'];
const BRANDS = ['Fresh', 'Style', 'Tech'];

const BRAND_COLORS = {
  Fresh: { color: '#15803D', bg: '#DCFCE7', border: '#86EFAC' },
  Style: { color: '#B45309', bg: '#FEF3C7', border: '#FCD34D' },
  Tech:  { color: '#3730A3', bg: '#E0E7FF', border: '#A5B4FC' },
};

const EMPTY_FILTERS = { search: '', status: 'ALL', brand: 'ALL', depot: 'ALL', district: 'ALL' };

// ─── Helpers ─────────────────────────────────────────────────────────────────
const Toast = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  const isError = toast.type === 'error';
  const isWarning = toast.type === 'warning';

  return (
    <div style={{
      position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999,
      background: isError ? '#FEE2E2' : isWarning ? '#FEF3C7' : '#E8F5EE',
      border: `1px solid ${isError ? '#FCA5A5' : isWarning ? '#FCD34D' : '#B9E1C9'}`,
      borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem',
      display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
      maxWidth: '400px', boxShadow: 'var(--shadow-lg)',
      animation: 'modalEnter 0.2s ease-out'
    }}>
      {isError
        ? <AlertCircle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: '1px' }} />
        : isWarning
        ? <AlertTriangle size={18} color="#92400E" style={{ flexShrink: 0, marginTop: '1px' }} />
        : <CheckCircle2 size={18} color="#025E4C" style={{ flexShrink: 0, marginTop: '1px' }} />}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: isError ? '#991B1B' : isWarning ? '#92400E' : '#025E4C' }}>
          {toast.title}
        </div>
        {toast.message && (
          <div style={{ fontSize: '0.8rem', color: isError ? '#B91C1C' : isWarning ? '#78350F' : '#047857', marginTop: '2px' }}>
            {toast.message}
          </div>
        )}
      </div>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94A3B8' }}>
        <X size={15} />
      </button>
    </div>
  );
};

const BrandBadge = ({ brand }) => {
  const cfg = BRAND_COLORS[brand] || { color: '#475569', bg: '#F1F5F9', border: '#CBD5E1' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)',
      fontSize: '0.72rem', fontWeight: 700,
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
    }}>
      {brand}
    </span>
  );
};

const StatusBadge = ({ assigned }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
    padding: '0.2rem 0.65rem', borderRadius: 'var(--radius-full)',
    fontSize: '0.72rem', fontWeight: 700,
    color: assigned ? '#025E4C' : '#64748B',
    background: assigned ? '#E8F5EE' : '#F1F5F9',
    border: `1px solid ${assigned ? '#B9E1C9' : '#CBD5E1'}`,
  }}>
    {assigned ? <Check size={11} /> : <X size={11} />}
    {assigned ? 'Assigned' : 'Unassigned'}
  </span>
);

// ─── Summary Cards ────────────────────────────────────────────────────────────
const SummaryCards = ({ outlets, managers }) => {
  const total = outlets.length;
  const assigned = outlets.filter(o => o.assignedManager).length;
  const unassigned = total - assigned;

  const cards = [
    { label: 'Total Outlets', value: total, icon: Store, color: '#3730A3', bg: '#E0E7FF' },
    { label: 'Assigned', value: assigned, icon: UserCheck, color: '#025E4C', bg: '#E8F5EE' },
    { label: 'Unassigned', value: unassigned, icon: UserX, color: '#DC2626', bg: '#FEE2E2' },
    { label: 'Store Managers', value: managers.length, icon: Users2, color: '#D97706', bg: '#FEF3C7' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
      {cards.map(({ label, value, icon: Icon, color, bg }) => (
        <div key={label} className="wf-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={22} color={color} />
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '3px', fontWeight: 500 }}>{label}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Filter Bar ───────────────────────────────────────────────────────────────
const FilterBar = ({ filters, setFilters, districts, onClear }) => {
  const hasActiveFilters = filters.search || filters.status !== 'ALL' || filters.brand !== 'ALL' || filters.depot !== 'ALL' || filters.district !== 'ALL';

  const selStyle = {
    padding: '0.55rem 0.85rem', border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-md)', background: '#fff',
    fontSize: '0.85rem', color: 'var(--text-primary)', outline: 'none',
    cursor: 'pointer', minWidth: '130px'
  };

  return (
    <div className="wf-card" style={{ padding: '1rem 1.25rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.65rem' }}>
      {/* Search */}
      <div style={{ position: 'relative', flex: '1 1 260px', minWidth: '220px' }}>
        <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
        <input
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          placeholder="Search outlet ID, name, district, manager…"
          style={{ width: '100%', padding: '0.55rem 0.85rem 0.55rem 2.25rem', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', background: '#fff', fontSize: '0.85rem', outline: 'none', color: 'var(--text-primary)' }}
        />
      </div>

      {/* Status */}
      <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} style={selStyle}>
        <option value="ALL">All Status</option>
        <option value="assigned">Assigned</option>
        <option value="unassigned">Unassigned</option>
      </select>

      {/* Brand */}
      <select value={filters.brand} onChange={e => setFilters(f => ({ ...f, brand: e.target.value }))} style={selStyle}>
        <option value="ALL">All Brands</option>
        {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
      </select>

      {/* Depot */}
      <select value={filters.depot} onChange={e => setFilters(f => ({ ...f, depot: e.target.value }))} style={selStyle}>
        <option value="ALL">All Depots</option>
        {DEPOTS.map(d => <option key={d} value={d}>{d}</option>)}
      </select>

      {/* District */}
      <select value={filters.district} onChange={e => setFilters(f => ({ ...f, district: e.target.value }))} style={selStyle}>
        <option value="ALL">All Districts</option>
        {districts.map(d => <option key={d} value={d}>{d}</option>)}
      </select>

      {/* Clear */}
      {hasActiveFilters && (
        <button onClick={onClear} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 0.85rem', border: '1.5px solid #FCA5A5', borderRadius: 'var(--radius-md)', background: '#FEE2E2', color: '#DC2626', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
          <X size={13} /> Clear Filters
        </button>
      )}
    </div>
  );
};

// ─── Bulk Action Bar ──────────────────────────────────────────────────────────
const BulkActionBar = ({ selectedIds, total, onAssign, onClear, onSelectAll }) => {
  if (selectedIds.size === 0) return null;
  return (
    <div style={{
      background: 'linear-gradient(135deg, #022F26 0%, #025E4C 100%)',
      borderRadius: 'var(--radius-md)', padding: '0.85rem 1.25rem',
      display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
      boxShadow: '0 4px 12px rgba(2,47,38,0.2)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>
        <Check size={16} style={{ background: '#B9E1C9', borderRadius: '50%', padding: '2px', color: '#022F26' }} />
        {selectedIds.size} outlet{selectedIds.size > 1 ? 's' : ''} selected
      </div>
      <div style={{ flex: 1 }} />
      {selectedIds.size < total && (
        <button onClick={onSelectAll} style={{ padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
          Select all {total} filtered
        </button>
      )}
      <button onClick={onAssign} className="btn-primary" style={{ background: '#B9E1C9', color: '#022F26', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
        <UserCheck size={15} /> Assign Manager
      </button>
      <button onClick={onClear} style={{ padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#CBD5E1', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
        <X size={13} /> Clear
      </button>
    </div>
  );
};

// ─── Assign Modal ─────────────────────────────────────────────────────────────
const AssignModal = ({ selectedIds, outlets, managers, onClose, onSuccess, showToast }) => {
  const [managerSearch, setManagerSearch] = useState('');
  const [chosenManager, setChosenManager] = useState(null);
  const [overwrite, setOverwrite] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectedOutlets = outlets.filter(o => selectedIds.has(o._id));
  const alreadyAssigned = selectedOutlets.filter(o => o.assignedManager);

  const filteredManagers = managers.filter(m =>
    m.name.toLowerCase().includes(managerSearch.toLowerCase()) ||
    m.email.toLowerCase().includes(managerSearch.toLowerCase())
  );

  const willAssign = overwrite
    ? selectedOutlets.length
    : selectedOutlets.filter(o => !o.assignedManager).length;

  const willSkip = overwrite ? 0 : alreadyAssigned.length;

  const handleAssign = async () => {
    if (!chosenManager) return;
    setLoading(true);
    try {
      const outletIds = selectedOutlets.map(o => o._id);
      const res = await adminApi.bulkAssignManager({ managerId: chosenManager._id, outletIds, overwrite });
      const { assigned, skipped } = res.data;
      onSuccess();
      onClose();
      if (skipped > 0) {
        showToast({ type: 'warning', title: `${assigned} assigned, ${skipped} skipped`, message: `${skipped} outlet(s) already had managers and were skipped.` });
      } else {
        showToast({ type: 'success', title: `${assigned} outlet(s) assigned to ${chosenManager.name}`, message: 'Workload counts have been updated.' });
      }
    } catch (err) {
      showToast({ type: 'error', title: 'Assignment failed', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const previewOutlets = selectedOutlets.slice(0, 3);
  const remaining = selectedOutlets.length - previewOutlets.length;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: '520px' }}>
        {/* Header */}
        <div style={{ padding: '1.5rem 1.5rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#E8F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserCheck size={20} color="#025E4C" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Assign Store Manager</h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                {selectedOutlets.length} outlet{selectedOutlets.length > 1 ? 's' : ''} selected
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: '0.25rem' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Manager Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Select Store Manager
            </label>
            <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
              <input value={managerSearch} onChange={e => setManagerSearch(e.target.value)} placeholder="Search managers…" style={{ width: '100%', padding: '0.6rem 0.85rem 0.6rem 2.1rem', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', maxHeight: '200px', overflowY: 'auto' }}>
              {filteredManagers.length === 0 ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No managers found</div>
              ) : filteredManagers.map(m => (
                <button key={m._id} onClick={() => setChosenManager(m)} style={{
                  width: '100%', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
                  background: chosenManager?._id === m._id ? '#E8F5EE' : 'transparent',
                  border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left',
                  transition: 'background var(--transition-fast)'
                }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#E8F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800, fontSize: '0.85rem', color: '#025E4C' }}>
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Currently managing <strong style={{ color: m.outletCount > 0 ? '#025E4C' : '#94A3B8' }}>{m.outletCount}</strong> outlet{m.outletCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                  {chosenManager?._id === m._id && <Check size={16} color="#025E4C" />}
                </button>
              ))}
            </div>
          </div>

          {/* Impact Preview (shown after manager is chosen) */}
          {chosenManager && (
            <div style={{ background: '#F8FAFC', borderRadius: 'var(--radius-md)', padding: '1rem', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
                Assignment Impact
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Current outlets: </span><strong>{chosenManager.outletCount}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Adding: </span><strong style={{ color: '#025E4C' }}>+{willAssign}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>After: </span><strong>{chosenManager.outletCount + willAssign}</strong></div>
              </div>
              {/* Outlet preview */}
              <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {previewOutlets.map(o => (
                  <div key={o._id} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Store size={12} color="#94A3B8" />
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{o.outletId}</span>
                    {o.name && <span>— {o.name}</span>}
                    {o.assignedManager && <span style={{ color: '#D97706', fontSize: '0.72rem' }}>(currently: {o.assignedManager.name})</span>}
                  </div>
                ))}
                {remaining > 0 && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>+ {remaining} more outlet{remaining > 1 ? 's' : ''}</div>
                )}
              </div>
            </div>
          )}

          {/* Already-assigned Warning */}
          {chosenManager && alreadyAssigned.length > 0 && (
            <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <AlertTriangle size={15} color="#92400E" />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#92400E' }}>
                  {alreadyAssigned.length} outlet{alreadyAssigned.length > 1 ? 's' : ''} already {alreadyAssigned.length > 1 ? 'have' : 'has'} a Store Manager
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.75rem' }}>
                {alreadyAssigned.slice(0, 3).map(o => (
                  <div key={o._id} style={{ fontSize: '0.78rem', color: '#78350F' }}>
                    <strong>{o.outletId}</strong>{o.name && ` — ${o.name}`} → {o.assignedManager?.name}
                  </div>
                ))}
                {alreadyAssigned.length > 3 && <div style={{ fontSize: '0.75rem', color: '#92400E', fontStyle: 'italic' }}>+ {alreadyAssigned.length - 3} more</div>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: '#78350F' }}>
                  <input type="radio" name="overwrite" checked={!overwrite} onChange={() => setOverwrite(false)} />
                  Skip already-assigned outlets (safe)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: '#78350F' }}>
                  <input type="radio" name="overwrite" checked={overwrite} onChange={() => setOverwrite(true)} />
                  Reassign all to {chosenManager?.name}
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn-secondary" style={{ padding: '0.6rem 1.1rem', fontSize: '0.875rem' }}>
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={!chosenManager || loading}
            className="btn-primary"
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.875rem', opacity: !chosenManager || loading ? 0.6 : 1 }}
          >
            {loading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <UserCheck size={15} />}
            {loading ? 'Assigning…' : `Assign ${willAssign} Outlet${willAssign !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Remove Confirm Modal ─────────────────────────────────────────────────────
const RemoveModal = ({ outlet, onClose, onSuccess, showToast }) => {
  const [loading, setLoading] = useState(false);

  const handleRemove = async () => {
    setLoading(true);
    try {
      await adminApi.unassignManager({ outletIds: [outlet._id] });
      onSuccess();
      onClose();
      showToast({ type: 'success', title: 'Manager removed', message: `${outlet.outletId} is now unassigned.` });
    } catch (err) {
      showToast({ type: 'error', title: 'Failed to remove manager', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: '420px' }}>
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserX size={20} color="#DC2626" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Remove Assignment</h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>{outlet.outletId}{outlet.name && ` — ${outlet.name}`}</p>
            </div>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
            This will remove <strong>{outlet.assignedManager?.name}</strong> from managing this outlet. The outlet will become unassigned.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button onClick={onClose} className="btn-secondary" style={{ padding: '0.6rem 1rem', fontSize: '0.875rem' }}>Cancel</button>
            <button onClick={handleRemove} disabled={loading} className="btn-danger" style={{ padding: '0.6rem 1rem', fontSize: '0.875rem', opacity: loading ? 0.6 : 1 }}>
              {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <UserX size={14} />}
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Per-row Action Menu ──────────────────────────────────────────────────────
const RowActionMenu = ({ outlet, onSingleAssign, onRemove }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={e => { e.stopPropagation(); setOpen(o => !o); }} style={{
        padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-sm)',
        border: '1.5px solid var(--border)', background: '#F8FAFC',
        fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem'
      }}>
        Actions <ChevronDown size={12} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 4px)', zIndex: 100,
          background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)', minWidth: '170px', overflow: 'hidden'
        }}>
          <button onClick={() => { setOpen(false); onSingleAssign(outlet); }} style={{
            width: '100%', padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', gap: '0.6rem',
            background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem',
            fontWeight: 600, color: 'var(--text-primary)', textAlign: 'left',
            borderBottom: outlet.assignedManager ? '1px solid var(--border)' : 'none'
          }}>
            <UserCheck size={14} color="#025E4C" />
            {outlet.assignedManager ? 'Change Manager' : 'Assign Manager'}
          </button>
          {outlet.assignedManager && (
            <button onClick={() => { setOpen(false); onRemove(outlet); }} style={{
              width: '100%', padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', gap: '0.6rem',
              background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem',
              fontWeight: 600, color: '#DC2626', textAlign: 'left'
            }}>
              <UserX size={14} /> Remove Assignment
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Pagination ───────────────────────────────────────────────────────────────
const Pagination = ({ page, setPage, total, pageSize }) => {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  const btnStyle = (active) => ({
    padding: '0.4rem 0.65rem', borderRadius: 'var(--radius-sm)',
    border: `1.5px solid ${active ? '#025E4C' : 'var(--border)'}`,
    background: active ? '#025E4C' : '#fff',
    color: active ? '#fff' : 'var(--text-primary)',
    fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
    minWidth: '34px'
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0' }}>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} outlets
      </div>
      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ ...btnStyle(false), opacity: page === 1 ? 0.4 : 1 }}>
          <ChevronLeft size={14} />
        </button>
        {start > 1 && <span style={{ padding: '0 0.25rem', color: 'var(--text-muted)' }}>…</span>}
        {pages.map(p => <button key={p} onClick={() => setPage(p)} style={btnStyle(p === page)}>{p}</button>)}
        {end < totalPages && <span style={{ padding: '0 0.25rem', color: 'var(--text-muted)' }}>…</span>}
        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ ...btnStyle(false), opacity: page === totalPages ? 0.4 : 1 }}>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export const StoreManagersOutlets = () => {
  const [outlets, setOutlets] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState(null);

  // Modals
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [singleAssignOutlet, setSingleAssignOutlet] = useState(null); // for per-row assign
  const [removeOutlet, setRemoveOutlet] = useState(null);

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [outletsRes, managersRes] = await Promise.all([
        adminApi.getOutletsWithManagers(),
        adminApi.getStoreManagers()
      ]);
      setOutlets(Array.isArray(outletsRes.data) ? outletsRes.data : []);
      setManagers(Array.isArray(managersRes.data) ? managersRes.data : []);
    } catch (err) {
      setToast({ type: 'error', title: 'Failed to load data', message: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const districts = useMemo(() =>
    Array.from(new Set(outlets.map(o => o.district).filter(Boolean))).sort()
  , [outlets]);

  const filteredOutlets = useMemo(() => {
    const term = filters.search.toLowerCase();
    return outlets.filter(o => {
      const managerName = o.assignedManager?.name?.toLowerCase() || '';
      const matchSearch = !term || (
        (o.outletId?.toLowerCase().includes(term)) ||
        (o.name?.toLowerCase().includes(term)) ||
        (o.district?.toLowerCase().includes(term)) ||
        managerName.includes(term)
      );
      const matchStatus =
        filters.status === 'ALL' ||
        (filters.status === 'assigned' && !!o.assignedManager) ||
        (filters.status === 'unassigned' && !o.assignedManager);
      const matchBrand = filters.brand === 'ALL' || o.brand === filters.brand;
      const matchDepot = filters.depot === 'ALL' || o.depot === filters.depot;
      const matchDistrict = filters.district === 'ALL' || o.district === filters.district;
      return matchSearch && matchStatus && matchBrand && matchDepot && matchDistrict;
    });
  }, [outlets, filters]);

  const paginatedOutlets = useMemo(() =>
    filteredOutlets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  , [filteredOutlets, page]);

  // Reset page on filter change
  useEffect(() => setPage(1), [filters]);

  // ── Selection helpers ─────────────────────────────────────────────────────
  const pageIds = paginatedOutlets.map(o => o._id);
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));

  const togglePageAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allPageSelected) { pageIds.forEach(id => next.delete(id)); }
      else { pageIds.forEach(id => next.add(id)); }
      return next;
    });
  };

  const toggleRow = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => setSelectedIds(new Set(filteredOutlets.map(o => o._id)));
  const clearSelection = () => setSelectedIds(new Set());

  // ── Modals ────────────────────────────────────────────────────────────────
  const openBulkAssign = () => setShowAssignModal(true);
  const openSingleAssign = (outlet) => {
    setSingleAssignOutlet(outlet);
    setSelectedIds(new Set([outlet._id]));
    setShowAssignModal(true);
  };
  const closeAssignModal = () => { setShowAssignModal(false); setSingleAssignOutlet(null); };

  const handleAssignSuccess = () => { clearSelection(); fetchAll(); };
  const handleRemoveSuccess = () => { fetchAll(); };

  const showToast = (t) => setToast(t);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '1.5rem', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#E8F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users2 size={22} color="#025E4C" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0 }}>Store Managers & Outlets</h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
              Assign managers to outlets — bulk select and assign in one action
            </p>
          </div>
        </div>
        <button onClick={fetchAll} disabled={loading} style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.55rem 1rem', border: '1.5px solid var(--border)',
          borderRadius: 'var(--radius-md)', background: '#fff',
          fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer'
        }}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <SummaryCards outlets={outlets} managers={managers} />

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        setFilters={setFilters}
        districts={districts}
        onClear={() => setFilters(EMPTY_FILTERS)}
      />

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedIds={selectedIds}
        total={filteredOutlets.length}
        onAssign={openBulkAssign}
        onClear={clearSelection}
        onSelectAll={selectAllFiltered}
      />

      {/* Table */}
      <div className="wf-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '0.875rem' }}>Loading outlets…</div>
          </div>
        ) : filteredOutlets.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <Store size={36} color="#CBD5E1" style={{ marginBottom: '0.75rem' }} />
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>No outlets match your filters</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Try adjusting or clearing the filters</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.855rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '2px solid var(--border)' }}>
                  {/* Checkbox */}
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center', width: '44px' }}>
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={togglePageAll}
                      style={{ cursor: 'pointer', accentColor: '#025E4C', width: '15px', height: '15px' }}
                    />
                  </th>
                  {['Outlet ID', 'Name', 'Brand', 'District', 'Depot', 'Store Manager', 'Status', ''].map(h => (
                    <th key={h} style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedOutlets.map((outlet, idx) => {
                  const isSelected = selectedIds.has(outlet._id);
                  return (
                    <tr key={outlet._id} style={{
                      borderBottom: '1px solid var(--border)',
                      background: isSelected ? '#F0FDF4' : idx % 2 === 0 ? '#fff' : '#FAFAFA',
                      transition: 'background var(--transition-fast)'
                    }}>
                      {/* Checkbox */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleRow(outlet._id)} style={{ cursor: 'pointer', accentColor: '#025E4C', width: '15px', height: '15px' }} />
                      </td>
                      {/* Outlet ID */}
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#025E4C', whiteSpace: 'nowrap' }}>
                        {outlet.outletId}
                      </td>
                      {/* Name */}
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-primary)', maxWidth: '200px' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {outlet.name || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </div>
                      </td>
                      {/* Brand */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <BrandBadge brand={outlet.brand} />
                      </td>
                      {/* District */}
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <MapPin size={12} color="#94A3B8" /> {outlet.district}
                        </div>
                      </td>
                      {/* Depot */}
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Building2 size={12} color="#94A3B8" /> {outlet.depot}
                        </div>
                      </td>
                      {/* Manager */}
                      <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                        {outlet.assignedManager ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#E8F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: '#025E4C', flexShrink: 0 }}>
                              {outlet.assignedManager.name.charAt(0).toUpperCase()}
                            </div>
                            <span style={{ fontSize: '0.83rem', fontWeight: 600 }}>{outlet.assignedManager.name}</span>
                          </div>
                        ) : (
                          <span style={{ color: '#CBD5E1', fontSize: '0.83rem' }}>—</span>
                        )}
                      </td>
                      {/* Status */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <StatusBadge assigned={!!outlet.assignedManager} />
                      </td>
                      {/* Actions */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <RowActionMenu
                          outlet={outlet}
                          onSingleAssign={openSingleAssign}
                          onRemove={setRemoveOutlet}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filteredOutlets.length > PAGE_SIZE && (
          <div style={{ padding: '0.5rem 1.25rem', borderTop: '1px solid var(--border)' }}>
            <Pagination page={page} setPage={setPage} total={filteredOutlets.length} pageSize={PAGE_SIZE} />
          </div>
        )}
      </div>

      {/* Modals */}
      {showAssignModal && (
        <AssignModal
          selectedIds={selectedIds}
          outlets={outlets}
          managers={managers}
          onClose={closeAssignModal}
          onSuccess={handleAssignSuccess}
          showToast={showToast}
        />
      )}
      {removeOutlet && (
        <RemoveModal
          outlet={removeOutlet}
          onClose={() => setRemoveOutlet(null)}
          onSuccess={handleRemoveSuccess}
          showToast={showToast}
        />
      )}

      {/* Toast */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Keyframe for spinner + modal */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
