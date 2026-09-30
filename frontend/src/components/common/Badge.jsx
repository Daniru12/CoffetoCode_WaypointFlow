import React from 'react';

export const Badge = ({ status, text, type = 'status' }) => {
  const normalized = (status || text || 'PENDING').toLowerCase().replace(/\s+/g, '_');

  const getStyleClass = () => {
    switch (normalized) {
      case 'scheduled':
      case 'planned':
      case 'ready':
        return 'badge-scheduled';
      case 'delivered':
      case 'completed':
      case 'synced':
      case 'closed':
        return 'badge-delivered';
      case 'pending':
      case 'draft':
      case 'confirmed':
        return 'badge-pending';
      case 'deferred':
        return 'badge-deferred';
      case 'in_progress':
      case 'in_transit':
      case 'loading':
      case 'out_for_delivery':
      case 'shortfall':
      case 'issue_reported':
      case 'failed':
      case 'conflict':
        return 'badge-in_progress';
      case 'offline':
        return 'badge-offline';
      case 'fresh':
        return 'badge-fresh';
      case 'style':
        return 'badge-style';
      case 'tech':
        return 'badge-tech';
      default:
        return 'badge-pending';
    }
  };

  return (
    <span className={`badge ${getStyleClass()}`}>
      {text || status?.replace(/_/g, ' ')}
    </span>
  );
};
