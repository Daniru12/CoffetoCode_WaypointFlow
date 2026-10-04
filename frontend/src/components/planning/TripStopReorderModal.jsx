import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { planningApi } from '../../api/planning.api';
import { ArrowUp, ArrowDown, Trash2, MapPin, Check, AlertCircle } from 'lucide-react';

export const TripStopReorderModal = ({ isOpen, onClose, trip, onUpdated }) => {
  const [orders, setOrders] = useState(() => (trip?.orders || []).slice());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Sync state if trip changes
  React.useEffect(() => {
    if (trip?.orders) {
      setOrders(trip.orders.slice());
    }
  }, [trip]);

  if (!isOpen || !trip) return null;

  const moveStop = (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= orders.length) return;

    const updated = [...orders];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;

    // re-sequence numbers
    updated.forEach((item, idx) => {
      item.stopSequence = idx + 1;
    });

    setOrders(updated);
  };

  const handleSaveOrder = async () => {
    setSaving(true);
    setError(null);
    try {
      const stopOrderIds = orders.map(item => item.order?._id || item.order);
      await planningApi.reorderTripStops(trip._id, stopOrderIds);
      onUpdated();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to reorder stops');
    } finally {
      setSaving(false);
    }
  };

  const handleUnassign = async (orderId) => {
    if (!confirm('Remove this order from trip back to unallocated pool?')) return;
    setSaving(true);
    setError(null);
    try {
      await planningApi.unassignTripOrder(trip._id, orderId);
      onUpdated();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to unassign order');
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Adjust Sequence: ${trip.tripRef}`}>
      <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        Vehicle: <strong>{trip.vehicle?.vehicleId}</strong> ({trip.vehicle?.type}) • Brand: <strong>{trip.brand}</strong> • District: <strong>{trip.district}</strong>
      </div>

      {error && (
        <div style={{ backgroundColor: '#FEE2E2', color: '#991B1B', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '400px', overflowY: 'auto' }}>
        {orders.map((item, idx) => {
          const ord = item.order || {};
          return (
            <div
              key={ord._id || idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#FFFFFF'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  backgroundColor: '#025E4C',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.8rem'
                }}>
                  {item.stopSequence || idx + 1}
                </span>

                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    {ord.orderRef} — {ord.outlet?.name || ord.outlet?.outletId || 'Retail Outlet'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {ord.orderWeightKg}kg • {ord.orderVolumeM3}m³ • Window: {ord.deliveryWindow ? `${ord.deliveryWindow.start}-${ord.deliveryWindow.end}` : '06:00-08:00'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '0.3rem 0.5rem' }}
                  disabled={idx === 0 || saving}
                  onClick={() => moveStop(idx, -1)}
                  title="Move Stop Earlier"
                >
                  <ArrowUp size={14} />
                </button>

                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '0.3rem 0.5rem' }}
                  disabled={idx === orders.length - 1 || saving}
                  onClick={() => moveStop(idx, 1)}
                  title="Move Stop Later"
                >
                  <ArrowDown size={14} />
                </button>

                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '0.3rem 0.5rem', color: '#DC2626' }}
                  disabled={saving}
                  onClick={() => handleUnassign(ord._id)}
                  title="Remove from Trip"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
        <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={handleSaveOrder}
          disabled={saving}
        >
          {saving ? 'Saving Sequence...' : 'Save Sequence'}
        </button>
      </div>
    </Modal>
  );
};
