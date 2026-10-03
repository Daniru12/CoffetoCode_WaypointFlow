import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { driverApi } from '../../api/driver.api';
import { syncApi } from '../../api/sync.api';
import { syncManager } from '../../offline/syncManager';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Truck, Compass, MapPin, CheckCircle, ArrowRight, DownloadCloud } from 'lucide-react';
import { useOffline } from '../../hooks/useOffline';
import { useSyncQueue } from '../../hooks/useSyncQueue';
import { OfflineBanner } from '../../components/driver/OfflineBanner';

export const TodayRoute = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cached, setCached] = useState(false);
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
          message="When the dispatcher schedules and publishes a delivery run for your vehicle, stops will appear here."
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
              <button
                className="btn-primary driver-action-btn"
                onClick={() => navigate(`/driver/trips/${trip._id}/stops`)}
              >
                <span>Navigate & View Stops</span>
                <ArrowRight size={20} />
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
