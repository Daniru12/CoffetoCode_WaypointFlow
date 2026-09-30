import React from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { MapPin, Clock, Phone, AlertTriangle, CheckCircle, Navigation } from 'lucide-react';

export const RouteStopCard = ({
  stop,
  index,
  onArrive,
  onComplete,
  onReportIssue,
  isCurrent = false
}) => {
  const isDelivered = stop.status === 'DELIVERED';
  const isArrived = stop.status === 'ARRIVED';
  const outlet = stop.outlet || stop.order?.outlet || {};

  return (
    <Card
      style={{
        border: isCurrent ? '2px solid var(--primary-green)' : '1px solid var(--border)',
        boxShadow: isCurrent ? '0 4px 14px rgba(2, 94, 76, 0.15)' : 'var(--shadow-sm)',
        padding: '1.25rem'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: isDelivered ? '#025E4C' : isCurrent ? '#B9E1C9' : '#E2E8F0',
              color: isDelivered ? '#FFFFFF' : '#022F26',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.9rem'
            }}
          >
            {stop.stopSequence || index + 1}
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
              {outlet.name || `Outlet #${stop.outletId || stop.order?.outletId}`}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {outlet.district || 'Metro'} • Brand: {stop.order?.brand || 'Standard'}
            </span>
          </div>
        </div>

        <Badge status={stop.status || 'SCHEDULED'} />
      </div>

      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <MapPin size={14} color="#64748B" />
          <span>{outlet.address || 'Colombo Distribution Corridor'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Clock size={14} color="#64748B" />
          <span>Delivery Window: <strong>{stop.order?.deliveryWindow || '09:00 - 12:00'}</strong></span>
        </div>
        {outlet.contactPerson && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Phone size={14} color="#64748B" />
            <span>{outlet.contactPerson} ({outlet.phone || 'Store Rep'})</span>
          </div>
        )}
      </div>

      {/* Cargo summary */}
      <div style={{ backgroundColor: '#F8FAFC', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.8rem' }}>
        Order: <strong>{stop.order?.orderNumber || stop.orderId}</strong> • Items: {stop.itemsCount || 1} • Weight: {stop.order?.totalWeightKg || 25} kg
      </div>

      {/* Action Buttons for Driver Safe-Stopped Workflow */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {!isDelivered && !isArrived && (
          <button
            onClick={() => onArrive && onArrive(stop)}
            className="btn-primary"
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <Navigation size={16} />
            <span>Mark Arrived</span>
          </button>
        )}

        {isArrived && !isDelivered && (
          <button
            onClick={() => onComplete && onComplete(stop)}
            className="btn-primary"
            style={{ flex: 1, justifyContent: 'center', backgroundColor: '#025E4C' }}
          >
            <CheckCircle size={16} />
            <span>Confirm Delivery (POD)</span>
          </button>
        )}

        {!isDelivered && (
          <button
            onClick={() => onReportIssue && onReportIssue(stop)}
            className="btn-secondary"
            style={{ color: 'var(--error)', borderColor: '#FCA5A5' }}
          >
            <AlertTriangle size={15} />
            <span>Incident</span>
          </button>
        )}
      </div>
    </Card>
  );
};
