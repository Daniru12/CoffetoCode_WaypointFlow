import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

export const ErrorState = ({ title = 'Something went wrong', message, onRetry }) => {
  return (
    <div style={{
      textAlign: 'center',
      padding: '2.5rem 1.5rem',
      backgroundColor: '#FEF2F2',
      border: '1px solid #FECACA',
      borderRadius: 'var(--radius-lg)',
      color: '#991B1B'
    }}>
      <AlertCircle size={36} style={{ margin: '0 auto 0.5rem', color: '#DC2626' }} />
      <h4 style={{ fontSize: '1.1rem', margin: '0 0 0.25rem' }}>{title}</h4>
      {message && <p style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>{message}</p>}
      {onRetry && (
        <button className="btn-secondary" onClick={onRetry} style={{ margin: '0 auto' }}>
          <RotateCcw size={14} />
          <span>Try Again</span>
        </button>
      )}
    </div>
  );
};
