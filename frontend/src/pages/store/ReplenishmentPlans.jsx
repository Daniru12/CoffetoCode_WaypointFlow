import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersApi } from '../../api/orders.api';
import { simulationApi } from '../../api/simulation.api';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Calendar,
  PlusCircle,
  Trash2,
  Edit2,
  Play,
  Pause,
  FileText,
  Zap,
  Clock,
  CheckCircle,
  AlertTriangle,
  X
} from 'lucide-react';
import { useOutlet } from '../../context/OutletContext';

export const ReplenishmentPlans = () => {
  const navigate = useNavigate();
  const { outlets } = useOutlet();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Order Generation Modal State
  const [selectedPlanForOrders, setSelectedPlanForOrders] = useState(null);
  const [targetDate, setTargetDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [generating, setGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState(null);
  const [simulationClock, setSimulationClock] = useState(null);

  useEffect(() => {
    fetchPlans();
    fetchSimulationClock();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await ordersApi.getReplenishmentPlans();
      setPlans(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSimulationClock = async () => {
    try {
      const res = await simulationApi.getSimulationTime();
      setSimulationClock(res.data);
    } catch (err) {
      console.error('Failed to fetch simulation clock', err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this replenishment plan?')) {
      try {
        await ordersApi.deleteReplenishmentPlan(id);
        fetchPlans();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const toggleStatus = async (plan) => {
    const newStatus = plan.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      await ordersApi.updateReplenishmentPlan(plan._id, { status: newStatus });
      fetchPlans();
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const openGenerateModal = (plan) => {
    setSelectedPlanForOrders(plan);
    setGenerationResult(null);
  };

  const handleGenerateOrders = async () => {
    if (!selectedPlanForOrders) return;
    setGenerating(true);
    try {
      const res = await ordersApi.generateOrdersFromPlan(selectedPlanForOrders._id, { targetDate });
      setGenerationResult(res.data);
    } catch (err) {
      console.error('Failed to generate orders from plan', err);
      alert(err.response?.data?.message || 'Failed to generate orders');
    } finally {
      setGenerating(false);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'ACTIVE': return { bg: '#DCFCE7', text: '#166534' };
      case 'PAUSED': return { bg: '#FEF9C3', text: '#854D0E' };
      case 'DRAFT': default: return { bg: '#F1F5F9', text: '#475569' };
    }
  };

  if (loading) return <LoadingSpinner text="Loading Replenishment Plans..." />;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1280px', margin: '0 auto', paddingBottom: '5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={24} color="var(--primary)" /> Replenishment Plans
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
            Manage recurring delivery templates and generate retail orders for central fleet dispatch.
          </p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/store/replenishment-plans/create')}>
          <PlusCircle size={18} /> Create Plan
        </button>
      </div>

      {plans.length === 0 ? (
        <EmptyState
          title="No plans found"
          message="Create a single reusable plan to automate orders for your outlets."
          icon={FileText}
          action={<button className="btn-primary" onClick={() => navigate('/store/replenishment-plans/create')}>Create Plan</button>}
        />
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {plans.map(p => {
            const statusConfig = getStatusColor(p.status);
            return (
              <Card key={p._id} style={{ padding: '0' }}>
                <div style={{ padding: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1, minWidth: '300px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{p.planName}</h3>
                      <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: statusConfig.bg, color: statusConfig.text }}>
                        {p.status}
                      </span>
                    </div>
                    {p.description && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{p.description}</div>}
                    
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                      <span><strong>Outlets:</strong> {p.outlets?.length || 0}</span>
                      <span><strong>Freq:</strong> {p.frequency}</span>
                      {p.frequency === 'WEEKLY' && <span><strong>Days:</strong> {p.deliveryDays?.join(', ')}</span>}
                      <span><strong>Cargo:</strong> <span style={{ textTransform: 'capitalize' }}>{p.cargoType}</span></span>
                      <span><strong>Items:</strong> {p.items?.length || 0} items</span>
                      <span><strong>Est. Load:</strong> {p.estimatedTotalWeightKg || 0} kg / {p.estimatedTotalVolumeM3 || 0} m³</span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {p.status === 'ACTIVE' && (
                      <button
                        className="btn-primary"
                        style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#0284C7', borderColor: '#0284C7' }}
                        onClick={() => openGenerateModal(p)}
                      >
                        <Zap size={15} /> Generate Orders
                      </button>
                    )}

                    {p.status !== 'DRAFT' && (
                      <button className="btn-secondary" onClick={() => toggleStatus(p)} title={p.status === 'ACTIVE' ? 'Pause Plan' : 'Resume Plan'}>
                        {p.status === 'ACTIVE' ? <Pause size={16} /> : <Play size={16} />}
                      </button>
                    )}
                    <button className="btn-secondary" onClick={() => navigate(`/store/replenishment-plans/${p._id}`)}>
                      <Edit2 size={16} /> Edit
                    </button>
                    <button className="btn-secondary" style={{ color: '#DC2626' }} onClick={() => handleDelete(p._id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* GENERATE ORDERS MODAL */}
      {selectedPlanForOrders && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#FFF',
            borderRadius: 'var(--radius-lg)',
            maxWidth: '560px',
            width: '100%',
            padding: '1.75rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Zap size={22} color="#0284C7" />
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                  Generate Retail Orders for Run
                </h3>
              </div>
              <button
                onClick={() => setSelectedPlanForOrders(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {generationResult ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <CheckCircle size={48} color="#16A34A" style={{ margin: '0 auto 0.75rem' }} />
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 800 }}>Orders Created Successfully!</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                  {generationResult.message || `Created ${generationResult.generatedCount} confirmed retail order(s) for central dispatch.`}
                </p>

                <div style={{ background: '#F8FAFC', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', textAlign: 'left', fontSize: '0.85rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div><strong>Orders Generated:</strong> {generationResult.generatedCount}</div>
                  <div><strong>Dispatch Cycle:</strong> <span style={{ fontWeight: 700, color: generationResult.dispatchCycle === 'NEXT_CYCLE' ? '#EA580C' : '#16A34A' }}>{generationResult.dispatchCycle}</span></div>
                  <div><strong>Scheduled Date:</strong> {new Date(generationResult.scheduledDispatchDate).toLocaleDateString()}</div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  <button className="btn-secondary" onClick={() => setSelectedPlanForOrders(null)}>
                    Close
                  </button>
                  <button className="btn-primary" onClick={() => { setSelectedPlanForOrders(null); navigate('/store/orders'); }}>
                    View in My Orders
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0 0 1rem 0' }}>
                  This will generate confirmed retail delivery orders for each of the <strong>{selectedPlanForOrders.outlets?.length || 0} outlet(s)</strong> assigned to <strong>"{selectedPlanForOrders.planName}"</strong> and deduct required items from your personal store inventory.
                </p>

                {/* Cutoff Check Notice */}
                {simulationClock && (
                  <div style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '1rem',
                    fontSize: '0.8rem',
                    backgroundColor: simulationClock.isCutoffPassed ? '#FFFBEB' : '#F0FDF4',
                    border: `1px solid ${simulationClock.isCutoffPassed ? '#FDE68A' : '#BBF7D0'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <Clock size={16} color={simulationClock.isCutoffPassed ? '#D97706' : '#16A34A'} />
                    <div>
                      <strong>Colombo Time ({simulationClock.colomboTime}):</strong>{' '}
                      {simulationClock.isCutoffPassed
                        ? '16:00 Cutoff passed. Target runs will queue for next dispatch cycle.'
                        : 'Pre-cutoff active. Orders will dispatch in tomorrow\'s operating cycle.'}
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Target Delivery Date *
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    required
                  />
                </div>

                {/* Plan Summary Card */}
                <div style={{ background: '#F8FAFC', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '0.8rem', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div><strong>Cargo Type:</strong> {selectedPlanForOrders.cargoType}</div>
                  <div><strong>Frequency:</strong> {selectedPlanForOrders.frequency}</div>
                  <div><strong>Items / Outlet:</strong> {selectedPlanForOrders.items?.length || 0}</div>
                  <div><strong>Total Outlets:</strong> {selectedPlanForOrders.outlets?.length || 0}</div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setSelectedPlanForOrders(null)}
                    disabled={generating}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleGenerateOrders}
                    disabled={generating}
                    style={{ backgroundColor: '#0284C7', borderColor: '#0284C7' }}
                  >
                    {generating ? 'Synthesizing Orders...' : 'Generate & Queue for Dispatch'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
