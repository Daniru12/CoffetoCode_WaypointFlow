import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export const LiveMap = ({ vehicles = [], outlets = [], center = [6.9271, 79.8612], zoom = 12 }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView(center, zoom);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.CircleMarker) {
        map.removeLayer(layer);
      }
    });

    // Render Depot (Peliyagoda)
    const depotIcon = L.divIcon({
      className: 'custom-depot-marker',
      html: `<div style="background-color: #022F26; color: white; padding: 4px 8px; border-radius: 6px; font-weight: 800; font-size: 11px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">Peliyagoda Hub</div>`,
      iconSize: [90, 24]
    });
    L.marker([6.9654, 79.8942], { icon: depotIcon })
      .addTo(map)
      .bindPopup('<b>Central Dispatch Depot: Peliyagoda</b><br>Waypoint Distribution Hub');

    // Render Vehicles
    vehicles.forEach((v) => {
      const lat = v.latestLocation?.latitude || 6.9271;
      const lng = v.latestLocation?.longitude || 79.8612;

      const vehicleMarker = L.circleMarker([lat, lng], {
        radius: 9,
        fillColor: '#025E4C',
        color: '#FFFFFF',
        weight: 3,
        opacity: 1,
        fillOpacity: 0.95
      }).addTo(map);

      vehicleMarker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px;">
          <b>Vehicle: ${v.vehicle?.vehicleId || 'Active Unit'}</b><br/>
          Trip: ${v.tripRef || 'En Route'}<br/>
          Status: <span style="color: #025E4C; font-weight: bold;">${v.status || 'Active'}</span><br/>
          Driver: ${v.driver?.name || 'Assigned Driver'}
        </div>
      `);
    });

    // Render Outlets
    outlets.forEach((o) => {
      if (o.latitude && o.longitude) {
        const outletMarker = L.circleMarker([o.latitude, o.longitude], {
          radius: 6,
          fillColor: o.brand === 'Fresh' ? '#059669' : o.brand === 'Style' ? '#DB2777' : '#4F46E5',
          color: '#FFFFFF',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.85
        }).addTo(map);

        outletMarker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px;">
            <b>${o.name || o.outletId}</b><br/>
            Brand: ${o.brand}<br/>
            District: ${o.district}<br/>
            Dock: ${o.parkingConstraint || 'normal'}
          </div>
        `);
      }
    });

    return () => {
      // cleanup if unmounted
    };
  }, [vehicles, outlets]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '420px', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '420px' }} />
    </div>
  );
};
