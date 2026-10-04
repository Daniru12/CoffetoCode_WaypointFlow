import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { driverApi } from '../../api/driver.api';
import { syncQueue } from '../../offline/syncQueue';
import { syncManager } from '../../offline/syncManager';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { DriverRouteMap } from '../../components/driver/DriverRouteMap';
import {
  MapPin, Clock, ArrowLeft, CheckCircle, AlertTriangle, ShieldCheck,
  Navigation, ExternalLink, Compass, Phone, Maximize2, Minimize2,
  Layers, ChevronRight, AlertCircle, Sparkles
} from 'lucide-react';
import { useOffline } from '../../hooks/useOffline';
import { useSyncQueue } from '../../hooks/useSyncQueue';
import { OfflineBanner } from '../../components/driver/OfflineBanner';

// Haversine formula to compute distance in km
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

// Google Maps turn-by-turn intent
const openGoogleMapsNavigation = (outlet) => {
  if (!outlet) return;
  const name = encodeURIComponent(outlet.name || outlet.outletId || 'Delivery Store');

  if (outlet.latitude && outlet.longitude) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${outlet.latitude},${outlet.longitude}&destination_place_id=${name}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    const query = encodeURIComponent(`${outlet.name || outlet.outletId}, ${outlet.district || 'Sri Lanka'}`);
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

// Waze turn-by-turn intent
const openWazeNavigation = (outlet) => {
  if (!outlet?.latitude || !outlet?.longitude) return;
  const url = `https://waze.com/ul?ll=${outlet.latitude},${outlet.longitude}&navigate=yes`;
  window.open(url, '_blank', 'noopener,noreferrer');
};

export const CurrentStop = () => {
  const { tripId } = useParams();
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStopId, setSelectedStopId] = useState(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [viewMode, setViewMode] = useState('STANDARD'); // 'STANDARD', 'MAP_ONLY', 'LIST_ONLY'
  const [driverLocation, setDriverLocation] = useState(null);

  const { isOffline } = useOffline();
  const { pendingCount, syncStatus } = useSyncQueue();
  const navigate = useNavigate();

  useEffect(() => {
    loadStops();
  }, [tripId]);

  const loadStops = async () => {
    setLoading(true);
    try {
      if (navigator.onLine) {
        const res = await driverApi.getTripStops(tripId);
        const data = res.data || [];
        setStops(data);
        pickInitialActiveStop(data);
      } else {
        const cached = await syncManager.getCachedStopsForTrip(tripId);
        const data = cached || [];
        setStops(data);
        pickInitialActiveStop(data);
      }
    } catch (err) {
      console.warn('Network stops fetch failed, reading offline cache:', err.message);
      const cached = await syncManager.getCachedStopsForTrip(tripId);
      const data = cached || [];
      setStops(data);
      pickInitialActiveStop(data);
      if (!cached || cached.length === 0) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const pickInitialActiveStop = (allStops) => {
    if (!allStops || allStops.length === 0) return;
    // Default to the first stop that is ARRIVED or PENDING
    const nextStop = allStops.find(s => s.status === 'ARRIVED') || allStops.find(s => s.status === 'PENDING') || allStops[0];
    if (nextStop) {
      setSelectedStopId(nextStop._id);
    }
  };

  const handleArrive = async (deliveryId) => {
    try {
      if (navigator.onLine) {
        await driverApi.arriveDelivery(deliveryId);
      } else {
        await syncQueue.enqueue('DELIVERY_ARRIVED', deliveryId, { arrivedAt: new Date().toISOString() });
        setStops(prev => prev.map(s => (s._id === deliveryId ? { ...s, status: 'ARRIVED' } : s)));
      }
      loadStops();
    } catch (err) {
      console.error(err);
    }
  };

  const activeStop = useMemo(() => {
    return stops.find(s => s._id === selectedStopId) || stops.find(s => s.status !== 'DELIVERED') || stops[0];
  }, [stops, selectedStopId]);

  // Live distance and ETA from driver's GPS to active stop
  const navigationEstimate = useMemo(() => {
    if (!driverLocation || !activeStop?.outlet?.latitude || !activeStop?.outlet?.longitude) {
      return null;
    }
    const dist = calculateDistanceKm(
      driverLocation.latitude,
      driverLocation.longitude,
      activeStop.outlet.latitude,
      activeStop.outlet.longitude
    );
    if (dist === null) return null;
    const etaMins = Math.max(2, Math.round(dist * 2.2));
    return { distanceKm: dist, etaMinutes: etaMins };
  }, [driverLocation, activeStop]);

  if (loading) return <LoadingSpinner text="Retrieving in-cab route and GPS telemetry..." />;

  const completedCount = stops.filter(s => s.status === 'DELIVERED').length;
  const isAllCompleted = stops.length > 0 && stops.every(s => s.status === 'DELIVERED' || s.status === 'FAILED');

  return (
    <div>
      {/* Top Header & Navigation Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <button
          onClick={() => navigate('/driver/route')}
          className="btn-secondary"
          style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Runs</span>
        </button>

        {/* View Mode Toggle Controls */}
        <div style={{
          display: 'flex',
          backgroundColor: '#F1F5F9',
          borderRadius: '8px',
          padding: '2px',
          border: '1px solid var(--border)'
        }}>
          <button
            onClick={() => setViewMode('STANDARD')}
            style={{
              padding: '0.35rem 0.65rem',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: viewMode === 'STANDARD' ? '#FFFFFF' : 'transparent',
              fontWeight: viewMode === 'STANDARD' ? 700 : 500,
              fontSize: '0.75rem',
              color: viewMode === 'STANDARD' ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              boxShadow: viewMode === 'STANDARD' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Cockpit
          </button>
          <button
            onClick={() => setViewMode('MAP_ONLY')}
            style={{
              padding: '0.35rem 0.65rem',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: viewMode === 'MAP_ONLY' ? '#FFFFFF' : 'transparent',
              fontWeight: viewMode === 'MAP_ONLY' ? 700 : 500,
              fontSize: '0.75rem',
              color: viewMode === 'MAP_ONLY' ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              boxShadow: viewMode === 'MAP_ONLY' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Live Map
          </button>
          <button
            onClick={() => setViewMode('LIST_ONLY')}
            style={{
              padding: '0.35rem 0.65rem',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: viewMode === 'LIST_ONLY' ? '#FFFFFF' : 'transparent',
              fontWeight: viewMode === 'LIST_ONLY' ? 700 : 500,
              fontSize: '0.75rem',
              color: viewMode === 'LIST_ONLY' ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              boxShadow: viewMode === 'LIST_ONLY' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Manifest List
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Driver In-Cab Navigator</h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Interactive GPS route sequence, delivery windows & docking guidance
        </span>
      </div>

      <OfflineBanner
        isOffline={isOffline}
        pendingCount={pendingCount}
        isSyncing={syncStatus === 'SYNCING'}
      />

      {/* IN-CAB INTERACTIVE ROUTE MAP */}
      {viewMode !== 'LIST_ONLY' && (
        <div style={{ marginBottom: '1.25rem', position: 'relative' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 700 }}>
              <Navigation size={16} color="var(--primary-green)" />
              <span>Route Circuit Map & Sequence Target</span>
            </div>

            <button
              onClick={() => setMapExpanded(prev => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                border: 'none',
                background: 'none',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--primary-green)',
                cursor: 'pointer'
              }}
            >
              {mapExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              <span>{mapExpanded ? 'Standard View' : 'Expand Map'}</span>
            </button>
          </div>

          <DriverRouteMap
            stops={stops}
            activeStopId={activeStop?._id}
            onSelectStop={(id) => setSelectedStopId(id)}
            depot={stops[0]?.outlet?.depot || 'Peliyagoda'}
            height={viewMode === 'MAP_ONLY' ? '540px' : mapExpanded ? '460px' : '320px'}
            onLocationUpdate={(loc) => setDriverLocation(loc)}
          />
        </div>
      )}

      {/* ACTIVE TARGET STOP NAVIGATION HUD */}
      {activeStop && viewMode !== 'MAP_ONLY' && (
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-lg)',
          border: '2px solid #2563EB',
          padding: '1.25rem',
          marginBottom: '1.25rem',
          boxShadow: '0 4px 16px rgba(37, 99, 235, 0.12)'
        }}>
          {/* Target HUD Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1rem',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.4)'
              }}>
                #{activeStop.stopSequence || 1}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Active Target Destination
                  </span>
                  {activeStop.outlet?.parkingConstraint === 'van_only' && (
                    <span style={{
                      backgroundColor: '#FEF3C7',
                      color: '#B45309',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontSize: '0.65rem',
                      fontWeight: 800
                    }}>
                      VAN-ONLY DOCK
                    </span>
                  )}
                  {activeStop.outlet?.brand && (
                    <span style={{
                      backgroundColor: activeStop.outlet.brand === 'Fresh' ? '#DCFCE7' : activeStop.outlet.brand === 'Style' ? '#FEF3C7' : '#E0E7FF',
                      color: activeStop.outlet.brand === 'Fresh' ? '#15803D' : activeStop.outlet.brand === 'Style' ? '#B45309' : '#3730A3',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontSize: '0.65rem',
                      fontWeight: 800
                    }}>
                      {activeStop.outlet.brand}
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '2px 0 0 0', color: '#0F172A' }}>
                  {activeStop.outlet?.name || activeStop.outlet?.outletId}
                </h3>
              </div>
            </div>

            <Badge status={activeStop.status} />
          </div>

          {/* Location & Live Telemetry Bar */}
          <div style={{
            backgroundColor: '#F8FAFC',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem',
            fontSize: '0.8rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#475569' }}>
              <MapPin size={15} color="#2563EB" />
              <span>{activeStop.outlet?.district} • {activeStop.outlet?.address || 'Designated Receiving Dock'}</span>
            </div>

            {navigationEstimate ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#EFF6FF',
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid #BFDBFE',
                color: '#1D4ED8',
                fontWeight: 700,
                fontSize: '0.78rem'
              }}>
                <Compass size={14} />
                <span>{navigationEstimate.distanceKm} km away • ~{navigationEstimate.etaMinutes} mins drive</span>
              </div>
            ) : (
              <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                Window: <strong>{activeStop.outlet?.windowOpenTime || '06:00'} - {activeStop.outlet?.windowCloseTime || '08:00'}</strong>
              </div>
            )}
          </div>

          {/* Turn-by-Turn GPS Direction Launchers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '0.5rem',
            marginBottom: '1rem'
          }}>
            <button
              type="button"
              onClick={() => openGoogleMapsNavigation(activeStop.outlet)}
              style={{
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1.5px solid #2563EB',
                backgroundColor: '#EFF6FF',
                color: '#1D4ED8',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}
            >
              <Navigation size={16} />
              <span>Google Maps</span>
              <ExternalLink size={13} />
            </button>

            <button
              type="button"
              onClick={() => openWazeNavigation(activeStop.outlet)}
              style={{
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1.5px solid #0284C7',
                backgroundColor: '#F0F9FF',
                color: '#0369A1',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}
            >
              <Compass size={16} />
              <span>Waze App</span>
              <ExternalLink size={13} />
            </button>

            {activeStop.outlet?.contactPhone && (
              <a
                href={`tel:${activeStop.outlet.contactPhone}`}
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#334155',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem'
                }}
              >
                <Phone size={15} />
                <span>Call Store</span>
              </a>
            )}
          </div>

          {/* Primary In-Cab Delivery Action Buttons */}
          {activeStop.status !== 'DELIVERED' && (
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {activeStop.status !== 'ARRIVED' ? (
                <button
                  className="btn-primary driver-action-btn"
                  style={{ flex: 1.5, backgroundColor: '#025E4C' }}
                  onClick={() => handleArrive(activeStop._id)}
                >
                  <MapPin size={20} />
                  <span>Mark Arrived at Store</span>
                </button>
              ) : (
                <button
                  className="btn-primary driver-action-btn"
                  style={{ flex: 1.5, backgroundColor: '#2563EB' }}
                  onClick={() => navigate(`/driver/deliveries/${activeStop._id}/pod`)}
                >
                  <CheckCircle size={20} />
                  <span>Complete Delivery & POD</span>
                </button>
              )}

              <button
                className="btn-secondary"
                style={{ flex: 1, color: '#DC2626', borderColor: '#FECACA' }}
                onClick={() => navigate(`/driver/deliveries/${activeStop._id}/incident`)}
              >
                <AlertTriangle size={16} />
                <span>Report Issue / Delay</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* FULL MANIFEST SEQUENCE LIST */}
      {viewMode !== 'MAP_ONLY' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>
              All Route Manifest Stops ({completedCount} / {stops.length} Complete)
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Tap any stop to inspect on map
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {stops.map((stop, idx) => {
              const isSelected = stop._id === activeStop?._id;
              const isDelivered = stop.status === 'DELIVERED';
              const isArrived = stop.status === 'ARRIVED';

              return (
                <div
                  key={stop._id}
                  onClick={() => setSelectedStopId(stop._id)}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 'var(--radius-md)',
                    border: isSelected ? '2px solid #2563EB' : '1px solid var(--border)',
                    padding: '0.9rem 1rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 2px 8px rgba(37, 99, 235, 0.15)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: isDelivered ? '#059669' : isSelected ? '#2563EB' : '#F1F5F9',
                        color: isDelivered || isSelected ? '#FFFFFF' : '#475569',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.8rem'
                      }}>
                        {isDelivered ? '✓' : stop.stopSequence || idx + 1}
                      </span>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                            {stop.outlet?.name || stop.outlet?.outletId}
                          </span>
                          {stop.outlet?.parkingConstraint === 'van_only' && (
                            <span style={{ fontSize: '0.62rem', padding: '1px 5px', borderRadius: '3px', backgroundColor: '#FEF3C7', color: '#B45309', fontWeight: 800 }}>
                              VAN ONLY
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {stop.outlet?.district} • Window: {stop.outlet?.windowOpenTime || '06:00'} - {stop.outlet?.windowCloseTime || '08:00'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Badge status={stop.status} />
                      <ChevronRight size={16} color="#94A3B8" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All Stops Finished Banner */}
      {isAllCompleted && (
        <div style={{
          backgroundColor: '#ECFDF5',
          border: '2px solid #059669',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          textAlign: 'center',
          marginTop: '1.5rem'
        }}>
          <ShieldCheck size={42} color="#059669" style={{ margin: '0 auto 0.5rem' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem', color: '#065F46' }}>
            All Manifest Stops Completed!
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#047857', marginBottom: '1.25rem' }}>
            All delivery stops for this run have proof of delivery recorded. Return to base depot to complete trip shift.
          </p>
          <button
            className="btn-primary driver-action-btn"
            style={{ backgroundColor: '#025E4C', maxWidth: '300px', margin: '0 auto' }}
            onClick={async () => {
              try {
                await driverApi.completeTrip(tripId);
                navigate('/driver/route');
              } catch (e) {
                alert(e.message || 'Failed to complete trip');
              }
            }}
          >
            <span>Complete Run & Return Vehicle</span>
          </button>
        </div>
      )}
    </div>
  );
};
