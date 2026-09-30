import React, { useState, useEffect } from 'react';
import { trackingApi } from '../../api/tracking.api';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { LiveMap } from '../../components/tracking/LiveMap';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Truck, MapPin, AlertTriangle, Radio } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';

export const LiveTracking = () => {
  const [liveUnits, setLiveUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  useEffect(() => {
    loadLiveFleet();

    if (socket) {
      socket.on('driver.location', (loc) => {
        // update unit position in real-time
        setLiveUnits((prev) =>
          prev.map((unit) => {
            if (unit.driver?._id === loc.driver || unit.vehicle?._id === loc.vehicle) {
              return {
                ...unit,
                latestLocation: {
                  latitude: loc.latitude,
                  longitude: loc.longitude,
                  recordedAt: loc.recordedAt
                }
              };
            }
            return unit;
          })
        );
      });

      socket.on('delivery.arrived', () => loadLiveFleet());
      socket.on('delivery.completed', () => loadLiveFleet());
      socket.on('vehicle.breakdown', () => loadLiveFleet());
    }

    const interval = setInterval(loadLiveFleet, 15000);
    return () => clearInterval(interval);
  }, [socket]);

  const loadLiveFleet = async () => {
    try {
      const res = await trackingApi.getLiveTracking();
      setLiveUnits(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Live Fleet Operations & Map</h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Real-time GPS telemetry, delivery ETA monitoring, and incident oversight
          </span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.4rem 0.85rem',
          backgroundColor: '#ECFDF5',
          color: '#065F46',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.8rem',
          fontWeight: 700
        }}>
          <Radio size={16} />
          <span>Live Tracking Active ({liveUnits.length} Vehicles)</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Interactive Map View */}
        <Card title="Fleet Route & GPS Positioning" style={{ padding: '0.5rem' }}>
          <LiveMap vehicles={liveUnits} />
        </Card>

        {/* Active Vehicles List */}
        <Card title="Active En Route Units">
          {loading ? (
            <LoadingSpinner text="Connecting telemetry..." />
          ) : liveUnits.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              No vehicles currently in transit.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '500px', overflowY: 'auto' }}>
              {liveUnits.map((unit) => (
                <div
                  key={unit.tripId}
                  style={{
                    padding: '0.85rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{unit.vehicle?.vehicleId || 'Vehicle'}</span>
                    <Badge status={unit.status} />
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Driver: <strong>{unit.driver?.name || 'Assigned Driver'}</strong> • Trip: {unit.tripRef}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <MapPin size={12} />
                    <span>
                      {unit.latestLocation?.latitude?.toFixed(4)}, {unit.latestLocation?.longitude?.toFixed(4)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
