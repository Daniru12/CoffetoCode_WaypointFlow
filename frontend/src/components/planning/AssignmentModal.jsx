import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { ConstraintAlert } from './ConstraintAlert';
import { planningApi } from '../../api/planning.api';

export const AssignmentModal = ({ isOpen, onClose, order, plan, onAssigned, onDeferred }) => {
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [tripNumber, setTripNumber] = useState(1);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [compatibleList, setCompatibleList] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && order) {
      loadCompatibleVehicles();
    } else {
      setValidationResult(null);
      setSelectedVehicleId('');
      setError(null);
    }
  }, [isOpen, order]);

  const loadCompatibleVehicles = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await planningApi.getCompatibleVehicles(order._id);
      const data = res.data;
      setCompatibleList(data.evaluations || []);
      setVehicles(data.evaluations?.map(e => e.vehicle) || []);

      if (data.recommendedVehicles && data.recommendedVehicles.length > 0) {
        setSelectedVehicleId(data.recommendedVehicles[0]._id);
      } else if (data.evaluations && data.evaluations.length > 0) {
        setSelectedVehicleId(data.evaluations[0].vehicle._id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Run validation whenever selected vehicle changes
  useEffect(() => {
    if (selectedVehicleId && order) {
      runValidation(selectedVehicleId);
    }
  }, [selectedVehicleId, tripNumber]);

  const runValidation = async (vehicleId) => {
    setValidating(true);
    try {
      const res = await planningApi.validateAllocation({
        orderId: order._id,
        vehicleId,
        tripNumber
      });
      setValidationResult(res.data);
    } catch (err) {
      console.warn('Validation error:', err.message);
    } finally {
      setValidating(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedVehicleId) return;
    setLoading(true);
    setError(null);
    try {
      await planningApi.assignOrder({
        planId: plan._id,
        vehicleId: selectedVehicleId,
        orderId: order._id,
        tripNumber
      });
      onAssigned();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!order) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Assign Order ${order.orderRef}`}>
      {/* Order Summary Strip */}
      <div style={{
        backgroundColor: '#F8FAFC',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '0.85rem 1rem',
        marginBottom: '1.25rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '0.5rem',
        fontSize: '0.8rem'
      }}>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>Outlet:</span>
          <div style={{ fontWeight: 700 }}>{order.outlet?.name || order.outlet?.outletId}</div>
        </div>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>Brand / Temp:</span>
          <div style={{ fontWeight: 700 }}>{order.brand} • {order.tempRequirement}</div>
        </div>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>Weight / Volume:</span>
          <div style={{ fontWeight: 700 }}>{order.orderWeightKg}kg / {order.orderVolumeM3}m³</div>
        </div>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>Parking Access:</span>
          <div style={{ fontWeight: 700 }}>{order.outlet?.parkingConstraint || 'normal'}</div>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: '#FEE2E2', color: '#991B1B', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Vehicle Selector */}
      <div className="form-group">
        <label className="form-label">Select Candidate Vehicle</label>
        <select
          className="form-select"
          value={selectedVehicleId}
          onChange={(e) => setSelectedVehicleId(e.target.value)}
          disabled={loading}
        >
          {compatibleList.map(({ vehicle, compatible, violations }) => (
            <option key={vehicle._id} value={vehicle._id}>
              {compatible ? '✓' : '✗'} {vehicle.vehicleId} — {vehicle.type} ({vehicle.temp}) [{vehicle.weightCapKg}kg / {vehicle.volumeCapM3}m³] {compatible ? '(Compatible)' : `(${violations.length} violations)`}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Trip Sequence Number</label>
        <select
          className="form-select"
          value={tripNumber}
          onChange={(e) => setTripNumber(Number(e.target.value))}
        >
          <option value={1}>Trip 1 (Morning Shift)</option>
          <option value={2}>Trip 2 (Afternoon Shift)</option>
        </select>
      </div>

      {/* Live Constraint Violations / Recommendations Display */}
      {validationResult && !validationResult.valid && (
        <ConstraintAlert
          violations={validationResult.violations}
          recommendedVehicles={compatibleList.filter(c => c.compatible).map(c => c.vehicle)}
          onDefer={() => {
            onClose();
            if (onDeferred) onDeferred(order);
          }}
        />
      )}

      {validationResult && validationResult.valid && (
        <div style={{
          backgroundColor: '#ECFDF5',
          border: '1px solid #A7F3D0',
          color: '#065F46',
          padding: '0.75rem',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.85rem',
          fontWeight: 600,
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span>✓ All 10 constraints satisfied for this assignment.</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
        <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
          Cancel
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={handleAssign}
          disabled={loading || (validationResult && !validationResult.valid)}
        >
          {loading ? 'Assigning...' : 'Confirm Assignment'}
        </button>
      </div>
    </Modal>
  );
};
