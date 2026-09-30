import React from 'react';

export const LoadingSpinner = ({ text = 'Loading data...', size = 32 }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem' }}>
      <div style={{
        width: `${size}px`,
        height: `${size}px`,
        border: '3px solid #E2E8F0',
        borderTopColor: 'var(--primary-green)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        marginBottom: '0.75rem'
      }} />
      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
        {text}
      </span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
