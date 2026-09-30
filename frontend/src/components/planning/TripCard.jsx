import React from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Truck, MapPin, Clock, User, Package, AlertCircle } from 'lucide-react';

export const TripCard = ({ trip, onSelect, isSelected = false }) => {
  const vehicle = trip.vehicle || {};
  const driver = trip.driver || {};
  const stops = trip.stops || [];

  const weightUtil = vehicle.maxWeightKg
    ? Math.round(((trip.totalWeightKg || 0) / vehicle.maxWeightKg) * 100)
    : 0;
  const volumeUtil = vehicle.maxVolumeCbm
    ? Math.round(((trip.totalVolumeCbm || 0) / vehicle.maxVolumeCbm) * 100)
    : 0;

  return (
    <Card
      className={`trip-card ${isSelected ? 'border-primary' : ''}`}
      style={{
        border: isSelected ? '2px solid var(--primary-green)' : '1px solid var(--border)',
        cursor: onSelect ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        boxShadow: isSelected ? '0 4px 12px rgba(2, 94, 76, 0.12)' : 'var(--shadow-sm)'
      }}
      onClick={() => onSelect && onSelect(trip)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 800, color: 'var(--primary-green)', fontSize: '1rem' }}>
              Trip #{trip.tripNumber || 1}
            </span>
            <Badge status={trip.status || 'SCHEDULED'} />
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Truck size={14} />
            <span>{vehicle.vehicleNumber || 'Unassigned Vehicle'} ({vehicle.type || 'Standard'})</span>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Clock size={13} />
            <span>{trip.departureTime ? new Date(trip.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD'}</span>
          </div>
          {driver.name && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <User size={12} />
              <span>{driver.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Utilization Bars */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem', background: '#F8FAFC', padding: '0.6rem', borderRadius: 'var(--radius-sm)' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Weight:</span>
            <span style={{ fontWeight: 700, color: weightUtil > 100 ? 'var(--error)' : 'inherit' }}>
              {trip.totalWeightKg || 0} / {vehicle.maxWeightKg || 0} kg ({weightUtil}%)
            </span>
          </div>
          <div style={{ height: '5px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.min(weightUtil, 100)}%`,
                height: '100%',
                backgroundColor: weightUtil > 100 ? 'var(--error)' : weightUtil > 85 ? 'var(--warning)' : 'var(--primary-green)'
              }}
            />
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Volume:</span>
            <span style={{ fontWeight: 700, color: volumeUtil > 100 ? 'var(--error)' : 'inherit' }}>
              {trip.totalVolumeCbm || 0} / {vehicle.maxVolumeCbm || 0} m³ ({volumeUtil}%)
            </span>
          </div>
          <div style={{ height: '5px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.min(volumeUtil, 100)}%`,
                height: '100%',
                backgroundColor: volumeUtil > 100 ? 'var(--error)' : volumeUtil > 85 ? 'var(--warning)' : 'var(--primary-green)'
              }}
            />
          </div>
        </div>
      </div>

      {/* Stop Pills */}
      <div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <MapPin size={12} />
          <span>{stops.length} Deliveries scheduled in sequence:</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
          {stops.map((stop, idx) => (
            <span
              key={stop._id || idx}
              style={{
                fontSize: '0.75rem',
                padding: '0.2rem 0.5rem',
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <strong style={{ color: 'var(--primary-green)' }}>{idx + 1}.</strong>
              {stop.outlet?.name || stop.order?.outlet?.name || `Stop #${idx + 1}`}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
};
