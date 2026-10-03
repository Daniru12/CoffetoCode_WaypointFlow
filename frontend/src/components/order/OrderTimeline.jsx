import React from 'react';
import { CheckCircle2, Clock, Truck, Package, AlertCircle } from 'lucide-react';

const steps = [
  { key: 'CONFIRMED', label: 'Order Placed', desc: 'Cutoff verified' },
  { key: 'SCHEDULED', label: 'Plan Scheduled', desc: 'Vehicle assigned' },
  { key: 'LOADING', label: 'Bay Loading', desc: 'Items checked' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', desc: 'Driver en route' },
  { key: 'DELIVERED', label: 'Delivered', desc: 'POD & Receipt confirmed' }
];

export const OrderTimeline = ({ status = 'CONFIRMED' }) => {
  const getStepIndex = (st) => {
    switch (st) {
      case 'DRAFT': return 0;
      case 'CONFIRMED': return 0;
      case 'PLANNING':
      case 'SCHEDULED':
      case 'PLANNED': return 1;
      case 'LOADING': return 2;
      case 'OUT_FOR_DELIVERY': return 3;
      case 'DELIVERED':
      case 'CLOSED': return 4;
      default: return 0;
    }
  };

  const currentIndex = getStepIndex(status);
  const isDeferred = status === 'DEFERRED';
  const hasIssue = status === 'ISSUE_REPORTED';

  return (
    <div style={{ padding: '1.25rem 0' }}>
      {isDeferred && (
        <div style={{
          backgroundColor: '#FEF3C7',
          color: '#92400E',
          padding: '0.75rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem',
          fontWeight: 600
        }}>
          <AlertCircle size={18} />
          <span>This order has been deferred to the next operational cycle.</span>
        </div>
      )}

      {hasIssue && (
        <div style={{
          backgroundColor: '#FEE2E2',
          color: '#991B1B',
          padding: '0.75rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem',
          fontWeight: 600
        }}>
          <AlertCircle size={18} />
          <span>Delivery issue reported (Damage / Quantity Discrepancy).</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
        {/* Connecting bar */}
        <div style={{
          position: 'absolute',
          top: '18px',
          left: '20px',
          right: '20px',
          height: '3px',
          backgroundColor: '#E2E8F0',
          zIndex: 1
        }}>
          <div style={{
            height: '100%',
            backgroundColor: '#025E4C',
            width: `${(currentIndex / (steps.length - 1)) * 100}%`,
            transition: 'width 0.4s ease'
          }} />
        </div>

        {steps.map((step, idx) => {
          const isDone = idx <= currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, textAlign: 'center', width: '90px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: isDone ? '#025E4C' : '#FFFFFF',
                border: `3px solid ${isDone ? '#025E4C' : '#CBD5E1'}`,
                color: isDone ? '#FFFFFF' : '#94A3B8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.5rem',
                boxShadow: isCurrent ? '0 0 0 4px rgba(2, 94, 76, 0.2)' : 'none'
              }}>
                {isDone ? <CheckCircle2 size={18} /> : <Clock size={16} />}
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: isDone ? 700 : 500, color: isDone ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {step.label}
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                {step.desc}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
