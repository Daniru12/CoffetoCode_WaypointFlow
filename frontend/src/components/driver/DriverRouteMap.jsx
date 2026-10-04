import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Navigation, Crosshair, MapPin, ZoomIn, ZoomOut, Compass } from 'lucide-react';

const DEPOT_COORDS = {
  Peliyagoda: [6.9654, 79.8942],
  Kandy: [7.2906, 80.6337],
  Default: [6.9271, 79.8612]
};

// Brand color palette
const BRAND_COLORS = {
  Fresh: '#059669', // Emerald
  Style: '#D97706', // Amber
  Tech: '#4F46E5',  // Indigo
  Default: '#2563EB'
};

export const DriverRouteMap = ({
  stops = [],
  activeStopId = null,
  onSelectStop = () => {},
  depot = 'Peliyagoda',
  height = '360px',
  interactive = true,
  onLocationUpdate = null
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const polylineRef = useRef(null);
  const activePolylineRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const driverCircleRef = useRef(null);

  const [driverPos, setDriverPos] = useState(null);
  const [gpsTracking, setGpsTracking] = useState(false);
  const [gpsError, setGpsError] = useState(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const depotPos = DEPOT_COORDS[depot] || DEPOT_COORDS.Peliyagoda;
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView(depotPos, 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    setTimeout(() => {
      if (map) map.invalidateSize();
    }, 200);

    return () => {
      // Map cleanup on unmount handled gracefully
    };
  }, []);

  // Plot Depot, Stops, and Route Polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear previous stop markers and polylines
    Object.values(markersRef.current).forEach(m => map.removeLayer(m));
    markersRef.current = {};

    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }
    if (activePolylineRef.current) {
      map.removeLayer(activePolylineRef.current);
      activePolylineRef.current = null;
    }

    const depotPos = DEPOT_COORDS[depot] || DEPOT_COORDS.Peliyagoda;
    const allCoords = [depotPos];

    // 1. Depot Marker
    const depotIcon = L.divIcon({
      className: 'driver-map-depot-marker',
      html: `
        <div style="
          background-color: #022F26;
          color: #FFFFFF;
          padding: 4px 8px;
          border-radius: 6px;
          font-weight: 800;
          font-size: 11px;
          border: 2px solid #FFFFFF;
          box-shadow: 0 2px 8px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          gap: 4px;
          white-space: nowrap;
        ">
          <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background-color: #10B981;"></span>
          ${depot} Hub
        </div>
      `,
      iconSize: [100, 24],
      iconAnchor: [50, 12]
    });

    const depotMarker = L.marker(depotPos, { icon: depotIcon })
      .addTo(map)
      .bindPopup(`<b>${depot} Distribution Center</b><br/>Trip Dispatch Origin & Inventory Base`);
    markersRef.current['depot'] = depotMarker;

    // 2. Stop Markers
    stops.forEach((stop, index) => {
      const outlet = stop.outlet || {};
      const lat = outlet.latitude;
      const lng = outlet.longitude;

      if (!lat || !lng) return;

      const pos = [lat, lng];
      allCoords.push(pos);

      const isDelivered = stop.status === 'DELIVERED';
      const isArrived = stop.status === 'ARRIVED';
      const isActive = stop._id === activeStopId || isArrived;
      const brand = outlet.brand || 'Fresh';
      const brandColor = BRAND_COLORS[brand] || BRAND_COLORS.Default;
      const seq = stop.stopSequence || index + 1;

      // Custom Pin HTML
      let markerHtml = '';
      if (isDelivered) {
        markerHtml = `
          <div style="
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background-color: #059669;
            color: #FFFFFF;
            border: 2px solid #FFFFFF;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 800;
          ">
            ✓
          </div>
        `;
      } else if (isActive) {
        markerHtml = `
          <div style="
            position: relative;
            width: 38px;
            height: 38px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              position: absolute;
              width: 38px;
              height: 38px;
              border-radius: 50%;
              background-color: rgba(37, 99, 235, 0.35);
              animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>
            <div style="
              width: 30px;
              height: 30px;
              border-radius: 50%;
              background-color: #2563EB;
              color: #FFFFFF;
              border: 3px solid #FFFFFF;
              box-shadow: 0 4px 12px rgba(37, 99, 235, 0.5);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 12px;
              font-weight: 800;
              z-index: 2;
            ">
              #${seq}
            </div>
          </div>
        `;
      } else {
        markerHtml = `
          <div style="
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background-color: ${brandColor};
            color: #FFFFFF;
            border: 2px solid #FFFFFF;
            box-shadow: 0 2px 6px rgba(0,0,0,0.25);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 800;
          ">
            ${seq}
          </div>
        `;
      }

      const stopIcon = L.divIcon({
        className: 'driver-map-stop-marker',
        html: markerHtml,
        iconSize: isActive ? [38, 38] : [28, 28],
        iconAnchor: isActive ? [19, 19] : [14, 14]
      });

      const marker = L.marker(pos, { icon: stopIcon }).addTo(map);

      // Popup Content
      const popupHtml = `
        <div style="font-family: sans-serif; font-size: 12px; min-width: 160px;">
          <div style="font-weight: 800; font-size: 13px; color: #0F172A; margin-bottom: 2px;">
            Stop #${seq}: ${outlet.name || outlet.outletId || 'Store'}
          </div>
          <div style="color: #64748B; margin-bottom: 4px;">
            ${outlet.district || ''} • <span style="font-weight: 700; color: ${brandColor};">${brand}</span>
          </div>
          <div style="font-size: 11px; background: #F1F5F9; padding: 4px 6px; border-radius: 4px; margin-bottom: 6px;">
            Window: <b>${outlet.windowOpenTime || '06:00'} - ${outlet.windowCloseTime || '08:00'}</b><br/>
            Cargo: <b>${stop.order?.orderUnits || 1} units (${stop.order?.orderWeightKg || 0} kg)</b>
          </div>
          ${outlet.parkingConstraint === 'van_only' ? '<div style="color: #B45309; font-weight: 700; font-size: 10px; margin-bottom: 6px;">⚠️ VAN-ONLY ACCESS DOCK</div>' : ''}
          <div style="color: #2563EB; font-weight: 700; font-size: 11px; cursor: pointer;">
            Status: ${stop.status}
          </div>
        </div>
      `;
      marker.bindPopup(popupHtml);

      marker.on('click', () => {
        onSelectStop(stop._id);
      });

      markersRef.current[stop._id] = marker;
    });

    // 3. Connect Route Polyline
    if (allCoords.length > 1) {
      polylineRef.current = L.polyline(allCoords, {
        color: '#025E4C',
        weight: 3.5,
        opacity: 0.75,
        dashArray: '6, 8',
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      // Fit map bounds to encompass all stops and depot
      const bounds = L.latLngBounds(allCoords);
      map.fitBounds(bounds, { padding: [35, 35], maxZoom: 15 });
    }
  }, [stops, activeStopId, depot]);

  // Focus on Active Stop
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !activeStopId) return;

    const activeStop = stops.find(s => s._id === activeStopId);
    if (activeStop?.outlet?.latitude && activeStop?.outlet?.longitude) {
      map.flyTo([activeStop.outlet.latitude, activeStop.outlet.longitude], 15, {
        duration: 1.2
      });

      const marker = markersRef.current[activeStopId];
      if (marker) {
        marker.openPopup();
      }
    }
  }, [activeStopId]);

  // Live Driver Geolocation
  const toggleGps = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser/device.');
      return;
    }

    if (gpsTracking) {
      setGpsTracking(false);
      return;
    }

    setGpsTracking(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setDriverPos(coords);
        if (onLocationUpdate) {
          onLocationUpdate({ latitude: coords[0], longitude: coords[1], accuracy: pos.coords.accuracy });
        }
        updateDriverMarker(coords, pos.coords.accuracy);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo(coords, 15, { duration: 1 });
        }
      },
      (err) => {
        setGpsError(err.message || 'Unable to retrieve GPS coordinates.');
        setGpsTracking(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const updateDriverMarker = (coords, accuracy) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!driverMarkerRef.current) {
      const driverIcon = L.divIcon({
        className: 'driver-gps-marker',
        html: `
          <div style="
            position: relative;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background-color: #2563EB;
            border: 3px solid #FFFFFF;
            box-shadow: 0 0 10px rgba(37, 99, 235, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="width: 8px; height: 8px; border-radius: 50%; background-color: #FFFFFF;"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      driverMarkerRef.current = L.marker(coords, { icon: driverIcon, zIndexOffset: 1000 }).addTo(map);
      driverMarkerRef.current.bindPopup('<b>Your Current Location (In Cab)</b>');
    } else {
      driverMarkerRef.current.setLatLng(coords);
    }

    // Accuracy Circle
    if (accuracy && accuracy < 500) {
      if (!driverCircleRef.current) {
        driverCircleRef.current = L.circle(coords, {
          radius: accuracy,
          color: '#3B82F6',
          fillColor: '#93C5FD',
          fillOpacity: 0.2,
          weight: 1
        }).addTo(map);
      } else {
        driverCircleRef.current.setLatLng(coords);
        driverCircleRef.current.setRadius(accuracy);
      }
    }
  };

  const fitAllRoute = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const depotPos = DEPOT_COORDS[depot] || DEPOT_COORDS.Peliyagoda;
    const allCoords = [depotPos];
    stops.forEach(s => {
      if (s.outlet?.latitude && s.outlet?.longitude) {
        allCoords.push([s.outlet.latitude, s.outlet.longitude]);
      }
    });

    if (driverPos) allCoords.push(driverPos);

    if (allCoords.length > 0) {
      map.fitBounds(L.latLngBounds(allCoords), { padding: [30, 30], maxZoom: 16 });
    }
  };

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: height,
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      border: '1px solid var(--border)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
    }}>
      {/* Map DOM Container */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Floating Map Controls */}
      <div style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        zIndex: 500
      }}>
        <button
          type="button"
          onClick={toggleGps}
          title="Track Live GPS Location"
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '8px',
            backgroundColor: gpsTracking ? '#2563EB' : '#FFFFFF',
            color: gpsTracking ? '#FFFFFF' : '#334155',
            border: '1px solid rgba(0,0,0,0.15)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <Crosshair size={18} />
        </button>

        <button
          type="button"
          onClick={fitAllRoute}
          title="Fit Whole Route Circuit"
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '8px',
            backgroundColor: '#FFFFFF',
            color: '#334155',
            border: '1px solid rgba(0,0,0,0.15)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <Compass size={18} />
        </button>
      </div>

      {/* Legend Ribbon */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        right: '10px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(4px)',
        padding: '6px 12px',
        borderRadius: '8px',
        fontSize: '0.72rem',
        color: '#475569',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '6px',
        zIndex: 500,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#022F26' }}></span>
            Depot Hub
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563EB' }}></span>
            Active Stop
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#059669' }}></span>
            Delivered
          </span>
        </div>

        <div style={{ fontWeight: 700, color: 'var(--primary-green)' }}>
          {stops.filter(s => s.status === 'DELIVERED').length}/{stops.length} Drops Complete
        </div>
      </div>

      {/* GPS Error Notification if applicable */}
      {gpsError && (
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          backgroundColor: '#FEE2E2',
          color: '#DC2626',
          padding: '4px 8px',
          borderRadius: '6px',
          fontSize: '0.72rem',
          fontWeight: 700,
          zIndex: 500
        }}>
          GPS: {gpsError}
        </div>
      )}
    </div>
  );
};
