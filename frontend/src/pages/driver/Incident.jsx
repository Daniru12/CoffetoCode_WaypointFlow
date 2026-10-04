import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { driverApi } from '../../api/driver.api';
import { syncQueue } from '../../offline/syncQueue';
import { Card } from '../../components/common/Card';
import { ArrowLeft, AlertTriangle, Send } from 'lucide-react';
import { useOffline } from '../../hooks/useOffline';

export const DriverIncident = () => {
  const { deliveryId } = useParams();
  const navigate = useNavigate();
  const { isOffline } = useOffline();

  const [issueType, setIssueType] = useState(deliveryId ? 'OUTLET_CLOSED' : 'VEHICLE_BREAKDOWN');
  const [description, setDescription] = useState('');
  const [cannotContinue, setCannotContinue] = useState(!deliveryId);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [reassignmentData, setReassignmentData] = useState(null);

  const isVehicleType = ['VEHICLE_BREAKDOWN', 'REEFER_FAILURE', 'ACCIDENT'].includes(issueType);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (cannotContinue || !deliveryId) {
        // Report vehicle breakdown / critical incident with Cannot Continue flag
        const formData = new FormData();
        formData.append('type', issueType);
        formData.append('description', description);
        formData.append('cannotContinue', cannotContinue ? 'true' : 'false');

        const res = await driverApi.reportVehicleIssue(formData);
        setReassignmentData(res.data?.reassignmentTemplate || null);
        setSuccess(true);
      } else {
        // Individual stop failure
        if (navigator.onLine) {
          await driverApi.failDelivery(deliveryId, {
            reasonCode: issueType,
            reason: description
          });
        } else {
          await syncQueue.enqueue('DELIVERY_FAILED', deliveryId, {
            reasonCode: issueType,
            reason: description
          });
        }
        setSuccess(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <button
        onClick={() => navigate(-1)}
        className="btn-secondary"
        style={{ marginBottom: '1.25rem', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
      >
        <ArrowLeft size={16} />
        <span>Back</span>
      </button>

      <Card title={deliveryId ? "Report Delivery Stop Issue / Incident" : "Report Vehicle Breakdown / Incident (/driver/issue)"}>
        {success ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <AlertTriangle size={48} color="#D97706" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem' }}>
              {cannotContinue ? "Critical Incident & Reassignment Triggered" : "Issue Recorded"}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              {cannotContinue ? (
                <>
                  Remaining stops marked <strong>At Risk</strong>. Central Dispatcher has been alerted with an auto-reassignment template.
                  {reassignmentData?.replacementVehicle && (
                    <span style={{ display: 'block', marginTop: '0.5rem', color: 'var(--primary-green)', fontWeight: 600 }}>
                      Proposed replacement: {reassignmentData.replacementVehicle.vehicleId} ({reassignmentData.replacementVehicle.type} • {reassignmentData.replacementVehicle.temp})
                    </span>
                  )}
                </>
              ) : (
                "Dispatcher alert generated. The stop has been updated accordingly."
              )}
            </p>
            <button className="btn-primary driver-action-btn" onClick={() => navigate('/driver/route')}>
              Return to Route
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Issue Category</label>
              <select
                className="form-select"
                value={issueType}
                onChange={(e) => {
                  const val = e.target.value;
                  setIssueType(val);
                  if (['VEHICLE_BREAKDOWN', 'REEFER_FAILURE', 'ACCIDENT'].includes(val)) {
                    setCannotContinue(true);
                  }
                }}
              >
                <option value="VEHICLE_BREAKDOWN">Vehicle Mechanical Breakdown</option>
                <option value="REEFER_FAILURE">Reefer Cold Chain Failure</option>
                <option value="ACCIDENT">Traffic Accident / Vehicle Damage</option>
                <option value="OUTLET_CLOSED">Outlet Closed / Store Unresponsive</option>
                <option value="ACCESS_BLOCKED">Access Blocked (Parking Constraint / Mall Dock Full)</option>
                <option value="DELIVERY_REJECTED">Delivery Rejected by Store Staff</option>
                <option value="OTHER">Other Operational Disruption</option>
              </select>
            </div>

            {/* Cannot Continue Delivery Run Toggle */}
            <div style={{
              backgroundColor: cannotContinue ? '#FEF2F2' : '#F8FAFC',
              border: cannotContinue ? '1px solid #FECACA' : '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              marginBottom: '1.25rem'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={cannotContinue}
                  onChange={(e) => setCannotContinue(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <div>
                  <strong style={{ fontSize: '0.95rem', color: cannotContinue ? '#991B1B' : 'var(--text-primary)' }}>
                    Cannot Continue (Vehicle Immobilized / Cold Chain Compromised)
                  </strong>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: cannotContinue ? '#B91C1C' : 'var(--text-muted)' }}>
                    Flags remaining stops <strong>At Risk</strong>, alerts Dispatcher immediately, and auto-generates replacement vehicle plan.
                  </p>
                </div>
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">Detailed Description</label>
              <textarea
                rows="4"
                required
                className="form-textarea"
                placeholder="Explain the circumstances, mechanical state, breakdown location, or reefer temperature..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className={cannotContinue ? "btn-danger driver-action-btn" : "btn-primary driver-action-btn"}
              disabled={submitting}
              style={{ marginTop: '1rem' }}
            >
              <Send size={18} />
              <span>
                {submitting
                  ? 'Transmitting Alert...'
                  : cannotContinue
                  ? 'Transmit Critical Alert & Trigger Auto-Reassign'
                  : 'Transmit Incident Alert'}
              </span>
            </button>
          </form>
        )}
      </Card>
    </div>
  );
};
