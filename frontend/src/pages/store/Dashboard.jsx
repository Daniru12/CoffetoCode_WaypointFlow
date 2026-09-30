import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersApi } from '../../api/orders.api';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { PlusCircle, ShoppingCart, Truck, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

export const StoreDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await ordersApi.getStoreDashboard();
      setData(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading Store Operations Dashboard..." />;

  const { outlet, metrics = {}, incomingDeliveries = [], recentOrders = [] } = data || {};

  return (
    <div>
      {/* Outlet Welcome Header & 16:00 Cutoff Alert */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
            {outlet?.name || 'Colombo Store Hub'}
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Brand: <strong>{outlet?.brand}</strong> • District: <strong>{outlet?.district}</strong> • Window: <strong>{outlet?.windowOpenTime || '06:00'} - {outlet?.windowCloseTime || '08:00'}</strong>
          </span>
        </div>

        <button
          className="btn-primary"
          onClick={() => navigate('/store/orders/create')}
        >
          <PlusCircle size={18} />
          <span>Create New Order</span>
        </button>
      </div>

      {/* 16:00 Cutoff Banner */}
      <div style={{
        backgroundColor: '#EFF6FF',
        border: '1px solid #BFDBFE',
        borderRadius: 'var(--radius-md)',
        padding: '0.85rem 1.25rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        color: '#1E40AF',
        fontSize: '0.875rem'
      }}>
        <Clock size={20} style={{ color: '#2563EB', flexShrink: 0 }} />
        <div>
          <strong>Daily Replenishment Cutoff: 16:00 Colombo Time.</strong> Orders placed before 16:00 are scheduled for next-morning delivery window ({outlet?.windowOpenTime || '06:00'} - {outlet?.windowCloseTime || '08:00'}).
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Store Orders</span>
              <h3 style={{ fontSize: '1.8rem', marginTop: '0.2rem' }}>{metrics.totalOrders || 0}</h3>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
              <ShoppingCart size={22} />
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Pending Deliveries</span>
              <h3 style={{ fontSize: '1.8rem', marginTop: '0.2rem', color: '#2563EB' }}>{metrics.pendingDeliveries || 0}</h3>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
              <Truck size={22} />
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Receipts Confirmed</span>
              <h3 style={{ fontSize: '1.8rem', marginTop: '0.2rem', color: 'var(--primary-green)' }}>{metrics.completedReceipts || 0}</h3>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#E8F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-green)' }}>
              <CheckCircle2 size={22} />
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Reported Discrepancies</span>
              <h3 style={{ fontSize: '1.8rem', marginTop: '0.2rem', color: metrics.reportedIssues > 0 ? '#DC2626' : 'inherit' }}>
                {metrics.reportedIssues || 0}
              </h3>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626' }}>
              <AlertTriangle size={22} />
            </div>
          </div>
        </Card>
      </div>

      {/* Incoming Deliveries Today */}
      <Card title="Incoming Deliveries & Receipts" subtitle="Deliveries ready for unload, inspection, and receipt confirmation" style={{ marginBottom: '1.5rem' }}>
        {incomingDeliveries.length === 0 ? (
          <EmptyState title="No deliveries currently en route" message="When the dispatcher publishes a plan and the driver departs, stops will appear here." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {incomingDeliveries.map((del) => (
              <div
                key={del._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#FFFFFF',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Stop #{del.stopSequence}</span>
                    <Badge status={del.status} />
                  </div>
                  <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                    Order Ref: <strong>{del.order?.orderRef}</strong> • Driver: {del.driver?.name || 'Fleet Driver'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
                    onClick={() => navigate(`/store/orders/${del.order?._id}`)}
                  >
                    Track Live ETA
                  </button>
                  <button
                    className="btn-primary"
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
                    onClick={() => navigate(`/store/deliveries/${del._id}/receipt`)}
                  >
                    Confirm Receipt
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Recent Orders List */}
      <Card title="Recent Store Replenishment Orders" action={
        <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }} onClick={() => navigate('/store/orders')}>
          View All Orders
        </button>
      }>
        {recentOrders.length === 0 ? (
          <EmptyState title="No orders placed yet" message="Create your first stock order using the button above." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Order Ref</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Delivery Date</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Brand & Temp</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Load Size</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((ord) => (
                  <tr key={ord._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{ord.orderRef}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      {new Date(ord.requestedDeliveryDate).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span style={{ textTransform: 'capitalize' }}>{ord.brand} • {ord.tempRequirement}</span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      {ord.orderUnits} units ({ord.orderWeightKg}kg / {ord.orderVolumeM3}m³)
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <Badge status={ord.status} />
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                      <button
                        className="btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                        onClick={() => navigate(`/store/orders/${ord._id}`)}
                      >
                        Details
                      </button>
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
