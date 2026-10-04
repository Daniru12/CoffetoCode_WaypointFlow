import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ordersApi } from '../../api/orders.api';
import { inventoryApi } from '../../api/inventory.api';
import { useOutlet } from '../../context/OutletContext';
import { Card } from '../../components/common/Card';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Search, PlusCircle, Trash2, ArrowLeft, Save, CheckCircle, AlertTriangle, Send } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const CATEGORIES = [
  'Food & Grocery',
  'Electrical & Electronics',
  'Clothing & Textiles',
  'Household & Cleaning',
  'Personal Care & Health'
];

export const ReplenishmentPlanForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { outlets } = useOutlet();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inventoryItems, setInventoryItems] = useState([]); // Master Catalog
  const [storeInventory, setStoreInventory] = useState([]); // Store Manager's actual stock
  
  // Form State
  const [planName, setPlanName] = useState('');
  const [frequency, setFrequency] = useState('WEEKLY');
  const [deliveryDays, setDeliveryDays] = useState(['Monday']); // For WEEKLY
  
  // For MONTHLY
  const [monthlyScheduleType, setMonthlyScheduleType] = useState('SPECIFIC_DATE');
  const [monthlyDate, setMonthlyDate] = useState('1'); // 1-31
  const [monthlyWeekday, setMonthlyWeekday] = useState('First Monday');
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [noEndDate, setNoEndDate] = useState(true);
  
  const [selectedOutlets, setSelectedOutlets] = useState([]);
  const [outletSearch, setOutletSearch] = useState('');
  
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [selectedInventoryItems, setSelectedInventoryItems] = useState({}); // { itemId: { ...item, requestedQty } }
  
  const [shortages, setShortages] = useState([]);

  useEffect(() => {
    fetchInventory();
    if (id) {
      loadPlan();
    }
  }, [id]);

  const fetchInventory = async () => {
    try {
      const storeRes = await inventoryApi.getStoreManagerInventory(user?._id || user?.id);
      setInventoryItems(storeRes.data || []);
      setStoreInventory(storeRes.data || []);
    } catch (error) {
      console.error('Failed to fetch inventory', error);
    }
  };

  const loadPlan = async () => {
    setLoading(true);
    try {
      const res = await ordersApi.getReplenishmentPlans();
      const plan = res.data.find(p => p._id === id);
      if (plan) {
        setPlanName(plan.planName || '');
        setFrequency(plan.frequency || 'WEEKLY');
        setDeliveryDays(plan.deliveryDays || []);
        if (plan.monthlyScheduleType) setMonthlyScheduleType(plan.monthlyScheduleType);
        if (plan.monthlyScheduleDetails) {
          if (plan.monthlyScheduleType === 'SPECIFIC_DATE') setMonthlyDate(plan.monthlyScheduleDetails.date || '1');
          if (plan.monthlyScheduleType === 'SPECIFIC_WEEKDAY') setMonthlyWeekday(plan.monthlyScheduleDetails.weekday || 'First Monday');
        }
        setStartDate(plan.startDate ? plan.startDate.split('T')[0] : '');
        setEndDate(plan.endDate ? plan.endDate.split('T')[0] : '');
        setNoEndDate(!plan.endDate);
        setSelectedOutlets(plan.outlets.map(o => typeof o === 'object' ? o._id : o));
        
        // Reconstruct selected items
        const loadedItems = {};
        if (plan.items && Array.isArray(plan.items)) {
           plan.items.forEach(pi => {
             loadedItems[pi.itemName] = {
               _id: pi.itemName, // We use itemName as id if item doesn't have an explicit ref
               itemName: pi.itemName,
               requestedQty: pi.qty,
               unit: pi.unit,
               temperatureRequirement: pi.temperatureRequirement || 'Ambient',
             };
           });
        }
        setSelectedInventoryItems(loadedItems);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const determineTemperature = (item) => {
    const temp = item?.extraData?.temperatureRequirement || item.temperatureRequirement;
    if (temp && temp.toLowerCase().includes('chilled')) return 'Chilled';
    const name = (item?.itemName || '').toLowerCase();
    if (name.includes('frozen') || name.includes('ice') || name.includes('milk') || name.includes('meat') || name.includes('chilled')) return 'Chilled';
    return 'Ambient';
  };

  const handleSave = async (isDraft = false) => {
    if (!planName) return alert('Plan Name is required');
    if (selectedOutlets.length === 0) return alert('At least one outlet must be assigned');
    if (!startDate) return alert('Start Date is required');
    
    const itemsList = Object.values(selectedInventoryItems);
    if (itemsList.length === 0) return alert('At least one item is required');

    setSaving(true);
    setShortages([]);
    
    // Check for shortages if activating
    if (!isDraft) {
      const currentShortages = [];
      for (const item of itemsList) {
        const totalRequired = item.requestedQty * selectedOutlets.length;
        const storeItem = storeInventory.find(si => si.itemCode === item.itemCode);
        const availableQty = storeItem ? storeItem.quantity : 0;
        
        if (totalRequired > availableQty) {
          currentShortages.push({
            itemCode: item.itemCode || item.itemName, // Fallback if no itemCode
            itemName: item.itemName,
            requiredQuantity: totalRequired,
            availableQuantity: availableQty,
            shortageQuantity: totalRequired - availableQty
          });
        }
      }

      if (currentShortages.length > 0) {
        setShortages(currentShortages);
        setSaving(false);
        return; // Block activation
      }
    }
    
    // Auto-calculate cargo type based on items
    const hasChilled = itemsList.some(item => determineTemperature(item) === 'Chilled');
    const calculatedCargoType = hasChilled ? 'chilled' : 'ambient';

    const data = {
      planName,
      status: isDraft ? 'DRAFT' : 'ACTIVE',
      outlets: selectedOutlets,
      frequency,
      deliveryDays: frequency === 'WEEKLY' ? deliveryDays : [],
      monthlyScheduleType: frequency === 'MONTHLY' ? monthlyScheduleType : undefined,
      monthlyScheduleDetails: frequency === 'MONTHLY' ? {
        date: monthlyScheduleType === 'SPECIFIC_DATE' ? monthlyDate : undefined,
        weekday: monthlyScheduleType === 'SPECIFIC_WEEKDAY' ? monthlyWeekday : undefined
      } : undefined,
      startDate,
      endDate: noEndDate ? null : endDate,
      brand: outlets.find(o => selectedOutlets.includes(o._id))?.brand || 'Fresh',
      cargoType: calculatedCargoType,
      items: itemsList.map(item => ({
        itemName: item.itemName,
        qty: item.requestedQty,
        unit: item.unit || 'units',
        temperatureRequirement: determineTemperature(item),
        weightKg: item.weightKg || (item.requestedQty * 2.5),
        volumeM3: item.volumeM3 || (item.requestedQty * 0.015)
      })),
      estimatedTotalWeightKg: Math.round(
        itemsList.reduce((acc, it) => acc + (Number(it.requestedQty) || 1) * 2.5, 0) * (selectedOutlets.length || 1) * 100
      ) / 100,
      estimatedTotalVolumeM3: Math.round(
        itemsList.reduce((acc, it) => acc + (Number(it.requestedQty) || 1) * 0.015, 0) * (selectedOutlets.length || 1) * 1000
      ) / 1000,
    };

    try {
      if (id) {
        await ordersApi.updateReplenishmentPlan(id, data);
      } else {
        await ordersApi.createReplenishmentPlan(data);
      }
      navigate('/store/replenishment-plans');
    } catch (err) {
      console.error(err);
      alert('Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestStock = async () => {
    try {
      setSaving(true);
      await inventoryApi.requestStock({ items: shortages, storeManagerId: user?._id || user?.id });
      alert('Stock request sent to Warehouse Manager successfully. You can save this plan as a draft and activate it once the stock is available.');
      setShortages([]);
    } catch (err) {
      console.error(err);
      alert('Failed to request stock');
    } finally {
      setSaving(false);
    }
  };

  // Outlet Filtering
  const filteredOutlets = useMemo(() => {
    return outlets.filter(o => {
      const matchSearch = (o.name || '').toLowerCase().includes(outletSearch.toLowerCase()) || 
                          (o.outletId || '').toLowerCase().includes(outletSearch.toLowerCase());
      return matchSearch;
    });
  }, [outlets, outletSearch]);

  const toggleOutlet = (oId) => {
    setSelectedOutlets(prev => prev.includes(oId) ? prev.filter(id => id !== oId) : [...prev, oId]);
  };

  const handleSelectAllOutlets = (e) => {
    if (e.target.checked) {
      setSelectedOutlets(filteredOutlets.map(o => o._id));
    } else {
      setSelectedOutlets([]);
    }
  };

  // Inventory logic
  const itemsByCategory = useMemo(() => {
    const grouped = {};
    CATEGORIES.forEach(cat => grouped[cat] = []);
    inventoryItems.forEach(item => {
      const cat = item.category || 'Food & Grocery'; // Default category
      if (grouped[cat]) {
        grouped[cat].push(item);
      } else {
        grouped['Food & Grocery'].push(item);
      }
    });
    return grouped;
  }, [inventoryItems]);

  const toggleInventoryItem = (item, checked) => {
    setSelectedInventoryItems(prev => {
      const newItems = { ...prev };
      if (checked) {
        newItems[item._id] = { ...item, requestedQty: 1 };
      } else {
        delete newItems[item._id];
      }
      return newItems;
    });
  };

  const updateItemQty = (itemId, qty) => {
    setSelectedInventoryItems(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], requestedQty: Number(qty) }
    }));
  };

  if (loading) return <LoadingSpinner text="Loading Plan..." />;

  const selectedItemsList = Object.values(selectedInventoryItems);
  const totalItemsCount = selectedItemsList.length;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1000px', margin: '0 auto', paddingBottom: '5rem' }}>
      <button onClick={() => navigate('/store/replenishment-plans')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', padding: 0 }}>
        <ArrowLeft size={16} /> Back to Plans
      </button>

      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1.5rem' }}>
        {id ? 'Edit Replenishment Plan' : 'Create Replenishment Plan'}
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* 1. PLAN DETAILS */}
        <Card title="1. PLAN DETAILS">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Plan Name *</label>
              <input className="input-field" value={planName} onChange={e => setPlanName(e.target.value)} placeholder="e.g. Weekly Colombo Stocking" style={{ width: '100%', padding: '0.6rem' }} />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Plan Frequency *</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="radio" name="freq" checked={frequency === 'WEEKLY'} onChange={() => setFrequency('WEEKLY')} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Weekly</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="radio" name="freq" checked={frequency === 'MONTHLY'} onChange={() => setFrequency('MONTHLY')} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Monthly</span>
                </label>
              </div>
            </div>

            {frequency === 'WEEKLY' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Recurring Delivery Days</label>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                    <label key={day} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: deliveryDays.includes(day) ? '#E0F2FE' : '#F1F5F9', padding: '0.4rem 0.8rem', borderRadius: '999px', border: `1px solid ${deliveryDays.includes(day) ? '#BAE6FD' : 'transparent'}`, cursor: 'pointer' }}>
                      <input type="checkbox" checked={deliveryDays.includes(day)} onChange={() => setDeliveryDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])} style={{ display: 'none' }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: deliveryDays.includes(day) ? 600 : 400, color: deliveryDays.includes(day) ? '#0369A1' : '#475569' }}>{day}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {frequency === 'MONTHLY' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Schedule Type</label>
                  <select className="input-field" value={monthlyScheduleType} onChange={e => setMonthlyScheduleType(e.target.value)} style={{ width: '100%', padding: '0.6rem' }}>
                    <option value="SPECIFIC_DATE">Specific Date of Month</option>
                    <option value="SPECIFIC_WEEKDAY">Specific Weekday of Month</option>
                  </select>
                </div>
                <div>
                  {monthlyScheduleType === 'SPECIFIC_DATE' ? (
                    <>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Date</label>
                      <select className="input-field" value={monthlyDate} onChange={e => setMonthlyDate(e.target.value)} style={{ width: '100%', padding: '0.6rem' }}>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Weekday Pattern</label>
                      <select className="input-field" value={monthlyWeekday} onChange={e => setMonthlyWeekday(e.target.value)} style={{ width: '100%', padding: '0.6rem' }}>
                        {['First Monday', 'First Friday', 'Last Friday', 'Last Day of Month'].map(w => (
                          <option key={w} value={w}>{w}</option>
                        ))}
                      </select>
                    </>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Start Date *</label>
                <input type="date" className="input-field" required value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: '100%', padding: '0.6rem' }} />
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>End Date</label>
                <input type="date" className="input-field" value={endDate} onChange={e => setEndDate(e.target.value)} disabled={noEndDate} style={{ width: '100%', padding: '0.6rem', opacity: noEndDate ? 0.5 : 1 }} />
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={noEndDate} onChange={e => setNoEndDate(e.target.checked)} /> No End Date
                </label>
              </div>
            </div>
          </div>
        </Card>

        {/* 2. ASSIGN OUTLETS */}
        <Card title="2. ASSIGN OUTLETS">
          <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94A3B8' }} />
              <input 
                type="text" 
                className="input-field" 
                placeholder="Search outlets..." 
                value={outletSearch}
                onChange={e => setOutletSearch(e.target.value)}
                style={{ width: '100%', padding: '0.6rem 0.6rem 0.6rem 2rem' }} 
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <input 
                type="checkbox" 
                checked={filteredOutlets.length > 0 && selectedOutlets.length === filteredOutlets.length} 
                onChange={handleSelectAllOutlets} 
              />
              Select All
            </label>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem', maxHeight: '250px', overflowY: 'auto', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: '#F8FAFC' }}>
            {filteredOutlets.map(o => (
              <label key={o._id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#fff', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border)', cursor: 'pointer' }}>
                <input type="checkbox" checked={selectedOutlets.includes(o._id)} onChange={() => toggleOutlet(o._id)} style={{ cursor: 'pointer' }} />
                <div style={{ fontSize: '0.85rem' }}>
                  <strong style={{ display: 'block' }}>{o.outletId || o.name}</strong>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{o.name || o.district}</span>
                </div>
              </label>
            ))}
            {filteredOutlets.length === 0 && (
              <div style={{ gridColumn: '1 / -1', padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No outlets found.
              </div>
            )}
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}>
            {selectedOutlets.length} Outlets Selected
          </div>
        </Card>

        {/* 3. INVENTORY ITEMS */}
        <Card title="3. INVENTORY ITEMS">
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1rem', overflowX: 'auto' }}>
            {CATEGORIES.map(cat => (
              <button 
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '0.75rem 1rem',
                  background: 'none',
                  border: 'none',
                  borderBottom: `2px solid ${activeCategory === cat ? 'var(--primary)' : 'transparent'}`,
                  color: activeCategory === cat ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: activeCategory === cat ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
          
          <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {itemsByCategory[activeCategory]?.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                {itemsByCategory[activeCategory].map(item => {
                  const isSelected = !!selectedInventoryItems[item._id];
                  const storeItem = storeInventory.find(si => si.itemCode === item.itemCode);
                  const availableQty = storeItem ? storeItem.quantity : 0;
                  
                  return (
                    <div key={item._id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: isSelected ? '#F0F9FF' : '#FFF' }}>
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={(e) => toggleInventoryItem(item, e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1, minWidth: '150px' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.itemName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Code: {item.itemCode} • Avail: {availableQty} {item.unit || 'units'}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '4px', background: determineTemperature(item) === 'Chilled' ? '#DBEAFE' : '#F1F5F9', color: determineTemperature(item) === 'Chilled' ? '#1E40AF' : '#475569', fontWeight: 600 }}>
                        {determineTemperature(item)}
                      </div>
                      {isSelected && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Qty:</label>
                          <input 
                            type="number" 
                            min="1"
                            className="input-field" 
                            value={selectedInventoryItems[item._id].requestedQty} 
                            onChange={(e) => updateItemQty(item._id, e.target.value)}
                            style={{ width: '80px', padding: '0.4rem' }}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No inventory items found in this category.
              </div>
            )}
          </div>
        </Card>

        {/* SHORTAGES ALERT */}
        {shortages.length > 0 && (
          <Card style={{ background: '#FEF2F2', border: '1px solid #FCA5A5' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: '#B91C1C' }}>
              <AlertTriangle size={24} />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Insufficient Stock Alert</h3>
            </div>
            <div style={{ fontSize: '0.9rem', color: '#7F1D1D', marginBottom: '1rem' }}>
              You do not have enough stock in your Store Manager Inventory to fulfill this plan for all {selectedOutlets.length} selected outlets. 
              The plan cannot be activated immediately.
            </div>
            
            <div style={{ background: '#FFF', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid #FECACA', marginBottom: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0.5rem', padding: '0.75rem', background: '#FEE2E2', fontSize: '0.8rem', fontWeight: 700, color: '#991B1B' }}>
                <div>Item</div>
                <div>Required</div>
                <div>Available</div>
                <div>Shortage</div>
              </div>
              {shortages.map((shortage, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0.5rem', padding: '0.75rem', borderTop: idx > 0 ? '1px solid #FECACA' : 'none', fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: 600 }}>{shortage.itemName}</div>
                  <div>{shortage.requiredQuantity}</div>
                  <div>{shortage.availableQuantity}</div>
                  <div style={{ fontWeight: 700, color: '#DC2626' }}>{shortage.shortageQuantity}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" onClick={handleRequestStock} disabled={saving} className="btn-primary" style={{ background: '#B91C1C', borderColor: '#B91C1C', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Send size={16} /> Request Stock from Warehouse
              </button>
            </div>
          </Card>
        )}

        {/* 4. PLAN REVIEW */}
        <Card title="4. PLAN REVIEW" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Schedule & Basics</h4>
              <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div><strong>Name:</strong> {planName || '—'}</div>
                <div><strong>Frequency:</strong> {frequency} {frequency === 'WEEKLY' ? `(${deliveryDays.join(', ')})` : ''}</div>
                <div><strong>Outlets:</strong> {selectedOutlets.length} Assigned</div>
                <div><strong>Start Date:</strong> {startDate || '—'}</div>
              </div>
            </div>
            <div>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Selected Items Summary</h4>
              {totalItemsCount === 0 ? (
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>No items selected.</div>
              ) : (
                <div style={{ fontSize: '0.9rem', maxHeight: '150px', overflowY: 'auto' }}>
                  <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
                    {selectedItemsList.map((item, idx) => (
                      <li key={idx} style={{ marginBottom: '0.2rem' }}>
                        {item.itemName} - <strong>{item.requestedQty} {item.unit || 'units'}</strong> 
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>({determineTemperature(item)})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          
          <div style={{ padding: '1rem', background: '#FFF', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Overall Cargo Type</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>
                {selectedItemsList.some(i => determineTemperature(i) === 'Chilled') ? 'CHILLED' : 'AMBIENT'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="button" className="btn-secondary" disabled={saving} onClick={() => handleSave(true)}>
                <Save size={16} /> Save as Draft
              </button>
              <button type="button" className="btn-primary" disabled={saving} onClick={() => handleSave(false)}>
                <CheckCircle size={16} /> {id ? 'Update Plan' : 'Activate Plan'}
              </button>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
};
