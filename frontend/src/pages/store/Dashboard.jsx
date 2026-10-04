import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersApi } from '../../api/orders.api';
import { useOutlet } from '../../context/OutletContext';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import {
  PlusCircle, ShoppingCart, Truck, CheckCircle2, Clock,
  AlertTriangle, Store, MapPin, Building2, ChevronRight,
  Package, Layers
} from 'lucide-react';

// ─── Brand config ──────────────────────────────────────────────────────────────
const BRAND_COLORS = {
  Fresh: { color: '#15803D', bg: '#DCFCE7', border: '#86EFAC' },
  Style: { color: '#B45309', bg: '#FEF3C7', border: '#FCD34D' },
  Tech:  { color: '#3730A3', bg: '#E0E7FF', border: '#A5B4FC' },
};

// ─── Outlet Card (summary for multi-outlet view) ──────────────────────────────
const OutletCard = ({ outlet, onClick }) => {
  const cfg = BRAND_COLORS[outlet.brand] || { color: '#475569', bg: '#F1F5F9', border: '#CBD5E1' };
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left', cursor: 'pointer',
        padding: '1.25rem', borderRadius: 'var(--radius-lg)',
        border: `1.5px solid ${cfg.border}`,
        background: cfg.bg,
        display: 'flex', alignItems: 'center', gap: '1rem',
        transition: 'all 0.15s ease',
        boxShadow: 'var(--shadow-sm)'
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
    >
      <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Store size={22} color={cfg.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '1rem', fontWeight: 800, color: cfg.color, fontFamily: 'var(--font-heading)' }}>
          {outlet.outletId}
        </div>
        {outlet.name && (
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: cfg.color, opacity: 0.85, marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {outlet.name}
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: cfg.color, opacity: 0.75, display: 'flex', alignItems: 'center', gap: '3px' }}>
            <MapPin size={11} /> {outlet.district}
          </span>
          <span style={{ fontSize: '0.75rem', color: cfg.color, opacity: 0.75, display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Building2 size={11} /> {outlet.depot}
          </span>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0 0.5rem', borderRadius: '999px', background: 'rgba(255,255,255,0.6)', color: cfg.color }}>
            {outlet.brand}
          </span>
        </div>
      </div>
      <ChevronRight size={18} color={cfg.color} style={{ flexShrink: 0, opacity: 0.6 }} />
    </button>
  );
};

// ─── Metric Card ──────────────────────────────────────────────────────────────
const MetricCard = ({ label, value, icon: Icon, color, bg }) => (
  <div className="wf-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon size={22} color={color} />
    </div>
    <div>
      <div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1, fontFamily: 'var(--font-heading)' }}>{value}</div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '3px', fontWeight: 500 }}>{label}</div>
    </div>
  </div>
);

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export const StoreDashboard = () => {
  const navigate = useNavigate();
  const { outlets, activeOutlet, loadingOutlets, hasMultipleOutlets, hasNoOutlets, switchOutlet } = useOutlet();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── Load dashboard data whenever active outlet changes ────────────────────
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ordersApi.getStoreDashboard(activeOutlet?._id || null);
      setData(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeOutlet?._id]);

  useEffect(() => {
    // Only load when we have outlet info or know there are no outlets
    if (!loadingOutlets) {
      loadDashboard();
    }
  }, [loadDashboard, loadingOutlets]);

  // ── No outlets assigned ───────────────────────────────────────────────────
  if (!loadingOutlets && hasNoOutlets) {
    return (
      <div style={{ padding: '2rem', maxWidth: '600px', margin: '2rem auto', textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
          <Store size={32} color="#DC2626" />
        </div>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', marginBottom: '0.5rem' }}>No Outlets Assigned</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          You don't have any outlets assigned yet. Please contact your Administrator to assign outlets to your account.
        </p>
      </div>
    );
  }

  // ── Multi-outlet landing: show outlet grid when no outlet is selected ─────
  if (hasMultipleOutlets && !activeOutlet && !loadingOutlets) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#E8F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={20} color="#025E4C" />
            </div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Your Assigned Outlets</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0, paddingLeft: '50px' }}>
            You manage {outlets.length} outlets. Select one to view its dashboard, or use the selector above to switch at any time.
          </p>
        </div>

        {/* Outlet grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {outlets.map(o => (
            <OutletCard key={o._id} outlet={o} onClick={() => switchOutlet(o)} />
          ))}
        </div>

        {/* Summary stats across all outlets */}
        <div style={{ marginTop: '2rem', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', background: '#F8FAFC', border: '1px solid var(--border)', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>{outlets.length}</strong> total outlets
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Depots: <strong style={{ color: 'var(--text-primary)' }}>{[...new Set(outlets.map(o => o.depot))].join(', ')}</strong>
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Brands: <strong style={{ color: 'var(--text-primary)' }}>{[...new Set(outlets.map(o => o.brand))].join(', ')}</strong>
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Districts: <strong style={{ color: 'var(--text-primary)' }}>{[...new Set(outlets.map(o => o.district))].join(', ')}</strong>
          </div>
        </div>
      </div>
    );
  }

  if (loadingOutlets || loading) return <LoadingSpinner text="Loading Store Dashboard…" />;
  if (error) return (
    <div style={{ padding: '2rem', textAlign: 'center', color: '#DC2626' }}>
      <AlertTriangle size={32} style={{ marginBottom: '0.5rem' }} />
      <div>{error}</div>
      <button className="btn-secondary" style={{ marginTop: '1rem' }} onClick={loadDashboard}>Retry</button>
    </div>
  );

  const { outlet, metrics = {}, incomingDeliveries = [], recentOrders = [] } = data || {};
  const displayOutlet = outlet || activeOutlet;
  const cfg = BRAND_COLORS[displayOutlet?.brand] || { color: '#025E4C', bg: '#E8F5EE', border: '#B9E1C9' };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Outlet Header Banner */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderRadius: 'var(--radius-lg)',
        background: cfg.bg,
        border: `1.5px solid ${cfg.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Store size={26} color={cfg.color} />
          </div>
          <div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: cfg.color, fontFamily: 'var(--font-heading)' }}>
              {displayOutlet?.outletId || 'Store Dashboard'}
              {displayOutlet?.name && <span style={{ fontWeight: 500, opacity: 0.8 }}> — {displayOutlet.name}</span>}
            </div>
            <div style={{ fontSize: '0.82rem', color: cfg.color, opacity: 0.75, display: 'flex', gap: '1rem', marginTop: '2px', flexWrap: 'wrap' }}>
              {displayOutlet?.brand && <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Package size={12} /> {displayOutlet.brand}</span>}
              {displayOutlet?.district && <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><MapPin size={12} /> {displayOutlet.district}</span>}
              {displayOutlet?.depot && <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Building2 size={12} /> {displayOutlet.depot} Depot</span>}
              {displayOutlet?.windowOpenTime && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Clock size={12} /> Window: {displayOutlet.windowOpenTime} – {displayOutlet.windowCloseTime}
                </span>
              )}
            </div>
          </div>
        </div>
        <button className="btn-primary" onClick={() => navigate('/store/orders/create')} style={{ background: cfg.color }}>
          <PlusCircle size={17} /> Create New Order
        </button>
      </div>

      {/* Cutoff Banner */}
      <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 'var(--radius-md)', padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#1E40AF', fontSize: '0.875rem' }}>
        <Clock size={18} style={{ color: '#2563EB', flexShrink: 0 }} />
        <div>
          <strong>Daily Replenishment Cutoff: 16:00 Colombo Time.</strong>{' '}
          Orders placed before 16:00 are scheduled for next-morning delivery window{' '}
          ({displayOutlet?.windowOpenTime || '06:00'} – {displayOutlet?.windowCloseTime || '08:00'}).
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        <MetricCard label="Total Store Orders" value={metrics.totalOrders || 0} icon={ShoppingCart} color="#475569" bg="#F1F5F9" />
        <MetricCard label="Pending Deliveries" value={metrics.pendingDeliveries || 0} icon={Truck} color="#2563EB" bg="#EFF6FF" />
        <MetricCard label="Receipts Confirmed" value={metrics.completedReceipts || 0} icon={CheckCircle2} color="#025E4C" bg="#E8F5EE" />
        <MetricCard label="Open Discrepancies" value={metrics.reportedIssues || 0} icon={AlertTriangle} color={metrics.reportedIssues > 0 ? '#DC2626' : '#64748B'} bg={metrics.reportedIssues > 0 ? '#FEE2E2' : '#F1F5F9'} />
      </div>

      {/* Incoming Deliveries */}
      <Card title="Incoming Deliveries & Receipts" subtitle="Deliveries ready for unload, inspection, and receipt confirmation">
        {incomingDeliveries.length === 0 ? (
          <EmptyState title="No deliveries currently en route" message="When the dispatcher publishes a plan and the driver departs, stops will appear here." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {incomingDeliveries.map(del => (
              <div key={del._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: '#fff', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Stop #{del.stopSequence}</span>
                    <Badge status={del.status} />
                  </div>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Order Ref: <strong>{del.order?.orderRef}</strong> • Driver: {del.driver?.name || 'Fleet Driver'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }} onClick={() => navigate(`/store/orders/${del.order?._id}`)}>
                    Track ETA
                  </button>
                  <button className="btn-primary" style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }} onClick={() => navigate(`/store/deliveries/${del._id}/receipt`)}>
                    Confirm Receipt
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Recent Orders */}
      <Card title="Recent Replenishment Orders" action={
        <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }} onClick={() => navigate('/store/orders')}>
          View All Orders
        </button>
      }>
        {recentOrders.length === 0 ? (
          <EmptyState title="No orders placed yet" message="Create your first stock order using the button above." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.855rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  {['Order Ref', 'Delivery Date', 'Brand & Temp', 'Load Size', 'Status', ''].map(h => (
                    <th key={h} style={{ padding: '0.75rem 0.5rem', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(ord => (
                  <tr key={ord._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>{ord.orderRef}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>{new Date(ord.requestedDeliveryDate).toLocaleDateString()}</td>
                    <td style={{ padding: '0.75rem 0.5rem', textTransform: 'capitalize' }}>{ord.brand} • {ord.tempRequirement}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>{ord.orderUnits} units ({ord.orderWeightKg}kg / {ord.orderVolumeM3}m³)</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}><Badge status={ord.status} /></td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                      <button className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }} onClick={() => navigate(`/store/orders/${ord._id}`)}>Details</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
