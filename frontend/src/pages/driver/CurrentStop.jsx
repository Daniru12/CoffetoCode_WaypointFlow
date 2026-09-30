import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { driverApi } from '../../api/driver.api';
import { syncQueue } from '../../offline/syncQueue';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { MapPin, Clock, ArrowLeft, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useOffline } from '../../hooks/useOffline';
import { useSyncQueue } from '../../hooks/useSyncQueue';
import { OfflineBanner } from '../../components/driver/OfflineBanner';

export const CurrentStop = () => {
  const { tripId } = useParams();
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isOffline } = useOffline();
  const { pendingCount, syncStatus } = useSyncQueue();
  const navigate = useNavigate();

  useEffect(() => {
    loadStops();
  }, [tripId]);

  const loadStops = async () => {
    setLoading(true);
    try {
      const res = await driverApi.getTripStops(tripId);
      setStops(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleArrive = async (deliveryId) => {
    try {
      if (navigator.onLine) {
        await driverApi.arriveDelivery(deliveryId);
      } else {
        await syncQueue.enqueue('DELIVERY_ARRIVED', deliveryId, { arrivedAt: new Date().toISOString() });
      }
      loadStops();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <LoadingSpinner text="Loading route stops sequence..." />;

  return (
    <div>
      <button
        onClick={() => navigate('/driver/route')}
        className="btn-secondary"
        style={{ marginBottom: '1.25rem', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
      >
        <ArrowLeft size={16} />
        <span>Back to Routes</span>
      </button>

      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Route Stops Sequence</h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Execute stops in sequence according to store delivery windows
        </span>
      </div>

      <OfflineBanner
        isOffline={isOffline}
        pendingCount={pendingCount}
        isSyncing={syncStatus === 'SYNCING'}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {stops.map((stop, idx) => {
          const isDelivered = stop.status === 'DELIVERED';
          const isArrived = stop.status === 'ARRIVED';

          return (
            <div
              key={stop._id}
              className="wf-card"
              style={{
                border: isArrived ? '2px solid var(--primary-green)' : '1px solid var(--border)',
                padding: '1.25rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: isDelivered ? '#025E4C' : '#F1F5F9',
                    color: isDelivered ? '#FFFFFF' : '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.85rem'
                  }}>
                    {stop.stopSequence || idx + 1}
                  </span>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
                      {stop.outlet?.name || stop.outlet?.outletId}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {stop.outlet?.district} • {stop.outlet?.parkingConstraint || 'normal dock'}
                    </span>
                  </div>
                </div>
                <Badge status={stop.status} />
              </div>

              {/* Order Manifest Info */}
              <div style={{
                backgroundColor: '#F8FAFC',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem',
                fontSize: '0.8rem',
                marginBottom: '1rem',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Order Ref:</span>
                  <div style={{ fontWeight: 700 }}>{stop.order?.orderRef}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Window:</span>
                  <div style={{ fontWeight: 700 }}>{stop.outlet?.windowOpenTime || '06:00'} - {stop.outlet?.windowCloseTime || '08:00'}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Cargo Size:</span>
                  <div style={{ fontWeight: 700 }}>{stop.order?.orderUnits || 1} units ({stop.order?.orderWeightKg || 0}kg)</div>
                </div>
              </div>

              {/* Driver Actions */}
              {!isDelivered && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {!isArrived ? (
                    <button
                      className="btn-primary driver-action-btn"
                      onClick={() => handleArrive(stop._id)}
                    >
                      <MapPin size={20} />
                      <span>Mark Arrived at Store</span>
                    </button>
                  ) : (
                    <button
                      className="btn-primary driver-action-btn"
                      onClick={() => navigate(`/driver/deliveries/${stop._id}/pod`)}
                    >
                      <CheckCircle size={20} />
                      <span>Complete Delivery & POD</span>
                    </button>
                  )}

                  <button
                    className="btn-secondary"
                    style={{ fontSize: '0.85rem', color: '#DC2626' }}
                    onClick={() => navigate(`/driver/deliveries/${stop._id}/incident`)}
                  >
                    <AlertTriangle size={16} />
                    <span>Report Stop Issue / Delay</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
