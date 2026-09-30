import React from 'react';
import { Truck, ThermometerSnowflake, ShieldCheck, Fuel } from 'lucide-react';
import { Badge } from '../common/Badge';

export const VehicleCard = ({ vehicle, currentWeight = 0, currentVolume = 0, onSelect, isSelected = false }) => {
  const weightPercent = Math.min(100, Math.round((currentWeight / (vehicle.weightCapKg || 1)) * 100));
  const volumePercent = Math.min(100, Math.round((currentVolume / (vehicle.volumeCapM3 || 1)) * 100));

  return (
    <div
      onClick={onSelect}
      style={{
        backgroundColor: '#FFFFFF',
        border: `2px solid ${isSelected ? 'var(--primary-green)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem',
        cursor: onSelect ? 'pointer' : 'default',
        transition: 'all var(--transition-fast)',
        boxShadow: isSelected ? '0 0 0 3px rgba(2, 94, 76, 0.15)' : 'var(--shadow-sm)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            backgroundColor: vehicle.temp === 'reefer' ? '#EFF6FF' : '#F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: vehicle.temp === 'reefer' ? '#2563EB' : '#475569'
          }}>
            {vehicle.temp === 'reefer' ? <ThermometerSnowflake size={18} /> : <Truck size={18} />}
          </div>
          <div>
            <h4 style={{ fontSize: '0.95rem', margin: 0, fontWeight: 700 }}>{vehicle.vehicleId}</h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
              {vehicle.type} • {vehicle.temp}
            </span>
          </div>
        </div>
        <Badge status={vehicle.status} />
      </div>

      {/* Progress Bars for Weight & Volume */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
            <span>Weight Cap</span>
            <span style={{ fontWeight: 600, color: weightPercent > 90 ? '#DC2626' : 'inherit' }}>
              {currentWeight} / {vehicle.weightCapKg} kg ({weightPercent}%)
            </span>
          </div>
          <div style={{ width: '100%', height: '6px', backgroundColor: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{
              width: `${weightPercent}%`,
              height: '100%',
              backgroundColor: weightPercent > 90 ? '#DC2626' : 'var(--primary-green)',
              borderRadius: '999px'
            }} />
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
            <span>Volume Cap</span>
            <span style={{ fontWeight: 600, color: volumePercent > 90 ? '#DC2626' : 'inherit' }}>
              {currentVolume.toFixed(1)} / {vehicle.volumeCapM3} m³ ({volumePercent}%)
            </span>
          </div>
          <div style={{ width: '100%', height: '6px', backgroundColor: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{
              width: `${volumePercent}%`,
              height: '100%',
              backgroundColor: volumePercent > 90 ? '#DC2626' : '#2563EB',
              borderRadius: '999px'
            }} />
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '0.85rem',
        paddingTop: '0.65rem',
        borderTop: '1px solid #F1F5F9',
        fontSize: '0.75rem',
        color: 'var(--text-muted)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Fuel size={14} />
          <span>Fuel: {vehicle.fuelUsedThisWeek || 0} / {vehicle.weeklyFuelQuotaL || 200}L</span>
        </div>
        <span>{vehicle.depot} Depot</span>
      </div>
    </div>
  );
};
