import React from 'react';
import { Badge } from '../common/Badge';

export const OrderCard = ({ order, onClick }) => {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '1rem',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: '#FFFFFF',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all var(--transition-fast)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
        <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{order.orderRef}</span>
        <Badge status={order.status} />
      </div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        {order.outlet?.name || order.outlet?.outletId} ({order.outlet?.district})
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
        {order.orderUnits} units • {order.orderWeightKg}kg • {order.brand} ({order.tempRequirement})
      </div>
    </div>
  );
};
