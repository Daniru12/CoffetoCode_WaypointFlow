import React from 'react';

export const Card = ({ title, subtitle, action, children, style = {}, className = '' }) => {
  return (
    <div className={`wf-card ${className}`} style={style}>
      {(title || action) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.25rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid var(--border)'
        }}>
          <div>
            {title && <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{title}</h3>}
            {subtitle && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
