import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersApi } from '../../api/orders.api';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Calendar, PlusCircle, Trash2, Edit2, Play, Pause, FileText } from 'lucide-react';
import { useOutlet } from '../../context/OutletContext';

export const ReplenishmentPlans = () => {
  const navigate = useNavigate();
  const { outlets } = useOutlet();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await ordersApi.getReplenishmentPlans();
      setPlans(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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

  const getStatusColor = (status) => {
    switch(status) {
      case 'ACTIVE': return { bg: '#DCFCE7', text: '#166534' };
      case 'PAUSED': return { bg: '#FEF9C3', text: '#854D0E' };
      case 'DRAFT': default: return { bg: '#F1F5F9', text: '#475569' };
    }
  };

  if (loading) return <LoadingSpinner text="Loading Replenishment Plans..." />;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={24} color="var(--primary)" /> Replenishment Plans
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>Manage reusable delivery plans across multiple outlets.</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/store/replenishment-plans/create')}>
          <PlusCircle size={18} /> Create Plan
        </button>
      </div>

      {plans.length === 0 ? (
        <EmptyState title="No plans found" message="Create a single reusable plan to automate orders for your outlets." icon={FileText} action={<button className="btn-primary" onClick={() => navigate('/store/replenishment-plans/create')}>Create Plan</button>} />
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
                      <span><strong>Outlets:</strong> {p.outlets.length}</span>
                      <span><strong>Freq:</strong> {p.frequency}</span>
                      {p.frequency === 'WEEKLY' && <span><strong>Days:</strong> {p.deliveryDays?.join(', ')}</span>}
                      <span><strong>Cargo:</strong> <span style={{ textTransform: 'capitalize' }}>{p.cargoType}</span></span>
                      <span><strong>Est. Load:</strong> {p.estimatedTotalWeightKg} kg / {p.estimatedTotalVolumeM3} m³</span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
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
    </div>
  );
};
