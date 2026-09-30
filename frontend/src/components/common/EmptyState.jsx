import React from 'react';
import { PackageOpen } from 'lucide-react';

export const EmptyState = ({ title = 'No records found', message = 'No data currently matches your selection.', icon: Icon = PackageOpen, action }) => {
  return (
    <div style={{
      textAlign: 'center',
      padding: '3.5rem 1.5rem',
      backgroundColor: '#FFFFFF',
      borderRadius: 'var(--radius-lg)',
      border: '1px dashed var(--border)'
    }}>
      <div style={{
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        backgroundColor: '#F1F5F9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 1rem',
        color: '#64748B'
      }}>
        <Icon size={28} />
      </div>
      <h4 style={{ fontSize: '1.1rem', margin: '0 0 0.4rem', color: 'var(--text-primary)' }}>{title}</h4>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto 1.25rem' }}>{message}</p>
      {action && <div>{action}</div>}
    </div>
  );
};
