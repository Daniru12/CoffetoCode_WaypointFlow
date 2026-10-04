import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersApi } from '../../api/orders.api';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { PlusCircle, Search, Filter } from 'lucide-react';

export const StoreOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await ordersApi.getMyOrders();
      setOrders(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = !statusFilter || o.status === statusFilter;
    const matchesSource = !sourceFilter || (o.orderSource || 'MANUAL') === sourceFilter;
    const matchesSearch = !searchTerm || o.orderRef.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSource && matchesSearch;
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>My Store Replenishment Orders</h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Track statuses across planning, loading, and transit
          </span>
        </div>

        <button className="btn-primary" onClick={() => navigate('/store/orders/create')}>
          <PlusCircle size={18} />
          <span>New Order</span>
        </button>
      </div>

      <Card>
        {/* Filters Strip */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <input
              type="text"
              placeholder="Search by Order Ref..."
              className="form-input"
              style={{ paddingLeft: '2.4rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          </div>

          <select
            className="form-select"
            style={{ width: '180px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="CONFIRMED">Pending / Confirmed</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="LOADING">Loading</option>
            <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
            <option value="DELIVERED">Delivered</option>
            <option value="DEFERRED">Deferred</option>
          </select>

          <select
            className="form-select"
            style={{ width: '180px' }}
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
          >
            <option value="">All Sources</option>
            <option value="MANUAL">Manual Ad-Hoc</option>
            <option value="REPLENISHMENT_PLAN">Replenishment Plan</option>
          </select>
        </div>

        {loading ? (
          <LoadingSpinner text="Fetching store orders..." />
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            title="No orders found"
            message="No orders match the selected search or status criteria."
            action={
              <button className="btn-primary" onClick={() => navigate('/store/orders/create')}>
                Create New Order
              </button>
            }
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Order Ref</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Source</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Delivery Date & Cycle</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Brand & Temp</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Quantity / Load</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Delivery Window</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((ord) => (
                  <tr key={ord._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '0.85rem 0.5rem', fontWeight: 700 }}>{ord.orderRef}</td>
                    <td style={{ padding: '0.85rem 0.5rem' }}>
                      <span style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: ord.orderSource === 'REPLENISHMENT_PLAN' ? '#EFF6FF' : '#F1F5F9',
                        color: ord.orderSource === 'REPLENISHMENT_PLAN' ? '#1D4ED8' : '#475569'
                      }}>
                        {ord.orderSource === 'REPLENISHMENT_PLAN' ? 'Plan-Based' : 'Manual'}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem' }}>
                      <div>{new Date(ord.requestedDeliveryDate).toLocaleDateString()}</div>
                      {ord.isPostCutoff && (
                        <div style={{ fontSize: '0.7rem', color: '#EA580C', fontWeight: 700 }}>
                          Post-Cutoff (Next Cycle)
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem' }}>
                      <span style={{ textTransform: 'capitalize' }}>{ord.brand} • {ord.tempRequirement}</span>
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem' }}>
                      {ord.orderUnits} units ({ord.orderWeightKg}kg / {ord.orderVolumeM3}m³)
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem' }}>
                      {ord.deliveryWindow ? `${ord.deliveryWindow.start} - ${ord.deliveryWindow.end}` : 'Standard Window'}
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem' }}>
                      <Badge status={ord.status} />
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right' }}>
                      <button
                        className="btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                        onClick={() => navigate(`/store/orders/${ord._id}`)}
                      >
                        Track Status
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
