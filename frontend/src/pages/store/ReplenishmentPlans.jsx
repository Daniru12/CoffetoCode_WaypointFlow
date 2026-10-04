import React, { useState, useEffect } from 'react';
import { ordersApi } from '../../api/orders.api';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { Calendar, PlusCircle, Trash2, Edit2, Store } from 'lucide-react';
import { useOutlet } from '../../context/OutletContext';

export const ReplenishmentPlans = () => {
  const { outlets } = useOutlet();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  
  // Form State
  const [planName, setPlanName] = useState('');
  const [frequency, setFrequency] = useState('WEEKLY');
  const [scheduleDay, setScheduleDay] = useState(1);
  const [brand, setBrand] = useState('Fresh');
  const [tempRequirement, setTempRequirement] = useState('ambient');
  const [selectedOutlets, setSelectedOutlets] = useState([]);
  const [items, setItems] = useState([{ itemName: '', qty: 1 }]);

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

  const handleOpenModal = (plan = null) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanName(plan.planName);
      setFrequency(plan.frequency);
      setScheduleDay(plan.scheduleDay);
      setBrand(plan.brand);
      setTempRequirement(plan.tempRequirement);
      setSelectedOutlets(plan.outlets.map(o => o._id));
      setItems(plan.items.length ? plan.items : [{ itemName: '', qty: 1 }]);
    } else {
      setEditingPlan(null);
      setPlanName('');
      setFrequency('WEEKLY');
      setScheduleDay(1);
      setBrand('Fresh');
      setTempRequirement('ambient');
      setSelectedOutlets([]);
      setItems([{ itemName: '', qty: 1 }]);
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const data = {
      planName, frequency, scheduleDay, brand, tempRequirement,
      outlets: selectedOutlets,
      items: items.filter(i => i.itemName)
    };
    try {
      if (editingPlan) {
        await ordersApi.updateReplenishmentPlan(editingPlan._id, data);
      } else {
        await ordersApi.createReplenishmentPlan(data);
      }
      setShowModal(false);
      fetchPlans();
    } catch (err) {
      console.error(err);
      alert('Failed to save plan');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this plan?')) {
      try {
        await ordersApi.deleteReplenishmentPlan(id);
        fetchPlans();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const toggleOutlet = (id) => {
    setSelectedOutlets(prev => prev.includes(id) ? prev.filter(o => o !== id) : [...prev, id]);
  };

  if (loading) return <LoadingSpinner text="Loading Replenishment Plans..." />;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={24} color="var(--primary)" /> Replenishment Plans
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>Manage weekly or monthly recurring orders for your outlets.</p>
        </div>
        <button className="btn-primary" onClick={() => handleOpenModal()}>
          <PlusCircle size={18} /> Create Plan
        </button>
      </div>

      <Card>
        {plans.length === 0 ? (
          <EmptyState title="No plans found" message="Create a recurring replenishment plan to automate your orders." />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '1rem' }}>Plan Name</th>
                <th style={{ padding: '1rem' }}>Frequency</th>
                <th style={{ padding: '1rem' }}>Schedule</th>
                <th style={{ padding: '1rem' }}>Brand & Temp</th>
                <th style={{ padding: '1rem' }}>Outlets Applied</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map(p => (
                <tr key={p._id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{p.planName}</td>
                  <td style={{ padding: '1rem' }}>{p.frequency}</td>
                  <td style={{ padding: '1rem' }}>{p.frequency === 'WEEKLY' ? `Day ${p.scheduleDay}` : `Date ${p.scheduleDay}`}</td>
                  <td style={{ padding: '1rem' }}>{p.brand} ({p.tempRequirement})</td>
                  <td style={{ padding: '1rem' }}>{p.outlets.length} outlet(s)</td>
                  <td style={{ padding: '1rem', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button className="btn-secondary" style={{ padding: '0.4rem', borderRadius: '4px' }} onClick={() => handleOpenModal(p)}>
                      <Edit2 size={16} />
                    </button>
                    <button className="btn-secondary" style={{ padding: '0.4rem', borderRadius: '4px', color: '#DC2626' }} onClick={() => handleDelete(p._id)}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Modal for Create/Edit Plan */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', width: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0 }}>{editingPlan ? 'Edit Plan' : 'Create Replenishment Plan'}</h3>
            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Plan Name</label>
                  <input required className="input-field" value={planName} onChange={e => setPlanName(e.target.value)} placeholder="e.g., Weekly Fresh Restock" style={{ width: '100%', padding: '0.5rem' }} />
                </div>
                
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Frequency</label>
                    <select className="input-field" value={frequency} onChange={e => setFrequency(e.target.value)} style={{ width: '100%', padding: '0.5rem' }}>
                      <option value="WEEKLY">Weekly</option>
                      <option value="MONTHLY">Monthly</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>{frequency === 'WEEKLY' ? 'Day of Week (1=Mon, 7=Sun)' : 'Day of Month'}</label>
                    <input type="number" required min="1" max={frequency === 'WEEKLY' ? 7 : 28} className="input-field" value={scheduleDay} onChange={e => setScheduleDay(Number(e.target.value))} style={{ width: '100%', padding: '0.5rem' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Brand</label>
                    <select className="input-field" value={brand} onChange={e => setBrand(e.target.value)} style={{ width: '100%', padding: '0.5rem' }}>
                      <option value="Fresh">Fresh</option>
                      <option value="Style">Style</option>
                      <option value="Tech">Tech</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Temp Requirement</label>
                    <select className="input-field" value={tempRequirement} onChange={e => setTempRequirement(e.target.value)} style={{ width: '100%', padding: '0.5rem' }}>
                      <option value="ambient">Ambient</option>
                      <option value="chilled">Chilled</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Assign to Outlets</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border)', padding: '0.5rem', borderRadius: '4px' }}>
                    {outlets.map(o => (
                      <label key={o._id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                        <input type="checkbox" checked={selectedOutlets.includes(o._id)} onChange={() => toggleOutlet(o._id)} />
                        {o.name || o.outletId}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Items</label>
                  {items.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <input placeholder="Item name" className="input-field" value={item.itemName} onChange={e => { const newItems = [...items]; newItems[idx].itemName = e.target.value; setItems(newItems); }} style={{ flex: 2, padding: '0.5rem' }} />
                      <input type="number" min="1" className="input-field" value={item.qty} onChange={e => { const newItems = [...items]; newItems[idx].qty = Number(e.target.value); setItems(newItems); }} style={{ flex: 1, padding: '0.5rem' }} />
                      <button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))} style={{ color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setItems([...items, { itemName: '', qty: 1 }])} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>+ Add Item</button>
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Plan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
