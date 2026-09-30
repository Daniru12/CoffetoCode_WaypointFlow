import React from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { CheckSquare, Square, AlertTriangle, ArrowDown } from 'lucide-react';

export const LoadingChecklist = ({
  items = [],
  onToggleItem,
  onReportIssue
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.65rem 0.85rem',
        backgroundColor: '#F0FDF4',
        border: '1px solid #BBF7D0',
        borderRadius: 'var(--radius-md)',
        color: '#166534',
        fontSize: '0.85rem',
        fontWeight: 600
      }}>
        <ArrowDown size={16} />
        <span>LIFO Order: Pack items for the LAST stop first at the front of the vehicle cargo bed.</span>
      </div>

      {items.map((item, idx) => {
        const isLoaded = item.status === 'LOADED';
        const hasIssue = item.status === 'SHORTFALL' || item.status === 'DAMAGED';

        return (
          <Card
            key={item._id || idx}
            style={{
              padding: '1rem',
              border: isLoaded ? '2px solid var(--primary-green)' : hasIssue ? '2px solid var(--error)' : '1px solid var(--border)',
              backgroundColor: isLoaded ? '#F9FDFB' : '#FFFFFF'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', flex: 1 }}
                onClick={() => onToggleItem && onToggleItem(item)}
              >
                {isLoaded ? (
                  <CheckSquare size={24} color="var(--primary-green)" />
                ) : (
                  <Square size={24} color="#94A3B8" />
                )}

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                      {item.itemName || item.name || `Item SKU #${idx + 1}`}
                    </span>
                    <Badge status={item.status || 'PENDING'} />
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    Destination: <strong>{item.destination || item.order?.outlet?.name || 'Assigned Store'}</strong> • Stop #{item.stopSequence || idx + 1}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Qty Required: <strong>{item.expectedQty || item.quantity || 1} units</strong> • Weight: {item.weightKg || 10} kg • Vol: {item.volumeCbm || 0.05} m³
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => onReportIssue && onReportIssue(item, 'shortfall')}
                  style={{
                    padding: '0.4rem 0.65rem',
                    fontSize: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid #F59E0B',
                    backgroundColor: '#FEF3C7',
                    color: '#92400E',
                    cursor: 'pointer',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <AlertTriangle size={12} />
                  <span>Shortfall</span>
                </button>

                <button
                  type="button"
                  onClick={() => onReportIssue && onReportIssue(item, 'damage')}
                  style={{
                    padding: '0.4rem 0.65rem',
                    fontSize: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid #EF4444',
                    backgroundColor: '#FEE2E2',
                    color: '#991B1B',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Damage
                </button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
