import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { driverApi } from '../../api/driver.api';
import { Card } from '../../components/common/Card';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ArrowLeft, CheckCircle2, AlertTriangle, Upload } from 'lucide-react';

export const ConfirmReceipt = () => {
  const { deliveryId } = useParams();
  const navigate = useNavigate();

  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [receivedQuantity, setReceivedQuantity] = useState(1);
  const [condition, setCondition] = useState('GOOD');
  const [discrepancy, setDiscrepancy] = useState(0);
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState([]);

  useEffect(() => {
    loadDelivery();
  }, [deliveryId]);

  const loadDelivery = async () => {
    setLoading(true);
    try {
      const res = await driverApi.getDeliveryById(deliveryId);
      const del = res.data?.delivery;
      setDelivery(del);
      const expected = del?.deliveredQuantity || del?.order?.orderUnits || 1;
      setReceivedQuantity(expected);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQtyChange = (val) => {
    const qty = Number(val);
    setReceivedQuantity(qty);
    const expected = delivery?.deliveredQuantity || delivery?.order?.orderUnits || 1;
    const diff = expected - qty;
    setDiscrepancy(diff > 0 ? diff : 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append('expectedQuantity', delivery?.deliveredQuantity || delivery?.order?.orderUnits || 1);
    formData.append('receivedQuantity', receivedQuantity);
    formData.append('condition', condition);
    formData.append('discrepancy', discrepancy);
    formData.append('notes', notes);

    for (const f of files) {
      formData.append('evidence', f);
    }

    try {
      await driverApi.confirmReceipt(deliveryId, formData);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading delivery manifest..." />;

  const expected = delivery?.deliveredQuantity || delivery?.order?.orderUnits || 1;

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <button
        onClick={() => navigate('/store/dashboard')}
        className="btn-secondary"
        style={{ marginBottom: '1.25rem', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
      >
        <ArrowLeft size={16} />
        <span>Back to Dashboard</span>
      </button>

      <Card title="Store Goods Receipt Confirmation" subtitle="Verify delivered consignment against manifest">
        {success ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <CheckCircle2 size={48} color="var(--primary-green)" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem' }}>Receipt Confirmed Successfully</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              The consignment has been marked as verified in WaypointFlow. Store inventory and SLA settlement records updated.
            </p>
            <button className="btn-primary" onClick={() => navigate('/store/dashboard')}>
              Return to Dashboard
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Manifest Summary Strip */}
            <div style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.85rem'
            }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Order Reference:</span>
                <div style={{ fontWeight: 700 }}>{delivery?.order?.orderRef}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Expected Qty:</span>
                <div style={{ fontWeight: 700 }}>{expected} units</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Driver / Vehicle:</span>
                <div style={{ fontWeight: 700 }}>{delivery?.driver?.name || 'Fleet Driver'}</div>
              </div>
            </div>

            {error && (
              <div style={{ backgroundColor: '#FEE2E2', color: '#991B1B', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Actually Received Units</label>
                <input
                  type="number"
                  min="0"
                  required
                  className="form-input"
                  value={receivedQuantity}
                  onChange={(e) => handleQtyChange(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Consignment Condition</label>
                <select
                  className="form-select"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                >
                  <option value="GOOD">Good / Perfect Condition</option>
                  <option value="DAMAGED">Damaged Goods Found</option>
                  <option value="PARTIAL">Partial Delivery Received</option>
                </select>
              </div>
            </div>

            {discrepancy > 0 && (
              <div style={{
                backgroundColor: '#FEF3C7',
                border: '1px solid #FCD34D',
                color: '#92400E',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertTriangle size={18} />
                <span>Shortfall detected: {discrepancy} units missing compared to dispatch manifest.</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Inspection Notes & Comments</label>
              <textarea
                rows="3"
                className="form-textarea"
                placeholder="Details of batch condition, seals, or carton inspection..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Attach Photo Evidence (if damaged / short)</label>
              <input
                type="file"
                multiple
                accept="image/*"
                className="form-input"
                onChange={(e) => setFiles(Array.from(e.target.files))}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button type="button" className="btn-secondary" onClick={() => navigate('/store/dashboard')}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Confirming...' : 'Sign Off Receipt'}
              </button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};
