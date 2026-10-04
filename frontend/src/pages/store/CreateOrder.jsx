import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersApi } from '../../api/orders.api';
import { Card } from '../../components/common/Card';
import { Clock, Plus, Trash2, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const CreateOrder = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDateStr = tomorrow.toISOString().slice(0, 10);

  const defaultBrand = user?.outlet?.brand || 'Fresh';
  const defaultOpen = user?.outlet?.windowOpenTime || '06:00';
  const defaultClose = user?.outlet?.windowCloseTime || '08:00';

  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState(defaultDateStr);
  const [brand, setBrand] = useState(defaultBrand);
  const [tempRequirement, setTempRequirement] = useState('ambient');
  const [windowStart, setWindowStart] = useState(defaultOpen);
  const [windowEnd, setWindowEnd] = useState(defaultClose);

  const [items, setItems] = useState([
    { itemName: 'Carton Goods', qty: 20, unit: 'cartons', weightKg: 200, volumeM3: 1.5 }
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successNotice, setSuccessNotice] = useState(null);

  const addItemRow = () => {
    setItems([...items, { itemName: '', qty: 10, unit: 'boxes', weightKg: 100, volumeM3: 0.8 }]);
  };

  const removeItemRow = (idx) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx, field, value) => {
    const updated = [...items];
    updated[idx][field] = value;
    setItems(updated);
  };

  // Aggregated totals
  const totalUnits = items.reduce((acc, it) => acc + (Number(it.qty) || 0), 0);
  const totalWeight = items.reduce((acc, it) => acc + (Number(it.weightKg) || 0), 0);
  const totalVolume = items.reduce((acc, it) => acc + (Number(it.volumeM3) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Rule enforcement: Style and Tech cannot place chilled orders
    if (brand !== 'Fresh' && tempRequirement === 'chilled') {
      setError(`Brand '${brand}' cannot place chilled orders. Only 'Fresh' supports refrigeration.`);
      setLoading(false);
      return;
    }

    try {
      const res = await ordersApi.createOrder({
        outletId: user?.outlet?._id || user?.outlet,
        requestedDeliveryDate,
        tempRequirement,
        items,
        orderUnits: totalUnits,
        orderWeightKg: totalWeight,
        orderVolumeM3: totalVolume,
        deliveryWindow: {
          start: windowStart,
          end: windowEnd
        }
      });

      if (res.data?.notice) {
        setSuccessNotice(res.data.notice);
      } else {
        navigate('/store/orders');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <button
        onClick={() => navigate('/store/dashboard')}
        className="btn-secondary"
        style={{ marginBottom: '1.25rem', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
      >
        <ArrowLeft size={16} />
        <span>Back to Dashboard</span>
      </button>

      <Card title="Place Store Replenishment Order" subtitle="Submit inventory replenishment for next delivery run">
        {/* Cutoff Notice */}
        <div style={{
          backgroundColor: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem 1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.825rem',
          color: '#1E40AF'
        }}>
          <Clock size={18} />
          <span>Cutoff Notice: Orders submitted after 16:00 are automatically scheduled for the subsequent delivery shift.</span>
        </div>

        {error && (
          <div style={{ backgroundColor: '#FEE2E2', color: '#991B1B', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        {successNotice ? (
          <div style={{
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            color: '#065F46',
            padding: '1.5rem',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center'
          }}>
            <CheckCircle size={36} style={{ color: '#059669', margin: '0 auto 0.5rem' }} />
            <h4 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem' }}>Order Submitted Successfully</h4>
            <p style={{ fontSize: '0.875rem', marginBottom: '1.25rem' }}>{successNotice}</p>
            <button className="btn-primary" onClick={() => navigate('/store/orders')}>
              Go to My Orders
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Requested Delivery Date</label>
                <input
                  type="date"
                  required
                  className="form-input"
                  value={requestedDeliveryDate}
                  onChange={(e) => setRequestedDeliveryDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Brand</label>
                <select
                  className="form-select"
                  value={brand}
                  onChange={(e) => {
                    const b = e.target.value;
                    setBrand(b);
                    if (b !== 'Fresh') setTempRequirement('ambient');
                  }}
                >
                  <option value="Fresh">Fresh (Produce & Dairy)</option>
                  <option value="Style">Style (Apparel & Fashion)</option>
                  <option value="Tech">Tech (Electronics)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Temperature Requirement</label>
                <select
                  className="form-select"
                  value={tempRequirement}
                  onChange={(e) => setTempRequirement(e.target.value)}
                  disabled={brand !== 'Fresh'}
                >
                  <option value="ambient">Ambient (Normal Cargo)</option>
                  <option value="chilled" disabled={brand !== 'Fresh'}>Chilled (Reefer Vehicle Required)</option>
                </select>
                {brand !== 'Fresh' && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>*Chilled is only supported for Fresh</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Window Open Time</label>
                <input
                  type="time"
                  className="form-input"
                  value={windowStart}
                  onChange={(e) => setWindowStart(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Window Close Time</label>
                <input
                  type="time"
                  className="form-input"
                  value={windowEnd}
                  onChange={(e) => setWindowEnd(e.target.value)}
                />
              </div>
            </div>

            {/* Line Items Table */}
            <div style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>Line Items</span>
                <button
                  type="button"
                  onClick={addItemRow}
                  className="btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                >
                  <Plus size={14} />
                  <span>Add Item</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {items.map((it, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Item name"
                      className="form-input"
                      value={it.itemName}
                      onChange={(e) => updateItem(idx, 'itemName', e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      min="1"
                      className="form-input"
                      value={it.qty}
                      onChange={(e) => updateItem(idx, 'qty', Number(e.target.value))}
                    />
                    <input
                      type="text"
                      placeholder="Unit (cases)"
                      className="form-input"
                      value={it.unit}
                      onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="Weight (kg)"
                      min="0"
                      className="form-input"
                      value={it.weightKg}
                      onChange={(e) => updateItem(idx, 'weightKg', Number(e.target.value))}
                    />
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Volume (m³)"
                      min="0"
                      className="form-input"
                      value={it.volumeM3}
                      onChange={(e) => updateItem(idx, 'volumeM3', Number(e.target.value))}
                    />
                    <button
                      type="button"
                      onClick={() => removeItemRow(idx)}
                      disabled={items.length <= 1}
                      style={{ color: '#DC2626', padding: '0.4rem', opacity: items.length <= 1 ? 0.4 : 1 }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Load Totals Summary Banner */}
            <div style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1.25rem',
              display: 'flex',
              justifyContent: 'space-around',
              marginBottom: '1.5rem',
              fontSize: '0.85rem'
            }}>
              <div>Total Units: <strong>{totalUnits}</strong></div>
              <div>Estimated Weight: <strong>{totalWeight} kg</strong></div>
              <div>Estimated Volume: <strong>{totalVolume.toFixed(2)} m³</strong></div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="btn-secondary" onClick={() => navigate('/store/dashboard')}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Submitting Order...' : 'Submit Replenishment Order'}
              </button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};
