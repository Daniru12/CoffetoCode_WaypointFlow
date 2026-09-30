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

  const [issueType, setIssueType] = useState('OUTLET_CLOSED');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (deliveryId) {
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
      } else {
        // Vehicle Incident
        const formData = new FormData();
        formData.append('type', issueType);
        formData.append('description', description);
        await driverApi.reportVehicleIssue(formData);
      }
      setSuccess(true);
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

      <Card title="Report Delivery Issue / Incident">
        {success ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <AlertTriangle size={48} color="#D97706" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem' }}>Issue Recorded</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Dispatcher alert generated. The stop has been updated accordingly.
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
                onChange={(e) => setIssueType(e.target.value)}
              >
                <option value="OUTLET_CLOSED">Outlet Closed / Store Unresponsive</option>
                <option value="ACCESS_BLOCKED">Access Blocked (Parking Constraint / Mall Dock Full)</option>
                <option value="DELIVERY_REJECTED">Delivery Rejected by Store Staff</option>
                <option value="VEHICLE_BREAKDOWN">Vehicle Mechanical Breakdown</option>
                <option value="REEFER_FAILURE">Reefer Cold Chain Failure</option>
                <option value="ACCIDENT">Traffic Delay / Minor Accident</option>
                <option value="OTHER">Other Operational Disruption</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Detailed Description</label>
              <textarea
                rows="4"
                required
                className="form-textarea"
                placeholder="Explain the circumstances, delays, or reason why delivery could not be completed..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn-danger driver-action-btn"
              disabled={submitting}
              style={{ marginTop: '1rem' }}
            >
              <Send size={18} />
              <span>{submitting ? 'Transmitting Incident...' : 'Transmit Incident Alert'}</span>
            </button>
          </form>
        )}
      </Card>
    </div>
  );
};
