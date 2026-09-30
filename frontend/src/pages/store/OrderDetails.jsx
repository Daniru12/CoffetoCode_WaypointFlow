import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ordersApi } from '../../api/orders.api';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { OrderTimeline } from '../../components/order/OrderTimeline';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ArrowLeft, Truck, User, Calendar, MapPin, CheckCircle, Package } from 'lucide-react';

export const OrderDetails = () => {
  const { orderId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadTracking();
  }, [orderId]);

  const loadTracking = async () => {
    setLoading(true);
    try {
      const res = await ordersApi.getOrderTracking(orderId);
      setData(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Fetching delivery tracking & status..." />;
  if (error) return <div style={{ color: '#DC2626', padding: '2rem' }}>Error: {error}</div>;

  const { order, delivery, trip, driverLocation } = data || {};

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <button
        onClick={() => navigate('/store/orders')}
        className="btn-secondary"
        style={{ marginBottom: '1.25rem', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
      >
        <ArrowLeft size={16} />
        <span>Back to Orders</span>
      </button>

      {/* Header Info Strip */}
      <div className="wf-card" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>{order?.orderRef}</h2>
            <Badge status={order?.status} />
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Placed on {order?.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A'}
          </span>
        </div>

        {delivery && delivery.status === 'DELIVERED' && (
          <button
            className="btn-primary"
            onClick={() => navigate(`/store/deliveries/${delivery._id}/receipt`)}
          >
            <CheckCircle size={18} />
            <span>Confirm Receipt & Condition</span>
          </button>
        )}
      </div>

      {/* Order Progression Timeline */}
      <Card title="Delivery Progress Timeline" style={{ marginBottom: '1.5rem' }}>
        <OrderTimeline status={order?.status} />
      </Card>

      {/* Transit & Vehicle Information */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <Card title="Assigned Fleet & Logistics">
          {trip ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Truck size={20} color="var(--primary-green)" />
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Vehicle</span>
                  <div style={{ fontWeight: 700 }}>{trip.vehicle?.vehicleId || 'Assigned Vehicle'} ({trip.vehicle?.type} • {trip.vehicle?.temp})</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <User size={20} color="var(--primary-green)" />
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Driver</span>
                  <div style={{ fontWeight: 700 }}>{trip.driver?.name || 'Assigned Fleet Driver'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Calendar size={20} color="var(--primary-green)" />
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Trip Sequence</span>
                  <div style={{ fontWeight: 700 }}>{trip.tripRef} (Shift #{trip.tripNumber})</div>
                </div>
              </div>

              {driverLocation && (
                <div style={{
                  backgroundColor: '#E8F5EE',
                  padding: '0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  color: '#025E4C',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <MapPin size={16} />
                  <span>Latest Coordinates: {driverLocation.latitude.toFixed(4)}, {driverLocation.longitude.toFixed(4)}</span>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: '1rem 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Order is queued for vehicle allocation by the Central Dispatcher.
            </div>
          )}
        </Card>

        <Card title="Order Specifications">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Brand:</span>
              <span style={{ fontWeight: 700 }}>{order?.brand}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Storage:</span>
              <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>{order?.tempRequirement}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total Cargo Units:</span>
              <span style={{ fontWeight: 700 }}>{order?.orderUnits} units</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Weight / Volume:</span>
              <span style={{ fontWeight: 700 }}>{order?.orderWeightKg} kg / {order?.orderVolumeM3} m³</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Store Dock Window:</span>
              <span style={{ fontWeight: 700 }}>{order?.deliveryWindow?.start || '06:00'} - {order?.deliveryWindow?.end || '08:00'}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Cargo Line Items */}
      {order?.items && order.items.length > 0 && (
        <Card title="Inventory Items in Consignment">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.65rem 0.5rem' }}>Item Description</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Qty</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Unit</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Weight</th>
                <th style={{ padding: '0.65rem 0.5rem' }}>Volume</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((it, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '0.65rem 0.5rem', fontWeight: 600 }}>{it.itemName || 'Standard Merchandise'}</td>
                  <td style={{ padding: '0.65rem 0.5rem' }}>{it.qty}</td>
                  <td style={{ padding: '0.65rem 0.5rem' }}>{it.unit || 'cases'}</td>
                  <td style={{ padding: '0.65rem 0.5rem' }}>{it.weightKg} kg</td>
                  <td style={{ padding: '0.65rem 0.5rem' }}>{it.volumeM3} m³</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};
