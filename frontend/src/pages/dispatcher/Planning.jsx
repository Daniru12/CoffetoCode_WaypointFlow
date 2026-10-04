import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { planningApi } from '../../api/planning.api';
import { usersApi } from '../../api/users.api';
import { adminApi } from '../../api/admin.api';
import { useSocket } from '../../hooks/useSocket';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { AssignmentModal } from '../../components/planning/AssignmentModal';
import { TripStopReorderModal } from '../../components/planning/TripStopReorderModal';
import {
  Calendar,
  CheckCircle,
  AlertCircle,
  Truck,
  Plus,
  Send,
  ShieldCheck,
  RefreshCw,
  Cpu,
  Layers,
  MapPin,
  Clock,
  ArrowRight,
  ArrowLeft,
  ListOrdered,
  Sparkles,
  Info,
  Lock,
  Check,
  PackageCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CheckCheck,
  FileText,
  X
} from 'lucide-react';

export const PlanningConsole = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [trips, setTrips] = useState([]);
  const [unallocatedOrders, setUnallocatedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [validating, setValidating] = useState(false);
  const [allocating, setAllocating] = useState(false);
  const [approvingAll, setApprovingAll] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Auto-Reassignment & At-Risk Fleet Management
  const [atRiskTrips, setAtRiskTrips] = useState([]);
  const [expandedLifoTripId, setExpandedLifoTripId] = useState(null);
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideTrip, setOverrideTrip] = useState(null);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [overrideVehicleId, setOverrideVehicleId] = useState('');
  const [overrideDriverId, setOverrideDriverId] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [processingReassign, setProcessingReassign] = useState(false);

  // Stepper Stage (1: Order Intake, 2: Route Allocation, 3: Manifest Review & Validation, 4: Dock Release)
  const [activeStage, setActiveStage] = useState(1);

  // Reorder Modal
  const [reorderTrip, setReorderTrip] = useState(null);
  const [reorderModalOpen, setReorderModalOpen] = useState(false);

  // Depot & Date selection
  const [selectedDepot, setSelectedDepot] = useState('Peliyagoda');
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });

  // Selected Order for Manual Assignment
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  // Depot Drivers for direct trip assignment
  const [depotDrivers, setDepotDrivers] = useState([]);

  useEffect(() => {
    loadPlans();
    loadDepotDrivers();
    loadAtRiskTrips();
  }, [selectedDepot, deliveryDate]);

  useEffect(() => {
    if (socket) {
      const handleIncident = () => {
        loadAtRiskTrips();
        if (currentPlan) selectPlan(currentPlan._id, false);
      };
      socket.on('vehicle.breakdown', handleIncident);
      socket.on('route.updated', handleIncident);
      socket.on('trip.started', handleIncident);
      socket.on('plan.published', handleIncident);
      return () => {
        socket.off('vehicle.breakdown', handleIncident);
        socket.off('route.updated', handleIncident);
        socket.off('trip.started', handleIncident);
        socket.off('plan.published', handleIncident);
      };
    }
  }, [socket, currentPlan]);

  const loadAtRiskTrips = async () => {
    try {
      const res = await planningApi.getTrips();
      const all = res.data || [];
      const critical = all.filter(t => t.atRisk || t.reassignmentTemplate?.status === 'PROPOSED');
      setAtRiskTrips(critical);
    } catch (e) {
      console.warn('Failed to load at-risk trips:', e.message);
    }
  };

  const loadDepotDrivers = async () => {
    try {
      const res = await usersApi.getDrivers({ depot: selectedDepot });
      setDepotDrivers(res.data || []);
    } catch (e) {
      console.warn('Failed to load drivers for depot:', e.message);
    }
  };

  const handleApproveAllTrips = async () => {
    if (!currentPlan) return;
    setApprovingAll(true);
    setMessage(null);
    setError(null);
    try {
      const res = await planningApi.approveAllPlanTrips(currentPlan._id);
      setMessage(res.message || 'All auto-assigned vehicle runs verified and approved! Plan is READY for Dock Release.');
      await selectPlan(currentPlan._id, false);
      setActiveStage(3);
    } catch (e) {
      setError(e.message || 'Failed to approve all trips');
    } finally {
      setApprovingAll(false);
    }
  };

  const handleApproveReassignment = async (tripId) => {
    setProcessingReassign(true);
    setMessage(null);
    setError(null);
    try {
      await planningApi.approveReassignment(tripId, {});
      setMessage('Replacement vehicle run approved and dispatched to driver console! Remaining stops restored to active route.');
      await loadAtRiskTrips();
      if (currentPlan) await selectPlan(currentPlan._id, false);
    } catch (e) {
      setError(e.message || 'Failed to approve reassignment');
    } finally {
      setProcessingReassign(false);
    }
  };

  const handleOpenOverride = async (trip) => {
    setOverrideTrip(trip);
    setOverrideVehicleId(trip.reassignmentTemplate?.replacementVehicle?._id || '');
    setOverrideDriverId(trip.reassignmentTemplate?.replacementDriver?._id || '');
    setOverrideReason('');
    try {
      const res = await adminApi.getVehicles({ depot: selectedDepot, status: 'AVAILABLE' });
      setAvailableVehicles(res.data || []);
    } catch (e) {
      console.warn('Failed to load available fleet:', e.message);
    }
    setOverrideModalOpen(true);
  };

  const handleSubmitOverride = async (e) => {
    e.preventDefault();
    if (!overrideTrip) return;
    setProcessingReassign(true);
    setMessage(null);
    setError(null);
    try {
      await planningApi.approveReassignment(overrideTrip._id, {
        newVehicleId: overrideVehicleId,
        newDriverId: overrideDriverId || undefined,
        overrideReason: overrideReason || 'Dispatcher manual override of replacement vehicle'
      });
      setMessage('Manual override applied: Replacement vehicle run approved and dispatched to driver console.');
      setOverrideModalOpen(false);
      setOverrideTrip(null);
      await loadAtRiskTrips();
      if (currentPlan) await selectPlan(currentPlan._id, false);
    } catch (err) {
      setError(err.message || 'Failed to apply reassignment override');
    } finally {
      setProcessingReassign(false);
    }
  };

  const handleRejectReassignment = async (tripId) => {
    if (!window.confirm('Reject this reassignment and auto-defer all remaining orders on this broken-down vehicle?')) return;
    setProcessingReassign(true);
    setMessage(null);
    setError(null);
    try {
      await planningApi.rejectReassignment(tripId, { reason: 'Dispatcher rejected reassignment: Fleet unavailable' });
      setMessage('Reassignment rejected. All remaining undelivered orders auto-deferred to next run.');
      await loadAtRiskTrips();
      if (currentPlan) await selectPlan(currentPlan._id, false);
    } catch (err) {
      setError(err.message || 'Failed to reject reassignment');
    } finally {
      setProcessingReassign(false);
    }
  };

  const handleAssignDriverToTrip = async (tripId, driverId) => {
    try {
      await planningApi.assignTripDriver(tripId, driverId || null);
      if (currentPlan) {
        await selectPlan(currentPlan._id, false);
      }
      setMessage('Trip driver assignment updated successfully');
    } catch (e) {
      setError(e.message || 'Failed to update trip driver');
    }
  };

  const loadPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await planningApi.getPlans({ depot: selectedDepot, date: deliveryDate });
      const planList = res.data || [];
      setPlans(planList);

      if (planList.length > 0) {
        selectPlan(planList[0]._id, false);
      } else {
        setCurrentPlan(null);
        setTrips([]);
        setUnallocatedOrders([]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewPlan = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const newPlanRes = await planningApi.createPlan({
        deliveryDate,
        depot: selectedDepot
      });
      setMessage(`Initialized delivery plan ${newPlanRes.data.planRef} for ${selectedDepot}`);
      await selectPlan(newPlanRes.data._id, false);
      const res = await planningApi.getPlans({ depot: selectedDepot, date: deliveryDate });
      setPlans(res.data || []);
      setActiveStage(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectPlan = async (planId, syncDate = true) => {
    try {
      const [planRes, unallocRes] = await Promise.all([
        planningApi.getPlanById(planId),
        planningApi.getUnallocatedOrders(planId)
      ]);
      const p = planRes.data.plan;
      setCurrentPlan(p);
      const loadedTrips = planRes.data.trips || [];
      setTrips(loadedTrips);
      setUnallocatedOrders(unallocRes.data || []);
      if (syncDate && p?.deliveryDate) {
        const formattedDate = new Date(p.deliveryDate).toISOString().slice(0, 10);
        setDeliveryDate(formattedDate);
      }

      // Automatically align stage based on plan lifecycle status
      if (p.status === 'PUBLISHED') {
        setActiveStage(4);
      } else if (p.status === 'READY') {
        setActiveStage(3);
      } else if (loadedTrips.length > 0 && activeStage === 1) {
        setActiveStage(2);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAutoAllocate = async () => {
    setAllocating(true);
    setMessage(null);
    setError(null);
    try {
      let planId = currentPlan?._id;
      if (!planId) {
        const newPlanRes = await planningApi.createPlan({
          deliveryDate,
          depot: selectedDepot
        });
        planId = newPlanRes.data._id;
        const res = await planningApi.getPlans({ depot: selectedDepot, date: deliveryDate });
        setPlans(res.data || []);
      }
      const res = await planningApi.autoAllocatePlan(planId);
      const data = res.data || {};
      setMessage(`Route Allocation Solver Complete: Formed ${data.tripsCount || 0} vehicle runs. Allocated ${data.servedOrdersCount || 0} orders (${data.deferredOrdersCount || 0} deferred due to capacity/constraints).`);
      await selectPlan(planId, false);
      setActiveStage(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setAllocating(false);
    }
  };

  const handleValidatePlan = async () => {
    if (!currentPlan) return;
    setValidating(true);
    setMessage(null);
    setError(null);
    try {
      const res = await planningApi.validatePlan(currentPlan._id);
      if (res.data?.overallValid) {
        setMessage('Plan passed all 10 constraint checks! Status transitioned to READY.');
      } else {
        const errorMsg = res.data?.summary?.message || 'Plan has constraint violations across assigned trips or has 0 formed trips.';
        setError(errorMsg);
      }
      await selectPlan(currentPlan._id, false);
    } catch (err) {
      setError(err.message);
    } finally {
      setValidating(false);
    }
  };

  const handlePublishPlan = async () => {
    if (!currentPlan) return;
    if (trips.length === 0) {
      setError('Cannot publish a plan with 0 assigned trips.');
      return;
    }
    if (currentPlan.status !== 'READY') {
      setError('Plan must be validated and in READY status before publishing to warehouse dock.');
      return;
    }

    setPublishing(true);
    setMessage(null);
    setError(null);
    try {
      const res = await planningApi.publishPlan(currentPlan._id);
      setMessage(`Plan published successfully to dock! Created ${res.data?.loadingJobsCount || 0} Loading Jobs and ${res.data?.deliveriesCount || 0} Driver Stops.`);
      await selectPlan(currentPlan._id, false);
      setActiveStage(4);
    } catch (err) {
      setError(err.message);
    } finally {
      setPublishing(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading Delivery Planning Console..." />;

  const isPublished = currentPlan?.status === 'PUBLISHED';
  const isReady = currentPlan?.status === 'READY';
  const totalStops = trips.reduce((acc, t) => acc + (t.orders?.length || 0), 0);
  const totalWeightDemand = unallocatedOrders.reduce((acc, o) => acc + (o.orderWeightKg || 0), 0);
  const totalVolumeDemand = unallocatedOrders.reduce((acc, o) => acc + (o.orderVolumeM3 || 0), 0);
  const chilledDemandCount = unallocatedOrders.filter(o => o.tempRequirement === 'chilled' || o.brand === 'Fresh').length;
  const vanOnlyDemandCount = unallocatedOrders.filter(o => o.outlet?.parkingConstraint === 'van_only').length;

  return (
    <div>
      {/* Depot & Plan Selector Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.25rem',
        flexWrap: 'wrap',
        gap: '1rem',
        backgroundColor: '#FFFFFF',
        padding: '1rem 1.25rem',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.2rem' }}>Operational Hub</label>
            <select
              className="form-select"
              value={selectedDepot}
              onChange={(e) => setSelectedDepot(e.target.value)}
              style={{ fontWeight: 700, minWidth: '150px' }}
            >
              <option value="Peliyagoda">Peliyagoda Hub</option>
              <option value="Kandy">Kandy Depot</option>
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.2rem' }}>Delivery Date</label>
            <input
              type="date"
              className="form-input"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              style={{ fontWeight: 600 }}
            />
          </div>

          <div style={{ alignSelf: 'flex-end' }}>
            <button
              className="btn-secondary"
              onClick={handleCreateNewPlan}
              title="Initialize new plan revision for this date"
              style={{ padding: '0.5rem 0.85rem' }}
            >
              <Plus size={16} />
              <span>New Plan</span>
            </button>
          </div>
        </div>

        {/* Plan Switcher */}
        {plans.length > 0 && (
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.2rem' }}>Switch Active Plan</label>
            <select
              className="form-select"
              value={currentPlan?._id || ''}
              onChange={(e) => selectPlan(e.target.value)}
            >
              {plans.map(p => (
                <option key={p._id} value={p._id}>
                  {p.planRef} ({p.status} - {new Date(p.deliveryDate).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* No Plan Initialized Banner */}
      {!currentPlan ? (
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '3rem 2rem',
          textAlign: 'center'
        }}>
          <Calendar size={48} color="#94A3B8" style={{ margin: '0 auto 1rem auto' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            No Active Delivery Plan for {selectedDepot} on {new Date(deliveryDate).toLocaleDateString()}
          </h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 1.5rem auto', fontSize: '0.9rem' }}>
            Initialize a delivery plan to ingest retail store demand, run the 10-constraint route allocation solver, and release manifests to the warehouse dock.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-secondary" onClick={handleCreateNewPlan} style={{ padding: '0.65rem 1.25rem' }}>
              <Plus size={18} />
              <span>Initialize Empty Plan</span>
            </button>
            <button
              className="btn-primary"
              onClick={handleAutoAllocate}
              disabled={allocating}
              style={{
                padding: '0.65rem 1.35rem',
                backgroundColor: '#059669',
                borderColor: '#059669',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Sparkles size={18} />
              <span>{allocating ? 'Solving Auto-Plan...' : 'Auto-Generate Plan (Delivery Intelligence)'}</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* ======================================================== */}
          {/* AUTO-REASSIGN TEMPLATE PANEL (Dispatcher -> Driver)     */}
          {/* ======================================================== */}
          {atRiskTrips.length > 0 && (
            <div style={{
              backgroundColor: '#FFF1F2',
              border: '2px solid #F43F5E',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              boxShadow: '0 4px 12px rgba(244, 63, 94, 0.12)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    backgroundColor: '#E11D48',
                    color: '#FFFFFF',
                    borderRadius: '50%',
                    width: '38px',
                    height: '38px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <AlertTriangle size={22} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#9F1239' }}>
                      CRITICAL: Driver Immobilized & Cannot Continue ({atRiskTrips.length} At-Risk Runs)
                    </h3>
                    <span style={{ fontSize: '0.85rem', color: '#BE123C' }}>
                      Driver reported vehicle breakdown / incident. Remaining stops flagged At Risk and replacement vehicle template generated.
                    </span>
                  </div>
                </div>
                <span style={{
                  backgroundColor: '#FFE4E6',
                  color: '#9F1239',
                  padding: '0.3rem 0.75rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  border: '1px solid #FECDD3'
                }}>
                  ACTION REQUIRED
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {atRiskTrips.map((art) => {
                  const tmpl = art.reassignmentTemplate;
                  const hasProposal = tmpl && tmpl.status === 'PROPOSED' && tmpl.replacementVehicle;
                  const stopsCount = tmpl?.remainingOrders?.length || 0;

                  return (
                    <div
                      key={art._id}
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #FECDD3',
                        borderRadius: 'var(--radius-md)',
                        padding: '1.25rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <span style={{ fontWeight: 800, fontSize: '1rem', color: '#1E293B' }}>{art.tripRef}</span>
                            <span style={{ backgroundColor: '#FEE2E2', color: '#991B1B', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800 }}>
                              STOPS AT RISK: {stopsCount}
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>
                            Disabled Vehicle: <strong>{tmpl?.originalVehicle?.vehicleId || art.vehicle?.vehicleId || 'N/A'}</strong> | Reported Incident: <span style={{ color: '#E11D48', fontWeight: 600 }}>{tmpl?.reason || 'Mechanical Breakdown'}</span>
                          </p>
                        </div>

                        {hasProposal ? (
                          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <button
                              className="btn-primary"
                              onClick={() => handleApproveReassignment(art._id)}
                              disabled={processingReassign}
                              style={{
                                backgroundColor: '#059669',
                                borderColor: '#059669',
                                fontWeight: 800,
                                padding: '0.55rem 1.1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem'
                              }}
                            >
                              <CheckCircle size={16} />
                              <span>Approve Reassignment (1-Click)</span>
                            </button>
                            <button
                              className="btn-secondary"
                              onClick={() => handleOpenOverride(art)}
                              disabled={processingReassign}
                              style={{ fontSize: '0.85rem', padding: '0.55rem 0.9rem' }}
                            >
                              <span>Override / Edit</span>
                            </button>
                            <button
                              className="btn-secondary"
                              onClick={() => handleRejectReassignment(art._id)}
                              disabled={processingReassign}
                              style={{ fontSize: '0.85rem', color: '#991B1B', borderColor: '#FCA5A5', padding: '0.55rem 0.9rem' }}
                            >
                              <span>Reject & Defer</span>
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{ fontSize: '0.8rem', color: '#DC2626', fontWeight: 700 }}>
                              No matching fleet unit available. Orders auto-deferred.
                            </span>
                            <button
                              className="btn-secondary"
                              onClick={() => handleOpenOverride(art)}
                              style={{ fontSize: '0.8rem' }}
                            >
                              Manual Override
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Proposed Replacement Details */}
                      {hasProposal && (
                        <div style={{
                          backgroundColor: '#F0FDF4',
                          border: '1px solid #BBF7D0',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.85rem 1rem',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                          gap: '0.75rem',
                          fontSize: '0.825rem'
                        }}>
                          <div>
                            <span style={{ color: '#166534', fontSize: '0.725rem', fontWeight: 700, textTransform: 'uppercase' }}>Recommended Fleet Unit</span>
                            <div style={{ fontWeight: 800, color: '#14532D', fontSize: '0.95rem', marginTop: '0.1rem' }}>
                              {tmpl.replacementVehicle.vehicleId} ({tmpl.replacementVehicle.type} • {tmpl.replacementVehicle.temp})
                            </div>
                            <span style={{ fontSize: '0.725rem', color: '#15803D' }}>
                              Cap: {tmpl.replacementVehicle.weightCapKg}kg ({tmpl.remainingWeightKg}kg remaining load)
                            </span>
                          </div>

                          <div>
                            <span style={{ color: '#166534', fontSize: '0.725rem', fontWeight: 700, textTransform: 'uppercase' }}>Replacement Driver</span>
                            <div style={{ fontWeight: 800, color: '#14532D', fontSize: '0.95rem', marginTop: '0.1rem' }}>
                              {tmpl.replacementDriver?.name || 'Depot Fleet Driver'}
                            </div>
                            <span style={{ fontSize: '0.725rem', color: '#15803D' }}>
                              Phone: {tmpl.replacementDriver?.phone || 'Dispatched via App'}
                            </span>
                          </div>

                          <div style={{ gridColumn: 'span 2' }}>
                            <span style={{ color: '#166534', fontSize: '0.725rem', fontWeight: 700, textTransform: 'uppercase' }}>Stock Transfer Directives</span>
                            <div style={{ color: '#14532D', marginTop: '0.1rem', fontWeight: 500 }}>
                              {tmpl.stockTransferNote}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4-Stage Operational Planning Stepper */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '0.75rem',
            marginBottom: '1.25rem',
            backgroundColor: '#FFFFFF',
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)'
          }}>
            {[
              { num: 1, title: 'Order Intake', desc: `${unallocatedOrders.length} Pending Outlets` },
              { num: 2, title: 'Route Allocation', desc: `${trips.length} Formed Runs` },
              { num: 3, title: 'Manifest Review', desc: isReady ? '10/10 Passed (READY)' : 'Tuning & Validation' },
              { num: 4, title: 'Dock Release', desc: isPublished ? 'Published to Hub' : 'Gate & Publish' }
            ].map((step) => {
              const isActive = activeStage === step.num;
              const isPast = activeStage > step.num || (step.num === 3 && isReady) || (step.num === 4 && isPublished);
              return (
                <div
                  key={step.num}
                  onClick={() => setActiveStage(step.num)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isActive ? '#E8F5EE' : isPast ? '#F8FAFC' : '#FFFFFF',
                    border: isActive ? '2px solid var(--primary-green)' : isPast ? '1px solid #CBD5E1' : '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: isActive ? 'var(--primary-green)' : isPast ? '#10B981' : '#94A3B8',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.8rem'
                  }}>
                    {isPast && !isActive ? <Check size={16} /> : step.num}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: isActive ? 'var(--primary-green)' : 'var(--text-primary)' }}>
                      {step.title}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {step.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Plan Header Strip */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
            flexWrap: 'wrap',
            gap: '1rem',
            padding: '0.75rem 1rem',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                  Plan: {currentPlan?.planRef}
                </h3>
                <Badge status={currentPlan?.status} />
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Depot: <strong>{currentPlan?.depot}</strong> • Date: <strong>{new Date(currentPlan.deliveryDate).toLocaleDateString()}</strong> • Total Demand: <strong>{unallocatedOrders.length + totalStops} orders</strong>
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Lifecycle:</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isPublished ? '#10B981' : isReady ? '#059669' : '#D97706' }}>
                {isPublished ? '● PUBLISHED TO DOCK' : isReady ? '● READY FOR DISPATCH' : '● DRAFT (IN PROGRESS)'}
              </span>
            </div>
          </div>

          {/* Feedback Messages */}
          {message && (
            <div style={{ backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>
              <CheckCircle size={18} />
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* STAGE 1: ORDER INTAKE & DEMAND REVIEW                   */}
          {/* ======================================================== */}
          {activeStage === 1 && (
            <div>
              {/* Demand Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ backgroundColor: '#FFFFFF', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pending Outlet Orders</span>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.2rem 0 0 0', color: 'var(--primary-green)' }}>{unallocatedOrders.length}</h3>
                </div>
                <div style={{ backgroundColor: '#FFFFFF', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fresh Chilled Demand</span>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.2rem 0 0 0', color: '#2563EB' }}>{chilledDemandCount}</h3>
                </div>
                <div style={{ backgroundColor: '#FFFFFF', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Van-Only Constrained</span>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.2rem 0 0 0', color: '#D97706' }}>{vanOnlyDemandCount}</h3>
                </div>
                <div style={{ backgroundColor: '#FFFFFF', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Payload Demand</span>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0.2rem 0 0 0' }}>{totalWeightDemand}kg • {totalVolumeDemand.toFixed(1)}m³</h3>
                </div>
              </div>

              {/* Order List */}
              <Card title={`Unallocated Demand Queue (${unallocatedOrders.length})`} subtitle="Retail store delivery orders pending route assignment">
                {unallocatedOrders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                    <CheckCircle size={36} color="#10B981" style={{ margin: '0 auto 0.75rem auto' }} />
                    <p style={{ fontWeight: 700, margin: 0 }}>All candidate orders are allocated to trips.</p>
                    {trips.length > 0 && (
                      <button className="btn-secondary" onClick={() => setActiveStage(2)} style={{ marginTop: '1rem' }}>
                        <span>View Formed Runs (Stage 2) →</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                    {unallocatedOrders.map((ord) => (
                      <div
                        key={ord._id}
                        style={{
                          padding: '1rem',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: '#F8FAFC',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{ord.orderRef}</span>
                          <Badge status={ord.brand} />
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                          {ord.outlet?.name || ord.outlet?.outletId} ({ord.outlet?.district})
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', backgroundColor: '#E2E8F0', borderRadius: '4px', fontWeight: 600 }}>
                            {ord.orderWeightKg}kg • {ord.orderVolumeM3}m³
                          </span>
                          <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', backgroundColor: ord.tempRequirement === 'chilled' ? '#DBEAFE' : '#F1F5F9', color: ord.tempRequirement === 'chilled' ? '#1E40AF' : 'inherit', borderRadius: '4px', fontWeight: 600 }}>
                            {ord.tempRequirement?.toUpperCase()}
                          </span>
                          {ord.outlet?.parkingConstraint === 'van_only' && (
                            <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', backgroundColor: '#FEF3C7', color: '#92400E', borderRadius: '4px', fontWeight: 700 }}>
                              VAN ONLY DOCK
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                          <button
                            className="btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                            disabled={isPublished}
                            onClick={() => {
                              setSelectedOrder(ord);
                              setAssignModalOpen(true);
                            }}
                          >
                            Manual Assign
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Stage 1 CTA Bar */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '1.5rem',
                  paddingTop: '1.25rem',
                  borderTop: '1px solid var(--border)',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {unallocatedOrders.length > 0
                      ? `${unallocatedOrders.length} orders ready for 10-constraint optimization.`
                      : 'Orders already assigned. Proceed to review formed runs.'}
                  </span>

                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    {unallocatedOrders.length > 0 && (
                      <button
                        className="btn-primary"
                        onClick={handleAutoAllocate}
                        disabled={allocating || isPublished}
                        style={{
                          padding: '0.65rem 1.35rem',
                          backgroundColor: '#059669',
                          borderColor: '#059669',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                        title="Auto-assign orders, cluster by depot/district/brand, enforce 7 constraints, sequence ETAs, and generate reverse LIFO loading lists"
                      >
                        <Sparkles size={18} />
                        <span>{allocating ? 'Solving Auto-Plan...' : 'Auto-Generate Plan (Delivery Intelligence)'}</span>
                      </button>
                    )}
                    {trips.length > 0 && (
                      <button className="btn-secondary" onClick={() => setActiveStage(2)}>
                        <span>View Formed Runs (Stage 2) →</span>
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* ======================================================== */}
          {/* STAGE 2: ROUTE ALLOCATION & RUNS OVERVIEW               */}
          {/* ======================================================== */}
          {activeStage === 2 && (
            <div>
              {/* Runs Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ backgroundColor: '#FFFFFF', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Formed Vehicle Runs</span>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.2rem 0 0 0', color: 'var(--primary-green)' }}>{trips.length}</h3>
                </div>
                <div style={{ backgroundColor: '#FFFFFF', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Allocated Deliveries</span>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.2rem 0 0 0' }}>{totalStops}</h3>
                </div>
                <div style={{ backgroundColor: '#FFFFFF', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Deferred Outlets</span>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.2rem 0 0 0', color: currentPlan?.deferredOrders?.length > 0 ? '#EF4444' : 'var(--text-primary)' }}>
                    {currentPlan?.deferredOrders?.length || 0}
                  </h3>
                </div>
                <div style={{ backgroundColor: '#FFFFFF', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active Fleet Units</span>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.2rem 0 0 0' }}>{new Set(trips.map(t => t.vehicle?._id || t.vehicle)).size}</h3>
                </div>
              </div>

              {/* Formed Runs Grid */}
              <Card
                title={`Formed Vehicle Runs (${trips.length})`}
                subtitle="Template-based optimized runs with auto-assigned metadata and dock loading lists"
                action={
                  <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
                    <button
                      className="btn-primary"
                      onClick={handleApproveAllTrips}
                      disabled={approvingAll || isPublished || trips.length === 0}
                      style={{
                        backgroundColor: '#059669',
                        borderColor: '#059669',
                        fontWeight: 800,
                        padding: '0.45rem 0.95rem',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                      title="1-Click Approve all trips in this plan to transition to READY for Dock Release"
                    >
                      <CheckCircle size={16} />
                      <span>{approvingAll ? 'Approving All...' : 'Approve All Trips (1-Click)'}</span>
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={handleAutoAllocate}
                      disabled={allocating || isPublished}
                      style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      title="Re-run the automated delivery intelligence engine"
                    >
                      <Sparkles size={16} color="var(--primary-green)" />
                      <span>{allocating ? 'Solving...' : 'Re-run Auto-Plan'}</span>
                    </button>
                  </div>
                }
              >
                {trips.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                    <Truck size={40} color="#94A3B8" style={{ margin: '0 auto 0.75rem auto' }} />
                    <p style={{ fontWeight: 700, margin: '0 0 0.5rem 0' }}>No vehicle runs formed yet.</p>
                    <button
                      className="btn-primary"
                      onClick={handleAutoAllocate}
                      disabled={allocating || isPublished || unallocatedOrders.length === 0}
                      style={{ backgroundColor: '#059669', borderColor: '#059669', fontWeight: 800 }}
                    >
                      <Sparkles size={16} />
                      <span>{allocating ? 'Solving...' : 'Auto-Generate Delivery Plan'}</span>
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {trips.map((trip) => {
                      const weightPct = Math.min(100, Math.round(((trip.totalWeightKg || 0) / (trip.vehicle?.weightCapKg || 1)) * 100));
                      const volumePct = Math.min(100, Math.round(((trip.totalVolumeM3 || 0) / (trip.vehicle?.volumeCapM3 || 1)) * 100));
                      const isFreshTrip = trip.brand === 'Fresh';
                      const maxMinutes = isFreshTrip ? 270 : 480;
                      const estMinutes = trip.estimatedMinutes || (trip.orders?.length || 1) * 35;
                      const timePct = Math.min(100, Math.round((estMinutes / maxMinutes) * 100));
                      const getBarColor = (pct) => pct > 100 ? '#EF4444' : pct > 85 ? '#F59E0B' : '#10B981';

                      return (
                        <div
                          key={trip._id}
                          style={{
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '1.25rem',
                            backgroundColor: '#FFFFFF',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                              <Truck size={22} color="var(--primary-green)" />
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
                                    {trip.tripRef} (Shift #{trip.tripNumber})
                                  </h4>
                                  {trip.isAutoAssigned && (
                                    <span
                                      style={{
                                        backgroundColor: '#DCFCE7',
                                        color: '#166534',
                                        border: '1px solid #BBF7D0',
                                        borderRadius: '9999px',
                                        padding: '0.15rem 0.55rem',
                                        fontSize: '0.725rem',
                                        fontWeight: 800,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.3rem'
                                      }}
                                      title={trip.autoAssignReason || 'Auto-assigned by Delivery Intelligence Solver'}
                                    >
                                      <Sparkles size={12} color="#166534" />
                                      <span>Auto-assigned</span>
                                    </span>
                                  )}
                                  <span style={{
                                    backgroundColor: trip.validationStatus?.valid !== false ? '#F0FDF4' : '#FEF2F2',
                                    color: trip.validationStatus?.valid !== false ? '#15803D' : '#991B1B',
                                    border: `1px solid ${trip.validationStatus?.valid !== false ? '#BBF7D0' : '#FECACA'}`,
                                    borderRadius: '4px',
                                    padding: '0.15rem 0.45rem',
                                    fontSize: '0.725rem',
                                    fontWeight: 800
                                  }}>
                                    {trip.validationStatus?.valid !== false ? 'VALIDATED' : 'VIOLATIONS'}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    Vehicle: <strong>{trip.vehicle?.vehicleId}</strong> ({trip.vehicle?.type} • {trip.vehicle?.temp})
                                  </span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Driver:</span>
                                    {!isPublished ? (
                                      <select
                                        value={trip.driver?._id || trip.driver || ''}
                                        onChange={(e) => handleAssignDriverToTrip(trip._id, e.target.value)}
                                        style={{
                                          fontSize: '0.75rem',
                                          padding: '0.2rem 0.5rem',
                                          borderRadius: '4px',
                                          border: '1px solid var(--border)',
                                          backgroundColor: '#F1F5F9',
                                          fontWeight: 600,
                                          color: trip.driver ? 'var(--text-primary)' : '#94A3B8'
                                        }}
                                      >
                                        <option value="">-- Assign Driver --</option>
                                        {depotDrivers.map((d) => (
                                          <option key={d._id} value={d._id}>
                                            {d.name} {d.assignedVehicle ? `(${d.assignedVehicle.vehicleId || 'Linked'})` : ''}
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <strong style={{ fontSize: '0.75rem' }}>{trip.driver?.name || 'Unassigned'}</strong>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <Badge status={trip.brand} />
                              <Badge status={trip.status} />
                            </div>
                          </div>

                          {/* Progress Bars */}
                          <div style={{ backgroundColor: '#F8FAFC', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.85rem', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              <span>District: <strong>{trip.district || 'All Districts'}</strong></span>
                              <span>Window: <strong>{isFreshTrip ? 'Pre-Dawn Fresh (270m cutoff)' : 'Daytime Standard (480m)'}</strong></span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                                  <span style={{ color: 'var(--text-secondary)' }}>Weight Load</span>
                                  <span style={{ fontWeight: 700, color: weightPct > 100 ? '#EF4444' : 'inherit' }}>{weightPct}%</span>
                                </div>
                                <div style={{ height: '6px', backgroundColor: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${weightPct}%`, backgroundColor: getBarColor(weightPct) }} />
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                  {trip.totalWeightKg} / {trip.vehicle?.weightCapKg} kg
                                </div>
                              </div>

                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                                  <span style={{ color: 'var(--text-secondary)' }}>Volume Load</span>
                                  <span style={{ fontWeight: 700, color: volumePct > 100 ? '#EF4444' : 'inherit' }}>{volumePct}%</span>
                                </div>
                                <div style={{ height: '6px', backgroundColor: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${volumePct}%`, backgroundColor: getBarColor(volumePct) }} />
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                  {trip.totalVolumeM3?.toFixed(1)} / {trip.vehicle?.volumeCapM3} m³
                                </div>
                              </div>

                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                                  <span style={{ color: 'var(--text-secondary)' }}>Window Budget</span>
                                  <span style={{ fontWeight: 700, color: timePct > 100 ? '#EF4444' : 'inherit' }}>{timePct}%</span>
                                </div>
                                <div style={{ height: '6px', backgroundColor: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${timePct}%`, backgroundColor: getBarColor(timePct) }} />
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                  ~{estMinutes}m / {maxMinutes}m max
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Explainable Reasoning Callout */}
                          {trip.autoAssignReason && (
                            <div style={{
                              backgroundColor: '#F0FDF4',
                              border: '1px solid #BBF7D0',
                              borderRadius: 'var(--radius-sm)',
                              padding: '0.55rem 0.75rem',
                              fontSize: '0.75rem',
                              color: '#166534',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '0.45rem',
                              marginBottom: '0.75rem'
                            }}>
                              <Info size={14} color="#166534" style={{ flexShrink: 0, marginTop: '2px' }} />
                              <span><strong>Solver Rationale:</strong> {trip.autoAssignReason}</span>
                            </div>
                          )}

                          {/* Stop Sequence & Sequenced ETAs Preview */}
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                            <strong>Stops & Sequenced ETAs ({trip.orders?.length || 0}):</strong>{' '}
                            {trip.orders?.map((o, idx) => {
                              const etaStr = o.estimatedArrival ? new Date(o.estimatedArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
                              return (
                                <span key={idx} style={{ marginRight: '0.5rem' }}>
                                  #{o.stopSequence || idx + 1} {o.order?.outlet?.name || o.order?.orderRef}
                                  {etaStr && <span style={{ color: '#0369A1', fontWeight: 600 }}> ({etaStr})</span>}
                                  {idx < (trip.orders.length - 1) ? ' →' : ''}
                                </span>
                              );
                            })}
                          </div>

                          {/* LIFO Loading Manifest Toggle */}
                          <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '0.65rem' }}>
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => setExpandedLifoTripId(expandedLifoTripId === trip._id ? null : trip._id)}
                              style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                            >
                              <ListOrdered size={14} />
                              <span>
                                {expandedLifoTripId === trip._id
                                  ? 'Hide LIFO Dock Manifest'
                                  : `Inspect Reverse LIFO Loading List (${trip.lifoLoadingList?.length || trip.orders?.length || 0} Items)`}
                              </span>
                            </button>

                            {expandedLifoTripId === trip._id && (
                              <div style={{ marginTop: '0.75rem', backgroundColor: '#F8FAFC', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                  <strong style={{ fontSize: '0.775rem', color: 'var(--text-primary)' }}>Reverse Stop-Order Loading Manifest (LIFO Dock Plan):</strong>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Position #1 loaded innermost (last drop); Stop #1 loaded last by rear doors</span>
                                </div>
                                <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                                  <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', textAlign: 'left' }}>
                                      <th style={{ padding: '0.35rem' }}>Loading Order</th>
                                      <th style={{ padding: '0.35rem' }}>Delivery Stop</th>
                                      <th style={{ padding: '0.35rem' }}>Retail Outlet</th>
                                      <th style={{ padding: '0.35rem' }}>Order Ref</th>
                                      <th style={{ padding: '0.35rem' }}>Units</th>
                                      <th style={{ padding: '0.35rem' }}>Weight/Vol</th>
                                      <th style={{ padding: '0.35rem' }}>Temp</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(trip.lifoLoadingList && trip.lifoLoadingList.length > 0 ? trip.lifoLoadingList : [...(trip.orders || [])].reverse().map((it, i) => ({
                                      loadingOrder: i + 1,
                                      stopSequence: it.stopSequence || (trip.orders.length - i),
                                      outletName: it.order?.outlet?.name || 'Retail Outlet',
                                      orderRef: it.order?.orderRef || 'N/A',
                                      units: it.order?.orderUnits || 1,
                                      weightKg: it.order?.orderWeightKg || 0,
                                      volumeM3: it.order?.orderVolumeM3 || 0,
                                      temp: it.order?.tempRequirement || (trip.brand === 'Fresh' ? 'chilled' : 'ambient')
                                    }))).map((item, idx) => (
                                      <tr key={idx} style={{ borderBottom: '1px solid #E2E8F0' }}>
                                        <td style={{ padding: '0.4rem', fontWeight: 800, color: 'var(--primary-green)' }}>Position #{item.loadingOrder}</td>
                                        <td style={{ padding: '0.4rem' }}>Stop #{item.stopSequence}</td>
                                        <td style={{ padding: '0.4rem', fontWeight: 600 }}>{item.outletName}</td>
                                        <td style={{ padding: '0.4rem', color: 'var(--text-muted)' }}>{item.orderRef}</td>
                                        <td style={{ padding: '0.4rem' }}>{item.units} pkgs</td>
                                        <td style={{ padding: '0.4rem' }}>{item.weightKg}kg • {typeof item.volumeM3 === 'number' ? item.volumeM3.toFixed(1) : item.volumeM3}m³</td>
                                        <td style={{ padding: '0.4rem' }}>
                                          <span style={{
                                            backgroundColor: item.temp === 'chilled' ? '#DBEAFE' : '#F1F5F9',
                                            color: item.temp === 'chilled' ? '#1E40AF' : 'var(--text-secondary)',
                                            padding: '0.1rem 0.4rem',
                                            borderRadius: '3px',
                                            fontWeight: 700,
                                            fontSize: '0.7rem'
                                          }}>
                                            {item.temp?.toUpperCase() || 'AMBIENT'}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Stage 2 Action Bar */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '1.5rem',
                  paddingTop: '1.25rem',
                  borderTop: '1px solid var(--border)',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}>
                  <button className="btn-secondary" onClick={() => setActiveStage(1)}>
                    <ArrowLeft size={16} />
                    <span>Back to Order Intake</span>
                  </button>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      className="btn-secondary"
                      onClick={handleAutoAllocate}
                      disabled={allocating || isPublished || unallocatedOrders.length === 0}
                    >
                      <RefreshCw size={16} />
                      <span>{allocating ? 'Solving...' : 'Re-run Allocation Engine'}</span>
                    </button>

                    <button
                      className="btn-primary"
                      onClick={() => setActiveStage(3)}
                      disabled={trips.length === 0}
                    >
                      <span>Proceed to Manifest Review (Stage 3)</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* ======================================================== */}
          {/* STAGE 3: MANIFEST REVIEW & 10-CONSTRAINT VALIDATION     */}
          {/* ======================================================== */}
          {activeStage === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* 10-Constraint Verification Banner */}
              <div style={{
                backgroundColor: isReady ? '#ECFDF5' : '#FFFBEB',
                border: isReady ? '1px solid #A7F3D0' : '1px solid #FDE68A',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <ShieldCheck size={32} color={isReady ? '#059669' : '#D97706'} />
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: isReady ? '#065F46' : '#92400E' }}>
                      {isReady ? 'Plan Passed All 10 Feasibility Constraint Checks' : '10-Constraint Engine Validation Required'}
                    </h4>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: isReady ? '#047857' : '#B45309' }}>
                      {isReady
                        ? 'Verified for vehicle availability, depot matching, reefer temperature, van-only access, payload thresholds, shift limits, and fuel quota.'
                        : 'Review manifest stop sequences below and execute constraint audit to transition plan from DRAFT to READY.'}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <button
                    className={isReady ? 'btn-secondary' : 'btn-primary'}
                    onClick={handleValidatePlan}
                    disabled={validating || isPublished || trips.length === 0}
                  >
                    <ShieldCheck size={18} />
                    <span>{validating ? 'Evaluating...' : isReady ? 'Re-Validate 10 Constraints' : 'Validate All 10 Constraints'}</span>
                  </button>

                  {isReady && (
                    <button className="btn-primary" onClick={() => setActiveStage(4)}>
                      <span>Proceed to Dock Release</span>
                      <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Interactive Trips List with Reordering */}
              <Card title={`Interactive Manifest Tuning (${trips.length} Runs)`} subtitle="Fine-tune stop sequences and remove or reassign orders prior to dock release">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {trips.map((trip) => (
                    <div
                      key={trip._id}
                      style={{
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '1.25rem',
                        backgroundColor: '#FFFFFF'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <Truck size={20} color="var(--primary-green)" />
                          <div>
                            <span style={{ fontSize: '1rem', fontWeight: 800 }}>{trip.tripRef}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.15rem' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Vehicle: <strong>{trip.vehicle?.vehicleId}</strong>
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Driver:</span>
                                {!isPublished ? (
                                  <select
                                    value={trip.driver?._id || trip.driver || ''}
                                    onChange={(e) => handleAssignDriverToTrip(trip._id, e.target.value)}
                                    style={{
                                      fontSize: '0.75rem',
                                      padding: '0.15rem 0.4rem',
                                      borderRadius: '4px',
                                      border: '1px solid var(--border)',
                                      backgroundColor: '#F1F5F9',
                                      fontWeight: 600
                                    }}
                                  >
                                    <option value="">-- Assign Driver --</option>
                                    {depotDrivers.map((d) => (
                                      <option key={d._id} value={d._id}>
                                        {d.name} {d.assignedVehicle ? `(${d.assignedVehicle.vehicleId || 'Linked'})` : ''}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <strong style={{ fontSize: '0.75rem' }}>{trip.driver?.name || 'Unassigned'}</strong>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {!isPublished && trip.orders?.length > 0 && (
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                            onClick={() => {
                              setReorderTrip(trip);
                              setReorderModalOpen(true);
                            }}
                          >
                            <ListOrdered size={14} />
                            <span>Adjust Stops / Sequence</span>
                          </button>
                        )}
                      </div>

                      {/* Stops List */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {trip.orders?.map((item, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.6rem 0.85rem',
                              border: '1px solid #F1F5F9',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: '#F8FAFC',
                              fontSize: '0.85rem'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                              <span style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--primary-green)',
                                color: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '0.75rem'
                              }}>
                                {item.stopSequence || idx + 1}
                              </span>
                              <div>
                                <span style={{ fontWeight: 700 }}>{item.order?.outlet?.name || 'Retail Outlet'}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                                  ({item.order?.orderRef} • {item.order?.outlet?.district})
                                </span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              <span>{item.order?.orderWeightKg}kg</span>
                              <span>•</span>
                              <span>{item.order?.orderVolumeM3}m³</span>
                              {item.order?.outlet?.parkingConstraint === 'van_only' && (
                                <span style={{ backgroundColor: '#FEF3C7', color: '#92400E', padding: '0.15rem 0.4rem', borderRadius: '3px', fontWeight: 700 }}>
                                  VAN ONLY
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Stage 3 Bottom Bar */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '1.5rem',
                  paddingTop: '1.25rem',
                  borderTop: '1px solid var(--border)',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}>
                  <button className="btn-secondary" onClick={() => setActiveStage(2)}>
                    <ArrowLeft size={16} />
                    <span>Back to Runs Overview</span>
                  </button>

                  <button
                    className="btn-primary"
                    onClick={() => setActiveStage(4)}
                    disabled={!isReady && !isPublished}
                    title={!isReady ? 'Validate plan before advancing to dock release' : ''}
                  >
                    <span>Proceed to Dock Release (Stage 4)</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </Card>
            </div>
          )}

          {/* ======================================================== */}
          {/* STAGE 4: DOCK RELEASE & WAREHOUSE PUBLISHING            */}
          {/* ======================================================== */}
          {activeStage === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Gatekeeper Authorization Panel */}
              <div style={{
                backgroundColor: isPublished ? '#F0FDF4' : isReady ? '#ECFDF5' : '#FEF2F2',
                border: isPublished ? '1px solid #BBF7D0' : isReady ? '1px solid #A7F3D0' : '1px solid #FECACA',
                borderRadius: 'var(--radius-lg)',
                padding: '1.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', maxWidth: '650px' }}>
                  {isPublished ? (
                    <PackageCheck size={40} color="#166534" />
                  ) : isReady ? (
                    <ShieldCheck size={40} color="#059669" />
                  ) : (
                    <Lock size={40} color="#991B1B" />
                  )}
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: isPublished ? '#166534' : isReady ? '#065F46' : '#991B1B' }}>
                      {isPublished
                        ? 'Plan Published: Live on Warehouse Dock'
                        : isReady
                        ? 'Dock Release Authorized (Status: READY)'
                        : 'Release Gate Locked: Plan Unvalidated (Status: DRAFT)'}
                    </h3>
                    <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.9rem', color: isPublished ? '#15803D' : isReady ? '#047857' : '#7F1D1D' }}>
                      {isPublished
                        ? `Published to warehouse staging docks. Generated ${trips.length} loading jobs and pushed manifests to driver consoles.`
                        : isReady
                        ? 'All 10 operational constraints verified. Publishing will dispatch runs to warehouse loaders and fleet drivers.'
                        : 'Plan cannot be published in DRAFT status. You must return to Stage 3 to validate all constraints before releasing to dock.'}
                    </p>
                  </div>
                </div>

                <div>
                  {isPublished ? (
                    <div style={{
                      backgroundColor: '#166534',
                      color: '#FFFFFF',
                      padding: '0.65rem 1.25rem',
                      borderRadius: 'var(--radius-md)',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <CheckCircle size={18} />
                      <span>Live & Active</span>
                    </div>
                  ) : isReady ? (
                    <button
                      className="btn-primary"
                      onClick={handlePublishPlan}
                      disabled={publishing || trips.length === 0}
                      style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', fontWeight: 800 }}
                    >
                      <Send size={18} />
                      <span>{publishing ? 'Dispatching to Dock...' : 'Publish Plan & Release to Dock'}</span>
                    </button>
                  ) : (
                    <button className="btn-secondary" onClick={() => setActiveStage(3)}>
                      <ArrowLeft size={16} />
                      <span>Go to Stage 3 to Validate</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Pre-Dispatch Audit Summary */}
              <Card title="Pre-Dispatch Manifest Audit" subtitle="Final configuration metrics before dock execution">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Operational Hub</span>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0.2rem 0 0 0' }}>{currentPlan?.depot} Hub</h4>
                  </div>
                  <div style={{ backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dispatched Trips</span>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0.2rem 0 0 0', color: 'var(--primary-green)' }}>{trips.length} Runs</h4>
                  </div>
                  <div style={{ backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Retail Stores Served</span>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0.2rem 0 0 0' }}>{totalStops} Outlets</h4>
                  </div>
                  <div style={{ backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Loading Jobs Created</span>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0.2rem 0 0 0', color: '#2563EB' }}>{trips.length} Jobs</h4>
                  </div>
                </div>

                {/* Runs Breakdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Dispatched Fleet Vehicles:</h4>
                  {trips.map((t, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem 1rem',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: '#FFFFFF'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <Truck size={18} color="var(--primary-green)" />
                        <span style={{ fontWeight: 800 }}>{t.tripRef}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Vehicle: {t.vehicle?.vehicleId} ({t.vehicle?.type} • {t.vehicle?.temp})
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', fontSize: '0.8rem' }}>
                        <span>Driver: <strong>{t.driver?.name || 'Unassigned'}</strong></span>
                        <Badge status={t.brand} />
                        <span style={{ fontWeight: 700 }}>{t.orders?.length || 0} Stores</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
                  <button className="btn-secondary" onClick={() => setActiveStage(3)}>
                    <ArrowLeft size={16} />
                    <span>Back to Manifest Review</span>
                  </button>
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Manual Assignment Modal */}
      {selectedOrder && (
        <AssignmentModal
          isOpen={assignModalOpen}
          onClose={() => {
            setAssignModalOpen(false);
            setSelectedOrder(null);
          }}
          order={selectedOrder}
          plan={currentPlan}
          onAssigned={() => selectPlan(currentPlan._id)}
        />
      )}

      {/* Stop Reorder Modal */}
      {reorderTrip && (
        <TripStopReorderModal
          isOpen={reorderModalOpen}
          onClose={() => {
            setReorderModalOpen(false);
            setReorderTrip(null);
          }}
          trip={reorderTrip}
          onUpdated={() => selectPlan(currentPlan._id)}
        />
      )}

      {/* Manual Override Reassignment Modal */}
      <Modal
        isOpen={overrideModalOpen}
        onClose={() => {
          setOverrideModalOpen(false);
          setOverrideTrip(null);
        }}
        title={`Override Reassignment: ${overrideTrip?.tripRef || ''}`}
      >
        <form onSubmit={handleSubmitOverride} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-sm)', padding: '0.75rem', fontSize: '0.85rem' }}>
            <span style={{ color: '#991B1B', fontWeight: 700 }}>Dispatcher Override Compliance:</span>
            <p style={{ margin: '0.2rem 0 0 0', color: '#B91C1C', fontSize: '0.8rem' }}>
              Every override of the automated solver requires a formal audit reason and validation against vehicle capacity limits.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Replacement Fleet Vehicle *</label>
            <select
              className="form-select"
              required
              value={overrideVehicleId}
              onChange={(e) => setOverrideVehicleId(e.target.value)}
            >
              <option value="">-- Choose Replacement Vehicle --</option>
              {availableVehicles.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.vehicleId} ({v.type} • {v.temp} • Cap: {v.weightCapKg}kg, {v.volumeCapM3}m³) - {v.depot}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Replacement Driver (Optional)</label>
            <select
              className="form-select"
              value={overrideDriverId}
              onChange={(e) => setOverrideDriverId(e.target.value)}
            >
              <option value="">-- Keep Linked / Auto-Select Driver --</option>
              {depotDrivers.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name} {d.assignedVehicle ? `(${d.assignedVehicle.vehicleId || 'Linked'})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Override Reason (Mandatory Audit Log) *</label>
            <textarea
              rows="3"
              required
              className="form-textarea"
              placeholder="State the operational justification for overriding the automated solver proposal..."
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setOverrideModalOpen(false);
                setOverrideTrip(null);
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={processingReassign || !overrideVehicleId || !overrideReason}
              style={{ backgroundColor: '#059669', borderColor: '#059669', fontWeight: 800 }}
            >
              <span>{processingReassign ? 'Applying Override...' : 'Confirm Reassignment Override'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
