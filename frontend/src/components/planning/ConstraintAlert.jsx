import React from 'react';
import { AlertTriangle, XCircle, ShieldAlert } from 'lucide-react';

export const ConstraintAlert = ({ violations = [], recommendedVehicles = [], onReassign, onDefer }) => {
  if (!violations || violations.length === 0) return null;

  return (
    <div style={{
      backgroundColor: '#FEF2F2',
      border: '1px solid #FECACA',
      borderRadius: 'var(--radius-md)',
      padding: '1rem',
      marginBottom: '1rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#991B1B', fontWeight: 700, marginBottom: '0.5rem' }}>
        <ShieldAlert size={20} />
        <span>Constraint Violations Detected ({violations.length})</span>
      </div>

      <ul style={{ listStyleType: 'none', padding: 0, margin: '0 0 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {violations.map((v, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', fontSize: '0.85rem', color: '#B91C1C' }}>
            <XCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>[{v.code}]:</strong> {v.message}
            </div>
          </li>
        ))}
      </ul>

      {recommendedVehicles.length > 0 && (
        <div style={{
          backgroundColor: '#FFFFFF',
          padding: '0.75rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid #E2E8F0',
          marginBottom: '0.75rem'
        }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#025E4C' }}>
            Recommended Compatible Vehicles:
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
            {recommendedVehicles.map((veh) => (
              <span key={veh._id} style={{
                fontSize: '0.75rem',
                backgroundColor: '#E8F5EE',
                color: '#025E4C',
                padding: '0.2rem 0.5rem',
                borderRadius: 'var(--radius-full)',
                fontWeight: 600
              }}>
                {veh.vehicleId} ({veh.type} - {veh.temp})
              </span>
            ))}
          </div>
        </div>
      )}

      {(onReassign || onDefer) && (
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          {onDefer && (
            <button
              onClick={onDefer}
              style={{
                fontSize: '0.8rem',
                padding: '0.4rem 0.85rem',
                backgroundColor: '#FEF3C7',
                color: '#92400E',
                border: '1px solid #FCD34D',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600
              }}
            >
              Send to Deferrals
            </button>
          )}
          {onReassign && (
            <button
              onClick={onReassign}
              style={{
                fontSize: '0.8rem',
                padding: '0.4rem 0.85rem',
                backgroundColor: '#025E4C',
                color: '#FFFFFF',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600
              }}
            >
              Choose Compatible Vehicle
            </button>
          )}
        </div>
      )}
    </div>
  );
};
