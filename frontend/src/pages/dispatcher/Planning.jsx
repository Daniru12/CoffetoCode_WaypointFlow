import React, { useState, useEffect } from 'react';
import { planningApi } from '../../api/planning.api';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { VehicleCard } from '../../components/planning/VehicleCard';
import { AssignmentModal } from '../../components/planning/AssignmentModal';
import {
  Calendar,
  CheckCircle,
  AlertCircle,
  Truck,
  Plus,
  Send,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

export const PlanningConsole = () => {
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [trips, setTrips] = useState([]);
  const [unallocatedOrders, setUnallocatedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [validating, setValidating] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Selected Order for Assignment
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const res = await planningApi.getPlans({ depot: 'Peliyagoda' });
      const planList = res.data || [];
      setPlans(planList);

      if (planList.length > 0) {
        selectPlan(planList[0]._id);
      } else {
        // Create initial draft plan for tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const newPlanRes = await planningApi.createPlan({
          deliveryDate: tomorrow.toISOString().slice(0, 10),
          depot: 'Peliyagoda'
        });
        setCurrentPlan(newPlanRes.data);
        selectPlan(newPlanRes.data._id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectPlan = async (planId) => {
    try {
      const [planRes, unallocRes] = await Promise.all([
        planningApi.getPlanById(planId),
        planningApi.getUnallocatedOrders(planId)
      ]);
      setCurrentPlan(planRes.data.plan);
      setTrips(planRes.data.trips || []);
      setUnallocatedOrders(unallocRes.data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleValidatePlan = async () => {
    if (!currentPlan) return;
    setValidating(true);
    setMessage(null);
    setError(null);
    try {
      const res = await planningApi.validatePlan(currentPlan._id);
      const summary = res.data?.summary;
      if (res.data?.overallValid) {
        setMessage('✓ Plan passed all 10 constraint checks! Ready for publishing.');
      } else {
        setError('Plan has constraint violations across some assigned trips. Review warnings.');
      }
      selectPlan(currentPlan._id);
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

    setPublishing(true);
    setMessage(null);
    setError(null);
    try {
      const res = await planningApi.publishPlan(currentPlan._id);
      setMessage(`🚀 Plan published successfully! Created ${res.data?.loadingJobsCount || 0} Loading Jobs and ${res.data?.deliveriesCount || 0} Driver Delivery Stops.`);
      selectPlan(currentPlan._id);
    } catch (err) {
      setError(err.message);
    } finally {
      setPublishing(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading Delivery Planning Console..." />;

  const isPublished = currentPlan?.status === 'PUBLISHED';

  return (
    <div>
      {/* Header Strip */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>
              Plan: {currentPlan?.planRef || 'Central Plan'}
            </h2>
            <Badge status={currentPlan?.status} />
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Depot: <strong>{currentPlan?.depot}</strong> • Date: <strong>{currentPlan?.deliveryDate ? new Date(currentPlan.deliveryDate).toLocaleDateString() : 'N/A'}</strong>
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn-secondary"
            onClick={handleValidatePlan}
            disabled={validating || isPublished}
          >
            <ShieldCheck size={18} />
            <span>{validating ? 'Validating...' : 'Validate Constraints'}</span>
          </button>

          <button
            className="btn-primary"
            onClick={handlePublishPlan}
            disabled={publishing || isPublished || trips.length === 0}
          >
            <Send size={18} />
            <span>{publishing ? 'Publishing...' : isPublished ? 'Plan Published' : 'Publish Plan'}</span>
          </button>
        </div>
      </div>

      {message && (
        <div style={{ backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
          <CheckCircle size={20} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '1.5rem' }}>
        {/* Left Column: Unallocated Orders Queue */}
        <Card title={`Unallocated Orders (${unallocatedOrders.length})`} subtitle="Orders waiting for trip and vehicle assignment">
          {unallocatedOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              All depot orders are allocated to trips.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '650px', overflowY: 'auto' }}>
              {unallocatedOrders.map((ord) => (
                <div
                  key={ord._id}
                  style={{
                    padding: '0.85rem 1rem',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{ord.orderRef}</span>
                    <Badge status={ord.brand} />
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {ord.outlet?.name || ord.outlet?.outletId} ({ord.outlet?.district})
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>{ord.orderWeightKg}kg • {ord.orderVolumeM3}m³ • {ord.tempRequirement}</span>
                    <button
                      className="btn-primary"
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                      disabled={isPublished}
                      onClick={() => {
                        setSelectedOrder(ord);
                        setAssignModalOpen(true);
                      }}
                    >
                      Assign Vehicle
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Right Column: Assigned Trips & Vehicles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Card title={`Assigned Trips (${trips.length})`} subtitle="Vehicles with allocated store deliveries">
            {trips.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                No vehicles currently assigned. Click "Assign Vehicle" on any unallocated order to initialize a trip.
              </div>
            ) : (
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
                    {/* Trip Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Truck size={20} color="var(--primary-green)" />
                        <div>
                          <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>
                            {trip.tripRef} (Shift #{trip.tripNumber})
                          </h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Vehicle: <strong>{trip.vehicle?.vehicleId}</strong> ({trip.vehicle?.type} • {trip.vehicle?.temp}) • Driver: <strong>{trip.driver?.name || 'Unassigned'}</strong>
                          </span>
                        </div>
                      </div>
                      <Badge status={trip.status} />
                    </div>

                    {/* Capacity Progress Strip */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', backgroundColor: '#F8FAFC', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Weight Load</span>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                          {trip.totalWeightKg} / {trip.vehicle?.weightCapKg} kg
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Volume Load</span>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                          {trip.totalVolumeM3?.toFixed(1)} / {trip.vehicle?.volumeCapM3} m³
                        </div>
                      </div>
                    </div>

                    {/* Stops List */}
                    <div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        Delivery Stops ({trip.orders?.length || 0}):
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.4rem' }}>
                        {trip.orders?.map((item, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.5rem 0.75rem',
                              border: '1px solid #F1F5F9',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.8rem'
                            }}
                          >
                            <span>
                              <strong>#{item.stopSequence || idx + 1}</strong> • {item.order?.orderRef} ({item.order?.outlet?.name || 'Store'})
                            </span>
                            <span style={{ color: 'var(--text-muted)' }}>
                              {item.order?.orderWeightKg}kg • {item.order?.orderVolumeM3}m³
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Assignment Modal */}
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
    </div>
  );
};
