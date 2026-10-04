import React, { useState, useRef, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/navigation/Sidebar';
import { Topbar } from '../components/navigation/Topbar';
import { OutletProvider, useOutlet } from '../context/OutletContext';
import { useAuth } from '../hooks/useAuth';
import { Store, ChevronDown, MapPin, Building2, Check, Loader2, LogOut } from 'lucide-react';

const BRAND_COLORS = {
  Fresh: { color: '#15803D', bg: '#DCFCE7' },
  Style: { color: '#B45309', bg: '#FEF3C7' },
  Tech:  { color: '#3730A3', bg: '#E0E7FF' },
};

/**
 * Active Outlet Selector — shown in the header when a manager has multiple outlets.
 * Lives inside OutletProvider so it can access the outlet context.
 */
const OutletSelector = () => {
  const { outlets, activeOutlet, loadingOutlets, switchOutlet, hasMultipleOutlets, hasNoOutlets } = useOutlet();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  if (loadingOutlets) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: '#F8FAFC', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
        <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
        Loading outlets…
      </div>
    );
  }

  if (hasNoOutlets) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.85rem', borderRadius: '8px', border: '1px solid #FCA5A5', background: '#FEE2E2', fontSize: '0.8rem', color: '#991B1B', fontWeight: 600 }}>
        <Store size={13} /> No outlets assigned
      </div>
    );
  }

  // Single outlet — just show name, no dropdown
  if (!hasMultipleOutlets) {
    const o = activeOutlet || outlets[0];
    const cfg = BRAND_COLORS[o?.brand] || { color: '#475569', bg: '#F1F5F9' };
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: '#F8FAFC', fontSize: '0.82rem' }}>
        <div style={{ width: '20px', height: '20px', borderRadius: '5px', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Store size={11} color={cfg.color} />
        </div>
        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{o?.outletId}</span>
        {o?.name && <span style={{ color: 'var(--text-secondary)' }}>— {o.name}</span>}
      </div>
    );
  }

  // Multiple outlets — show dropdown
  const cfg = BRAND_COLORS[activeOutlet?.brand] || { color: '#025E4C', bg: '#E8F5EE' };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.4rem 0.85rem', borderRadius: '8px',
          border: `1.5px solid ${open ? '#025E4C' : 'var(--border)'}`,
          background: open ? '#F0FDF4' : '#F8FAFC',
          cursor: 'pointer', fontSize: '0.82rem',
          transition: 'all 0.15s ease'
        }}
      >
        <div style={{ width: '20px', height: '20px', borderRadius: '5px', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Store size={11} color={cfg.color} />
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1 }}>Active Outlet</div>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
            {activeOutlet ? `${activeOutlet.outletId}${activeOutlet.name ? ` — ${activeOutlet.name}` : ''}` : 'Select outlet…'}
          </div>
        </div>
        <ChevronDown size={14} color="#94A3B8" style={{ marginLeft: '0.2rem', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 500,
          background: '#fff', border: '1.5px solid var(--border)',
          borderRadius: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          minWidth: '280px', overflow: 'hidden'
        }}>
          <div style={{ padding: '0.6rem 0.85rem', background: '#F8FAFC', borderBottom: '1px solid var(--border)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Your Assigned Outlets ({outlets.length})
          </div>
          {outlets.map(o => {
            const oCfg = BRAND_COLORS[o.brand] || { color: '#475569', bg: '#F1F5F9' };
            const isActive = activeOutlet?._id === o._id;
            return (
              <button
                key={o._id}
                onClick={() => { switchOutlet(o); setOpen(false); }}
                style={{
                  width: '100%', padding: '0.75rem 0.85rem',
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  background: isActive ? '#F0FDF4' : 'transparent',
                  border: 'none', borderBottom: '1px solid #F1F5F9',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'background 0.12s ease'
                }}
              >
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: oCfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Store size={16} color={oCfg.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.855rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {o.outletId}{o.name && ` — ${o.name}`}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', marginTop: '1px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><MapPin size={10} />{o.district}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><Building2 size={10} />{o.depot}</span>
                    <span style={{ padding: '0 0.4rem', borderRadius: '999px', background: oCfg.bg, color: oCfg.color, fontWeight: 700, fontSize: '0.68rem' }}>{o.brand}</span>
                  </div>
                </div>
                {isActive && <Check size={15} color="#025E4C" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/**
 * Inner layout — needs to be inside OutletProvider to access context
 */
const StoreInnerLayout = () => {
  const { user, logout } = useAuth();
  
  return (
    <div className="app-container">
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        {/* Header row with topbar + outlet selector */}
        <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', height: '68px', gap: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-heading)' }}>Store Operations</h1>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>Manage replenishment orders, incoming deliveries and receipt confirmations</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <OutletSelector />
              
              {/* User Profile & Logout */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '1px solid var(--border)', paddingLeft: '1.25rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>{user?.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.email}</div>
                </div>
                <button
                  onClick={logout}
                  title="Sign out"
                  style={{
                    padding: '0.5rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.borderColor = '#FCA5A5'; e.currentTarget.style.background = '#FEE2E2'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent'; }}
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
        <main className="main-content">
          <Outlet />
        </main>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export const StoreLayout = () => (
  <OutletProvider>
    <StoreInnerLayout />
  </OutletProvider>
);
