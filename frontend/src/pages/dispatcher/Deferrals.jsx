import React, { useState, useEffect } from 'react';
import { planningApi } from '../../api/planning.api';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { RotateCcw, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';

export const DeferralManagement = () => {
  const [deferrals, setDeferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadDeferrals();
  }, []);

  const loadDeferrals = async () => {
    setLoading(true);
    try {
      const res = await planningApi.getDeferrals();
      setDeferrals(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReconsider = async (deferralId) => {
    try {
      await planningApi.reconsiderDeferral(deferralId);
      setMessage('Order returned to active planning queue.');
      loadDeferrals();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Deferral Management</h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Transparent deferral logs, consecutive skip prevention, and next suggested runs
          </span>
        </div>
      </div>

      {message && (
        <div style={{ backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
          <CheckCircle2 size={18} />
          <span>{message}</span>
        </div>
      )}

      <Card>
        {loading ? (
          <LoadingSpinner text="Fetching deferral records..." />
        ) : deferrals.length === 0 ? (
          <EmptyState
            title="No deferred orders"
            message="All customer and store orders are currently serviced within standard SLAs."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Order Ref</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Outlet</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Reason Code</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Explanation</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Skips</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Next Suggested Run</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {deferrals.map((def) => {
                  const isHighRisk = (def.previousDeferralCount || 0) >= 1;
                  return (
                    <tr key={def._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '0.85rem 0.5rem', fontWeight: 700 }}>
                        {def.order?.orderRef}
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem' }}>
                        {def.order?.outlet?.name || def.order?.outlet?.outletId}
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem' }}>
                        <span style={{
                          backgroundColor: '#FEF3C7',
                          color: '#92400E',
                          padding: '0.2rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}>
                          {def.reasonCode}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem', fontSize: '0.825rem' }}>
                        {def.reason}
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem' }}>
                        <span style={{
                          color: isHighRisk ? '#DC2626' : 'var(--text-primary)',
                          fontWeight: isHighRisk ? 800 : 500
                        }}>
                          {(def.previousDeferralCount || 0) + 1}x
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem' }}>
                        {def.nextSuggestedRun ? new Date(def.nextSuggestedRun).toLocaleDateString() : 'Next Day'}
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right' }}>
                        <button
                          className="btn-secondary"
                          style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                          onClick={() => handleReconsider(def._id)}
                        >
                          Return to Planning
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
