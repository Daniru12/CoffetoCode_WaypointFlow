import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadingApi } from '../../api/loading.api';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ArrowLeft, CheckCircle2, AlertTriangle, CheckSquare, Square, Send, Truck } from 'lucide-react';

export const LoaderChecklist = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Shortfall / Damage Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('shortfall'); // 'shortfall' or 'damage'
  const [selectedItemId, setSelectedItemId] = useState('');
  const [issueQty, setIssueQty] = useState(1);
  const [issueReason, setIssueReason] = useState('');
  const [submittingIssue, setSubmittingIssue] = useState(false);

  useEffect(() => {
    loadJobDetails();
  }, [jobId]);

  const loadJobDetails = async () => {
    setLoading(true);
    try {
      const res = await loadingApi.getJobById(jobId);
      setJob(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLoaded = async (item) => {
    const isNowLoaded = item.status !== 'LOADED';
    const newStatus = isNowLoaded ? 'LOADED' : 'PENDING';
    const newQty = isNowLoaded ? item.expectedQty : 0;

    try {
      await loadingApi.updateItem(jobId, item._id || item.order?._id, {
        status: newStatus,
        loadedQty: newQty
      });
      loadJobDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitIssue = async (e) => {
    e.preventDefault();
    setSubmittingIssue(true);
    const formData = new FormData();
    formData.append('itemId', selectedItemId);
    formData.append('reason', issueReason);

    try {
      if (modalType === 'shortfall') {
        formData.append('missingQty', issueQty);
        await loadingApi.reportShortfall(jobId, formData);
      } else {
        formData.append('damagedQty', issueQty);
        await loadingApi.reportDamage(jobId, formData);
      }
      setModalOpen(false);
      loadJobDetails();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingIssue(false);
    }
  };

  const handleMarkReady = async () => {
    try {
      await loadingApi.completeJob(jobId);
      await loadingApi.readyForDeparture(jobId);
      navigate('/loader/jobs');
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <LoadingSpinner text="Loading consignment checklist..." />;

  // Display in Reverse Stop Order (LIFO) for warehouse loading
  const items = [...(job?.items || [])].reverse();
  const allLoaded = items.every((i) => i.status === 'LOADED');

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <button
        onClick={() => navigate('/loader/jobs')}
        className="btn-secondary"
        style={{ marginBottom: '1.25rem', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
      >
        <ArrowLeft size={16} />
        <span>Back to Jobs</span>
      </button>

      {/* Loading Bay Header Banner */}
      <div className="wf-card" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
              {job?.vehicle?.vehicleId} Packing Checklist
            </h2>
            <Badge status={job?.status} />
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Trip: <strong>{job?.trip?.tripRef}</strong> • <strong>LIFO Loading Principle Active</strong>
          </span>
        </div>

        <button
          className="btn-primary"
          onClick={handleMarkReady}
          disabled={job?.status === 'READY_FOR_DEPARTURE'}
          style={{ backgroundColor: '#025E4C' }}
        >
          <Truck size={18} />
          <span>Mark Ready for Departure</span>
        </button>
      </div>

      {/* LIFO Explanation Strip */}
      <div style={{
        backgroundColor: '#EFF6FF',
        border: '1px solid #BFDBFE',
        borderRadius: 'var(--radius-md)',
        padding: '0.75rem 1rem',
        marginBottom: '1.5rem',
        fontSize: '0.85rem',
        color: '#1E40AF'
      }}>
        📦 <strong>Reverse Stop-Order (LIFO):</strong> Pack the last delivery stop first into the deep vehicle interior so the earliest stops are at the rear doors.
      </div>

      <Card title="Consignment Checklist">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {items.map((item, idx) => {
            const isLoaded = item.status === 'LOADED';
            const isShort = item.status === 'SHORTFALL';
            const isDamaged = item.status === 'DAMAGED';

            return (
              <div
                key={idx}
                style={{
                  border: `2px solid ${isLoaded ? '#A7F3D0' : isShort || isDamaged ? '#FECACA' : 'var(--border)'}`,
                  backgroundColor: isLoaded ? '#F0FDF4' : isShort || isDamaged ? '#FEF2F2' : '#FFFFFF',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', flex: 1 }}
                  onClick={() => handleToggleLoaded(item)}
                >
                  <div style={{ color: isLoaded ? '#059669' : '#94A3B8' }}>
                    {isLoaded ? <CheckSquare size={26} /> : <Square size={26} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                      {item.order?.outlet?.name || 'Store Consignment'} ({item.order?.orderRef})
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Expected: <strong>{item.expectedQty} units</strong> • Packed: <strong>{item.loadedQty || 0} units</strong>
                    </div>
                    {item.notes && (
                      <div style={{ fontSize: '0.75rem', color: '#DC2626', fontWeight: 600 }}>
                        Note: {item.notes}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    className="btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
                    onClick={() => {
                      setSelectedItemId(item._id || item.order?._id);
                      setModalType('shortfall');
                      setIssueQty(1);
                      setModalOpen(true);
                    }}
                  >
                    Shortfall
                  </button>
                  <button
                    className="btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem', color: '#DC2626' }}
                    onClick={() => {
                      setSelectedItemId(item._id || item.order?._id);
                      setModalType('damage');
                      setIssueQty(1);
                      setModalOpen(true);
                    }}
                  >
                    Damage
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Shortfall & Damage Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalType === 'shortfall' ? 'Report Loading Shortfall' : 'Report Damaged Goods'}
      >
        <form onSubmit={handleSubmitIssue}>
          <div className="form-group">
            <label className="form-label">Discrepancy Quantity (Units)</label>
            <input
              type="number"
              min="1"
              required
              className="form-input"
              value={issueQty}
              onChange={(e) => setIssueQty(Number(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Explanation & Warehouse Note</label>
            <textarea
              rows="3"
              required
              className="form-textarea"
              placeholder="Provide reason for missing stock, bin location discrepancy, or damaged carton..."
              value={issueReason}
              onChange={(e) => setIssueReason(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submittingIssue}>
              {submittingIssue ? 'Submitting...' : 'Alert Dispatcher'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
