import React from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Truck, MapPin, Clock, AlertTriangle, Thermometer, CheckCircle2 } from 'lucide-react';

export const VehicleProgressCard = ({ vehicle, onSelect, isSelected = false }) => {
  const currentTrip = vehicle.currentTrip || {};
  const activeStop = currentTrip.currentStop || {};
  const isReefer = vehicle.type === 'CHILLED_VAN' || vehicle.type === 'CHILLED_TRUCK' || vehicle.isRefrigerated;

  return (
    <Card
      style={{
        border: isSelected ? '2px solid var(--primary-green)' : '1px solid var(--border)',
        cursor: onSelect ? 'pointer' : 'default',
        padding: '1rem',
        marginBottom: '0.75rem',
        transition: 'all 0.2s ease'
      }}
      onClick={() => onSelect && onSelect(vehicle)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)' }}>
              {vehicle.vehicleNumber}
            </span>
            <Badge status={vehicle.status || 'AVAILABLE'} />
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {vehicle.model || vehicle.type} • Depot: {vehicle.depot || 'Central'}
          </span>
        </div>

        {isReefer && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.2rem',
            backgroundColor: '#EFF6FF',
            color: '#1D4ED8',
            padding: '0.2rem 0.4rem',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 600
          }}>
            <Thermometer size={13} />
            <span>{vehicle.currentTemp !== undefined ? `${vehicle.currentTemp}°C` : '4.2°C'}</span>
          </div>
        )}
      </div>

      {vehicle.driver && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
          Driver: <strong>{vehicle.driver.name}</strong> ({vehicle.driver.phone || 'Active'})
        </div>
      )}

      {currentTrip._id ? (
        <div style={{ backgroundColor: '#F8FAFC', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.3rem' }}>
            <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <Clock size={12} />
              <span>Current Stop:</span>
            </span>
            <strong style={{ color: 'var(--primary-green)' }}>
              {activeStop.outletName || 'En Route'}
            </strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Progress:</span>
            <span>
              {currentTrip.completedStops || 0} of {currentTrip.totalStops || 0} stops delivered
            </span>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          No active delivery run assigned
        </div>
      )}
    </Card>
  );
};
