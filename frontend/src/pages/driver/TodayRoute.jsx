import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { driverApi } from '../../api/driver.api';
import { syncApi } from '../../api/sync.api';
import { syncManager } from '../../offline/syncManager';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Truck, Compass, MapPin, CheckCircle, ArrowRight, DownloadCloud, Navigation, Map } from 'lucide-react';
import { useOffline } from '../../hooks/useOffline';
import { useSyncQueue } from '../../hooks/useSyncQueue';
import { useAuth } from '../../hooks/useAuth';
import { OfflineBanner } from '../../components/driver/OfflineBanner';
import { DriverRouteMap } from '../../components/driver/DriverRouteMap';

export const TodayRoute = () => {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cached, setCached] = useState(false);
  const [previewTripId, setPreviewTripId] = useState(null);
  const { isOffline } = useOffline();
  const { pendingCount, syncStatus, triggerSync } = useSyncQueue();
  const navigate = useNavigate();

  useEffect(() => {
    loadRoute();
  }, []);

  const loadRoute = async () => {
    setLoading(true);
    try {
      if (navigator.onLine) {
        // Online: fetch routes and pre-cache for offline
        const res = await driverApi.getRoutesToday();
        const activeTrips = res.data || [];
        setTrips(activeTrips);

        // Pre-cache bootstrap offline package
        try {
          const bootstrap = await syncApi.bootstrapOfflineData();
          await syncManager.cacheRouteData(bootstrap.data);
          setCached(true);
        } catch (e) {
          console.warn('Bootstrap pre-cache notice:', e.message);
        }
      } else {
        // Offline: read from IndexedDB
        const offlineData = await syncManager.getCachedRoutes();
        setTrips(offlineData.trips || []);
        setCached(true);
      }
    } catch (err) {
      console.error(err);
      // Fallback to IndexedDB
      const offlineData = await syncManager.getCachedRoutes();
      setTrips(offlineData.trips || []);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Retrieving driver delivery manifests..." />;

  const activeTrip = trips[0];

  return (
    <div>
      {/* Header Profile Strip */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Driver Route Console</h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Assigned vehicle, stops sequence, and offline-cached manifests
        </span>
      </div>

      {/* Driver Info Profile Badge */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '0.85rem 1rem',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: '#025E4C',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '0.9rem'
          }}>
            {user?.name?.charAt(0) || 'D'}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', margin: 0 }}>{user?.name || 'Fleet Driver'}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Depot: <strong>{user?.depot || 'Central Hub'}</strong> • Status: <span style={{ color: '#059669', fontWeight: 700 }}>On Duty</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {user?.assignedVehicle && (
            <div style={{
              backgroundColor: '#F1F5F9',
              padding: '0.35rem 0.65rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--primary-green)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}>
              <Truck size={14} />
              <span>Vehicle: {user.assignedVehicle.vehicleId || 'Linked'}</span>
            </div>
          )}

          <button
            onClick={() => navigate('/driver/profile')}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: 'var(--text-primary)',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            Manage Profile
            <ArrowRight size={12} />
          </button>
        </div>
      </div>

      <OfflineBanner
        isOffline={isOffline}
        pendingCount={pendingCount}
        isSyncing={syncStatus === 'SYNCING'}
      />

      {cached && (
        <div style={{
          backgroundColor: '#ECFDF5',
          border: '1px solid #A7F3D0',
          color: '#065F46',
          padding: '0.65rem 0.85rem',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          marginBottom: '1rem',
          fontWeight: 600
        }}>
          <DownloadCloud size={16} />
          <span>Route data is pre-cached on this device for offline operation.</span>
        </div>
      )}

      {trips.length === 0 ? (
        <EmptyState
          title="No active route assigned today"
          message={`No published delivery run found for ${user?.name || 'your profile'} at ${user?.depot || 'your depot'}. When the dispatcher schedules and releases a trip run for your vehicle or depot, it will appear here.`}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {trips.map((trip) => (
            <Card key={trip._id} style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    backgroundColor: '#E8F5EE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary-green)'
                  }}>
                    <Truck size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>{trip.tripRef}</h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Vehicle: <strong>{trip.vehicle?.vehicleId}</strong> • Shift #{trip.tripNumber || 1}
                    </span>
                  </div>
                </div>
                <Badge status={trip.status} />
              </div>

              {/* Stops Count & Metrics */}
              <div style={{
                backgroundColor: '#F8FAFC',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.5rem',
                textAlign: 'center',
                marginBottom: '1.25rem',
                fontSize: '0.8rem'
              }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Stops</span>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{trip.orders?.length || 0}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Load Weight</span>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{trip.totalWeightKg || 0} kg</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Distance</span>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>~{trip.estimatedDistanceKm || 25} km</div>
                </div>
              </div>

              {/* Start / View Stops CTA */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                {(trip.status === 'READY' || trip.status === 'READY_FOR_LOADING') && (
                  <button
                    className="btn-primary driver-action-btn"
                    style={{ flex: 1, backgroundColor: '#025E4C' }}
                    onClick={async () => {
                      try {
                        await driverApi.startTrip(trip._id);
                        loadRoute();
                      } catch (e) {
                        alert(e.message || 'Failed to start trip run');
                      }
                    }}
                  >
                    <Compass size={20} />
                    <span>Start Delivery Run</span>
                  </button>
                )}

                <button
                  type="button"
                  className="btn-secondary driver-action-btn"
                  style={{
                    flex: 1,
                    backgroundColor: previewTripId === trip._id ? '#EFF6FF' : '#FFFFFF',
                    borderColor: previewTripId === trip._id ? '#2563EB' : 'var(--border)',
                    color: previewTripId === trip._id ? '#1D4ED8' : 'var(--text-primary)'
                  }}
                  onClick={() => setPreviewTripId(prev => prev === trip._id ? null : trip._id)}
                >
                  <Map size={18} />
                  <span>{previewTripId === trip._id ? 'Hide Route Map' : 'Preview Route Map'}</span>
                </button>

                <button
                  className="btn-secondary driver-action-btn"
                  style={{ flex: 1 }}
                  onClick={() => navigate(`/driver/trips/${trip._id}/stops`)}
                >
                  <span>In-Cab Cockpit ({trip.orders?.length || 0} Drops)</span>
                  <ArrowRight size={20} />
                </button>
              </div>

              {/* Collapsible Interactive Map Preview */}
              {previewTripId === trip._id && (
                <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Navigation size={16} color="var(--primary-green)" />
                      <span>Day Route Geographic Overview ({trip.orders?.length || 0} sequenced stops)</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      Depot: <strong>{trip.vehicle?.depot || user?.depot || 'Peliyagoda'}</strong>
                    </span>
                  </div>

                  <DriverRouteMap
                    stops={(trip.orders || []).map((o, idx) => ({
                      _id: o.order?._id || `stop-${idx}`,
                      stopSequence: idx + 1,
                      status: trip.status === 'COMPLETED' ? 'DELIVERED' : 'PENDING',
                      outlet: o.order?.outlet || {},
                      order: o.order || {}
                    }))}
                    depot={trip.vehicle?.depot || user?.depot || 'Peliyagoda'}
                    height="320px"
                  />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
