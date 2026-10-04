import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersApi } from '../../api/orders.api';
import { inventoryApi } from '../../api/inventory.api';
import { simulationApi } from '../../api/simulation.api';
import { Card } from '../../components/common/Card';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Badge } from '../../components/common/Badge';
import {
  ArrowLeft,
  Send,
  CheckCircle,
  PackageSearch,
  ShoppingCart,
  Clock,
  AlertTriangle,
  Zap,
  Building,
  Calendar,
  Layers,
  FileText
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const CATEGORIES = [
  'Food & Grocery',
  'Electrical & Electronics',
  'Clothing & Textiles',
  'Household & Cleaning',
  'Personal Care & Health'
];

export const CreateOrder = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState(null);
  const [successShortageNotice, setSuccessShortageNotice] = useState(null);

  const [activeTab, setActiveTab] = useState('dispatch'); // 'dispatch', 'shortage', 'history'
  
  // Data State
  const [myOutlets, setMyOutlets] = useState([]);
  const [replenishmentPlans, setReplenishmentPlans] = useState([]);
  const [mainCatalogItems, setMainCatalogItems] = useState([]);
  const [storeInventory, setStoreInventory] = useState([]);
  const [requestsHistory, setRequestsHistory] = useState([]);
  const [simulationClock, setSimulationClock] = useState(null);

  // Dispatch Order Form State
  const [selectedOutletId, setSelectedOutletId] = useState('');
  const [brand, setBrand] = useState('Fresh');
  const [tempRequirement, setTempRequirement] = useState('ambient');
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [orderItemQuantities, setOrderItemQuantities] = useState({}); // { itemName: qty }
  
  // Warehouse Shortage Request Form State
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [shortageQuantities, setShortageQuantities] = useState({});

  useEffect(() => {
    initData();
  }, []);

  const initData = async () => {
    setLoading(true);
    try {
      const [outletsRes, plansRes, mainInvRes, storeInvRes, historyRes, simRes] = await Promise.allSettled([
        ordersApi.getMyOutlets(),
        ordersApi.getReplenishmentPlans(),
        inventoryApi.getAll(),
        inventoryApi.getStoreManagerInventory(user?._id || user?.id),
        inventoryApi.getStockRequests({ storeManagerId: user?._id || user?.id, filterBySelf: 'true' }),
        simulationApi.getSimulationTime()
      ]);

      if (outletsRes.status === 'fulfilled' && outletsRes.value.data) {
        const outList = outletsRes.value.data;
        setMyOutlets(outList);
        if (outList.length > 0) {
          setSelectedOutletId(outList[0]._id || outList[0].outletId);
          setBrand(outList[0].brand || 'Fresh');
          if (outList[0].brand !== 'Fresh') {
            setTempRequirement('ambient');
          }
        }
      }

      if (plansRes.status === 'fulfilled' && plansRes.value.data) {
        setReplenishmentPlans(plansRes.value.data);
      }

      if (mainInvRes.status === 'fulfilled' && mainInvRes.value.data) {
        setMainCatalogItems(mainInvRes.value.data);
      }

      if (storeInvRes.status === 'fulfilled' && storeInvRes.value.data) {
        setStoreInventory(storeInvRes.value.data);
      }

      if (historyRes.status === 'fulfilled' && historyRes.value.data) {
        setRequestsHistory(historyRes.value.data);
      }

      if (simRes.status === 'fulfilled' && simRes.value.data) {
        setSimulationClock(simRes.value.data);
      }
    } catch (err) {
      console.error('Failed to init create order page data', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedOutlet = useMemo(() => {
    return myOutlets.find(o => (o._id === selectedOutletId || o.outletId === selectedOutletId));
  }, [myOutlets, selectedOutletId]);

  // When outlet changes, auto-adjust brand and temp restriction
  const handleOutletChange = (outletId) => {
    setSelectedOutletId(outletId);
    const found = myOutlets.find(o => o._id === outletId || o.outletId === outletId);
    if (found) {
      setBrand(found.brand || 'Fresh');
      if (found.brand !== 'Fresh') {
        setTempRequirement('ambient');
      }
    }
  };

  // Quick fill from selected replenishment plan
  const handleApplyReplenishmentPlan = (planId) => {
    setSelectedPlanId(planId);
    if (!planId) return;
    const plan = replenishmentPlans.find(p => p._id === planId);
    if (!plan || !plan.items) return;

    const newQuantities = {};
    plan.items.forEach(it => {
      newQuantities[it.itemName] = Number(it.qty) || 1;
    });
    setOrderItemQuantities(newQuantities);

    if (plan.cargoType === 'chilled' && brand === 'Fresh') {
      setTempRequirement('chilled');
    }
  };

  // Live order calculations
  const orderSummary = useMemo(() => {
    let totalUnits = 0;
    let totalWeightKg = 0;
    let totalVolumeM3 = 0;
    const activeItems = [];
    const stockErrors = [];

    Object.entries(orderItemQuantities).forEach(([itemName, qty]) => {
      const quantity = Number(qty);
      if (quantity > 0) {
        const storeItem = storeInventory.find(si => si.itemName === itemName);
        const avail = storeItem ? storeItem.quantity : 0;
        const unitWeight = storeItem?.weightKg || 2.5;
        const unitVol = storeItem?.volumeM3 || 0.015;

        totalUnits += quantity;
        totalWeightKg += quantity * unitWeight;
        totalVolumeM3 += quantity * unitVol;

        activeItems.push({
          itemName,
          qty: quantity,
          unit: storeItem?.unit || 'cases',
          weightKg: Math.round(quantity * unitWeight * 100) / 100,
          volumeM3: Math.round(quantity * unitVol * 1000) / 1000
        });

        if (quantity > avail) {
          stockErrors.push({
            itemName,
            requested: quantity,
            available: avail,
            deficit: quantity - avail
          });
        }
      }
    });

    return {
      totalUnits,
      totalWeightKg: Math.round(totalWeightKg * 100) / 100,
      totalVolumeM3: Math.round(totalVolumeM3 * 1000) / 1000,
      activeItems,
      stockErrors
    };
  }, [orderItemQuantities, storeInventory]);

  // Colombo Cutoff Analysis
  const cutoffAnalysis = useMemo(() => {
    if (!simulationClock) return { isCutoffPassed: false, message: 'Normal operating cycle' };
    const isPassed = simulationClock.isCutoffPassed;
    const targetTomorrow = simulationClock.nextRunSuggestion?.slice(0, 10) === requestedDeliveryDate;

    return {
      isCutoffPassed: isPassed,
      isTargetTomorrow: targetTomorrow,
      willRollOver: isPassed && targetTomorrow,
      colomboTime: simulationClock.colomboTime,
      countdown: simulationClock.timeUntilCutoff
    };
  }, [simulationClock, requestedDeliveryDate]);

  // Submit Confirmed Dispatch Order
  const handleCreateDispatchOrder = async (e) => {
    e.preventDefault();
    if (!selectedOutletId) {
      alert('Please select a destination outlet');
      return;
    }
    if (orderSummary.activeItems.length === 0) {
      alert('Please add at least one item with quantity greater than 0');
      return;
    }
    if (orderSummary.stockErrors.length > 0) {
      alert(`Cannot submit order: ${orderSummary.stockErrors[0].itemName} exceeds available store inventory! Request stock from warehouse first.`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        outletId: selectedOutletId,
        brand,
        tempRequirement,
        requestedDeliveryDate,
        items: orderSummary.activeItems,
        orderUnits: orderSummary.totalUnits,
        orderWeightKg: orderSummary.totalWeightKg,
        orderVolumeM3: orderSummary.totalVolumeM3,
        deliveryWindow: {
          start: brand === 'Fresh' ? '06:00' : '09:00',
          end: brand === 'Fresh' ? '08:00' : '17:00'
        }
      };

      const res = await ordersApi.createOrder(payload);
      setSuccessOrder(res.data);
      // Refresh inventory
      const storeInvRes = await inventoryApi.getStoreManagerInventory(user?._id || user?.id);
      setStoreInventory(storeInvRes.data || []);
      setOrderItemQuantities({});
    } catch (err) {
      console.error('Failed to create order', err);
      alert(err.response?.data?.message || 'Failed to submit order');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate Shortages for Warehouse Request Tab
  const calculatedWarehouseShortages = useMemo(() => {
    const list = [];
    Object.keys(shortageQuantities).forEach(itemCode => {
      const requiredQuantity = Number(shortageQuantities[itemCode]);
      if (requiredQuantity > 0) {
        const mainItem = mainCatalogItems.find(i => i.itemCode === itemCode);
        const storeItem = storeInventory.find(si => si.itemCode === itemCode);
        const availableQuantity = storeItem ? storeItem.quantity : 0;

        if (requiredQuantity > availableQuantity) {
          list.push({
            itemCode,
            itemName: mainItem ? mainItem.itemName : itemCode,
            requiredQuantity,
            availableQuantity,
            shortageQuantity: requiredQuantity - availableQuantity
          });
        }
      }
    });
    return list;
  }, [shortageQuantities, mainCatalogItems, storeInventory]);

  // Submit Shortage Request to Warehouse
  const handleSubmitShortageRequest = async () => {
    if (calculatedWarehouseShortages.length === 0) {
      alert('Please enter required quantities exceeding available stock to create a replenishment request.');
      return;
    }

    setSubmitting(true);
    try {
      await inventoryApi.requestStock({
        items: calculatedWarehouseShortages,
        storeManagerId: user?._id || user?.id
      });
      setSuccessShortageNotice('Stock replenishment request dispatched to Warehouse Loader successfully.');
      setShortageQuantities({});
      // Refresh
      const [histRes, storeRes] = await Promise.all([
        inventoryApi.getStockRequests({ storeManagerId: user?._id || user?.id, filterBySelf: 'true' }),
        inventoryApi.getStoreManagerInventory(user?._id || user?.id)
      ]);
      setRequestsHistory(histRes.data || []);
      setStoreInventory(storeRes.data || []);
    } catch (err) {
      console.error(err);
      alert('Failed to send stock request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading Order Portal & Inventory..." />;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto', paddingBottom: '6rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <button
            onClick={() => navigate('/store/orders')}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: 0, marginBottom: '0.5rem' }}
          >
            <ArrowLeft size={16} /> Back to My Orders
          </button>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShoppingCart size={28} color="var(--primary)" /> Store Order Management
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)' }}>
            Place retail dispatch orders to central fleet or request stock replenishment from warehouse.
          </p>
        </div>

        {/* 16:00 Colombo Cutoff Status Pill */}
        {simulationClock && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.6rem 1rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: cutoffAnalysis.isCutoffPassed ? '#FEF2F2' : '#F0FDF4',
            border: `1px solid ${cutoffAnalysis.isCutoffPassed ? '#FECACA' : '#BBF7D0'}`
          }}>
            <Clock size={18} color={cutoffAnalysis.isCutoffPassed ? '#DC2626' : '#16A34A'} />
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: cutoffAnalysis.isCutoffPassed ? '#991B1B' : '#166534' }}>
                Colombo Time: {cutoffAnalysis.colomboTime}
              </div>
              <div style={{ fontSize: '0.7rem', color: cutoffAnalysis.isCutoffPassed ? '#DC2626' : '#15803D' }}>
                {cutoffAnalysis.isCutoffPassed ? '16:00 Cutoff Passed' : 'Pre-Cutoff (Runs Today)'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginBottom: '1.5rem', gap: '0.5rem' }}>
        <button
          type="button"
          onClick={() => { setActiveTab('dispatch'); setSuccessOrder(null); }}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'dispatch' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'dispatch' ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'dispatch' ? 800 : 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <ShoppingCart size={18} /> 1. Create Retail Dispatch Order
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('shortage'); setSuccessShortageNotice(null); }}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'shortage' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'shortage' ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'shortage' ? 800 : 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <PackageSearch size={18} /> 2. Warehouse Stock Replenishment
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'history' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'history' ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'history' ? 800 : 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <FileText size={18} /> 3. Request History ({requestsHistory.length})
        </button>
      </div>

      {/* TAB 1: CREATE RETAIL DISPATCH ORDER */}
      {activeTab === 'dispatch' && (
        <div>
          {successOrder ? (
            <Card style={{ textAlign: 'center', padding: '2.5rem' }}>
              <CheckCircle size={56} color="#16A34A" style={{ margin: '0 auto 1rem' }} />
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Order Confirmed & Queued!</h2>
              <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.5rem 0' }}>
                Order reference <strong style={{ color: 'var(--text-primary)' }}>{successOrder.orderRef}</strong> has been transmitted to Central Dispatcher queue.
              </p>

              <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.5rem', background: '#F8FAFC', padding: '1rem 1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', textAlign: 'left', marginBottom: '1.5rem' }}>
                <div><strong>Outlet:</strong> {successOrder.outlet?.name || successOrder.outlet}</div>
                <div><strong>Brand:</strong> {successOrder.brand} ({successOrder.tempRequirement})</div>
                <div><strong>Units:</strong> {successOrder.orderUnits} | <strong>Payload:</strong> {successOrder.orderWeightKg}kg / {successOrder.orderVolumeM3}m³</div>
                <div><strong>Scheduled Cycle:</strong> <span style={{ fontWeight: 700, color: successOrder.dispatchCycle === 'NEXT_CYCLE' ? '#EA580C' : '#16A34A' }}>{successOrder.dispatchCycle}</span></div>
                <div><strong>Scheduled Dispatch:</strong> {new Date(successOrder.scheduledDispatchDate).toLocaleDateString()}</div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button className="btn-secondary" onClick={() => setSuccessOrder(null)}>
                  Create Another Order
                </button>
                <button className="btn-primary" onClick={() => navigate('/store/orders')}>
                  View in My Orders
                </button>
              </div>
            </Card>
          ) : (
            <form onSubmit={handleCreateDispatchOrder}>
              {/* Cutoff Warning Alert */}
              {cutoffAnalysis.willRollOver && (
                <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <AlertTriangle size={24} color="#D97706" style={{ flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: '#92400E', fontSize: '0.9rem' }}>16:00 Colombo Cutoff Notice:</strong>
                    <div style={{ color: '#B45309', fontSize: '0.825rem', marginTop: '0.2rem' }}>
                      Orders placed for tomorrow after 16:00 will automatically queue for the subsequent operating run cycle ({new Date(new Date().setDate(new Date().getDate() + 2)).toLocaleDateString()}).
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Destination & Window */}
                <Card title="1. Retail Outlet Destination">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                        Select Target Outlet *
                      </label>
                      <select
                        className="form-select"
                        value={selectedOutletId}
                        onChange={(e) => handleOutletChange(e.target.value)}
                        required
                      >
                        {myOutlets.map(o => (
                          <option key={o._id || o.outletId} value={o._id || o.outletId}>
                            {o.name} ({o.district} • {o.brand})
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedOutlet && (
                      <div style={{ background: '#F8FAFC', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.8rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <div><strong>District:</strong> {selectedOutlet.district}</div>
                        <div><strong>Dock:</strong> {selectedOutlet.dockType || 'rear_dock'}</div>
                        <div><strong>Parking:</strong> {selectedOutlet.parkingType || 'standard'}</div>
                        <div><strong>Depot:</strong> {selectedOutlet.depot || 'Peliyagoda DC'}</div>
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                          Brand
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          value={brand}
                          disabled
                          style={{ backgroundColor: '#F1F5F9', fontWeight: 700 }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                          Cargo Temp
                        </label>
                        {brand === 'Fresh' ? (
                          <select
                            className="form-select"
                            value={tempRequirement}
                            onChange={(e) => setTempRequirement(e.target.value)}
                          >
                            <option value="ambient">Ambient</option>
                            <option value="chilled">Chilled (Reefer)</option>
                          </select>
                        ) : (
                          <input
                            type="text"
                            className="form-input"
                            value="ambient (Enforced)"
                            disabled
                            style={{ backgroundColor: '#F1F5F9' }}
                          />
                        )}
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                        Requested Delivery Date *
                      </label>
                      <input
                        type="date"
                        className="form-input"
                        value={requestedDeliveryDate}
                        onChange={(e) => setRequestedDeliveryDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </Card>

                {/* Quick-Fill from Replenishment Plan */}
                <Card title="2. Quick-Fill from Plan (Optional)">
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0' }}>
                    Speed up manual order entry by loading pre-defined item lists and quantities from your saved replenishment plans.
                  </p>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                      Select Template Plan
                    </label>
                    <select
                      className="form-select"
                      value={selectedPlanId}
                      onChange={(e) => handleApplyReplenishmentPlan(e.target.value)}
                    >
                      <option value="">-- Manual Selection (No Plan) --</option>
                      {replenishmentPlans.map(p => (
                        <option key={p._id} value={p._id}>
                          {p.planName} ({p.items?.length || 0} items • {p.frequency})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedPlanId && (
                    <div style={{ padding: '0.75rem', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: '#166534' }}>
                      <Zap size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.35rem' }} />
                      Template loaded! You can still fine-tune quantities below before final dispatch submission.
                    </div>
                  )}

                  {/* Estimated Payload Summary */}
                  <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#F8FAFC', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                      Live Consignment Estimate
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', textAlign: 'center' }}>
                      <div style={{ background: '#FFF', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{orderSummary.totalUnits}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Units</div>
                      </div>
                      <div style={{ background: '#FFF', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{orderSummary.totalWeightKg} <span style={{ fontSize: '0.7rem' }}>kg</span></div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Payload Wt</div>
                      </div>
                      <div style={{ background: '#FFF', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{orderSummary.totalVolumeM3} <span style={{ fontSize: '0.7rem' }}>m³</span></div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Cube Vol</div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Items Selection from Available Store Inventory */}
              <Card title="3. Consignment Items (From Available Store Inventory)">
                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0' }}>
                  Enter the quantity to dispatch to this outlet. Stock will be deducted from your personal store inventory immediately upon order placement.
                </p>

                {storeInventory.length === 0 ? (
                  <div style={{ padding: '2.5rem', textAlign: 'center', background: '#F8FAFC', borderRadius: 'var(--radius-md)' }}>
                    <PackageSearch size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
                    <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>No Available Store Inventory Found</div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                      You need to request and confirm receipt of warehouse stock before you can dispatch retail orders.
                    </p>
                    <button type="button" className="btn-primary" onClick={() => setActiveTab('shortage')}>
                      Request Stock from Warehouse
                    </button>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                          <th style={{ padding: '0.75rem 0.5rem' }}>Item Name</th>
                          <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Available in Store</th>
                          <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Unit Spec</th>
                          <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', width: '140px' }}>Dispatch Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {storeInventory.map(item => {
                          const requested = Number(orderItemQuantities[item.itemName]) || 0;
                          const isExceeded = requested > item.quantity;
                          return (
                            <tr key={item._id || item.itemCode || item.itemName} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: isExceeded ? '#FEF2F2' : 'transparent' }}>
                              <td style={{ padding: '0.75rem 0.5rem' }}>
                                <div style={{ fontWeight: 700 }}>{item.itemName}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.itemCode || 'CODE-GEN'} • {item.unit || 'cases'}</div>
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                                <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 800, backgroundColor: item.quantity > 0 ? '#DCFCE7' : '#F1F5F9', color: item.quantity > 0 ? '#166534' : '#64748B' }}>
                                  {item.quantity} {item.unit || 'cases'}
                                </span>
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                2.5 kg • 0.015 m³
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                                <input
                                  type="number"
                                  min="0"
                                  className="form-input"
                                  placeholder="0"
                                  style={{ textAlign: 'center', fontWeight: 700, padding: '0.4rem', borderColor: isExceeded ? '#DC2626' : undefined }}
                                  value={orderItemQuantities[item.itemName] || ''}
                                  onChange={(e) => setOrderItemQuantities(prev => ({
                                    ...prev,
                                    [item.itemName]: e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0)
                                  }))}
                                />
                                {isExceeded && (
                                  <div style={{ fontSize: '0.7rem', color: '#DC2626', fontWeight: 700, marginTop: '0.2rem' }}>
                                    Deficit: {requested - item.quantity}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Stock Shortage Warning inside Order form */}
                {orderSummary.stockErrors.length > 0 && (
                  <div style={{ marginTop: '1.25rem', padding: '1rem', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                      <AlertTriangle size={20} color="#DC2626" />
                      <div>
                        <div style={{ fontWeight: 700, color: '#991B1B', fontSize: '0.85rem' }}>
                          Stock shortage detected on {orderSummary.stockErrors.length} item(s)!
                        </div>
                        <div style={{ color: '#B91C1C', fontSize: '0.75rem' }}>
                          Available stock is insufficient for full order fulfillment.
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', color: '#991B1B', borderColor: '#FCA5A5' }}
                      onClick={() => setActiveTab('shortage')}
                    >
                      Request Shortage from Warehouse
                    </button>
                  </div>
                )}

                {/* Submit Row */}
                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => navigate('/store/orders')}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || orderSummary.activeItems.length === 0 || orderSummary.stockErrors.length > 0}
                    className="btn-primary"
                    style={{ padding: '0.75rem 2rem', fontSize: '1rem', fontWeight: 800 }}
                  >
                    <Send size={18} />
                    {submitting ? 'Transmitting to Dispatcher...' : 'Confirm & Dispatch Retail Order'}
                  </button>
                </div>
              </Card>
            </form>
          )}
        </div>
      )}

      {/* TAB 2: WAREHOUSE STOCK REPLENISHMENT */}
      {activeTab === 'shortage' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {successShortageNotice && (
            <div style={{ backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', padding: '1.5rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <CheckCircle size={36} color="#059669" style={{ margin: '0 auto 0.5rem' }} />
              <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>Shortage Request Dispatched!</div>
              <p style={{ margin: '0.5rem 0 1rem 0', fontSize: '0.875rem' }}>{successShortageNotice}</p>
              <button className="btn-secondary" onClick={() => setSuccessShortageNotice(null)}>
                New Request
              </button>
            </div>
          )}

          <Card title="Warehouse Master Inventory Catalog">
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0' }}>
              Select required quantities. If required amount exceeds your current store balance, a stock transfer request is automatically submitted to the warehouse loader.
            </p>

            {/* Categories */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1rem', overflowX: 'auto' }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: '0.6rem 1rem',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeCategory === cat ? '2px solid var(--primary)' : '2px solid transparent',
                    color: activeCategory === cat ? 'var(--primary)' : 'var(--text-secondary)',
                    fontWeight: activeCategory === cat ? 800 : 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {mainCatalogItems.filter(i => (i.category || 'Food & Grocery').toLowerCase() === activeCategory.toLowerCase()).map(item => {
                const storeItem = storeInventory.find(si => si.itemCode === item.itemCode);
                const availableQty = storeItem ? storeItem.quantity : 0;
                const reqQty = Number(shortageQuantities[item.itemCode]) || 0;
                const isShortage = reqQty > availableQty;

                return (
                  <div key={item._id || item.itemCode} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: isShortage ? '#FEF2F2' : '#FFF', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '180px' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.itemName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Code: {item.itemCode} • Category: {item.category}
                      </div>
                    </div>

                    <div style={{ textAlign: 'center', padding: '0 1rem', borderRight: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Warehouse Main Stock</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0284C7' }}>
                        {item.quantity} <span style={{ fontSize: '0.75rem' }}>{item.unit}</span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'center', padding: '0 1rem' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>My Store Stock</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: availableQty > 0 ? '#059669' : '#64748B' }}>
                        {availableQty} <span style={{ fontSize: '0.75rem' }}>{item.unit}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#F8FAFC', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Required:</label>
                      <input
                        type="number"
                        min="0"
                        className="form-input"
                        placeholder="0"
                        style={{ width: '80px', textAlign: 'center', fontWeight: 700, padding: '0.35rem' }}
                        value={shortageQuantities[item.itemCode] || ''}
                        onChange={(e) => setShortageQuantities(prev => ({
                          ...prev,
                          [item.itemCode]: Number(e.target.value) || 0
                        }))}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Shortages Summary */}
          {calculatedWarehouseShortages.length > 0 && (
            <Card title="Calculated Shortages for Warehouse Fulfillment">
              <div style={{ background: '#F8FAFC', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid #E2E8F0', marginBottom: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0.5rem', padding: '0.75rem', background: '#F1F5F9', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  <div>Item Name</div>
                  <div style={{ textAlign: 'center' }}>Required Qty</div>
                  <div style={{ textAlign: 'center' }}>Available Qty</div>
                  <div style={{ textAlign: 'center', color: '#B91C1C' }}>Shortage Deficit</div>
                </div>
                {calculatedWarehouseShortages.map((sh, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0.5rem', padding: '0.75rem', borderTop: idx > 0 ? '1px solid #E2E8F0' : 'none', fontSize: '0.85rem', alignItems: 'center' }}>
                    <div style={{ fontWeight: 600 }}>{sh.itemName} <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block' }}>{sh.itemCode}</span></div>
                    <div style={{ textAlign: 'center', fontWeight: 600 }}>{sh.requiredQuantity}</div>
                    <div style={{ textAlign: 'center', color: '#64748B' }}>{sh.availableQuantity}</div>
                    <div style={{ textAlign: 'center', fontWeight: 800, color: '#DC2626' }}>{sh.shortageQuantity}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleSubmitShortageRequest}
                  disabled={submitting}
                  className="btn-primary"
                  style={{ background: '#B91C1C', borderColor: '#B91C1C', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.75rem' }}
                >
                  <Send size={18} /> {submitting ? 'Transmitting Request...' : 'Send Shortage Request to Warehouse'}
                </button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* TAB 3: REQUEST HISTORY */}
      {activeTab === 'history' && (
        <Card title="Warehouse Stock Request History">
          {requestsHistory.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No stock requests recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {requestsHistory.map(req => (
                <div key={req._id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1rem', backgroundColor: '#F8FAFC' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <h4 style={{ margin: '0 0 0.25rem 0', fontWeight: 800 }}>Request #{req._id.slice(-6).toUpperCase()}</h4>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Submitted: {new Date(req.requestedAt).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: req.status === 'PENDING' || req.status === 'REQUESTED' ? '#FEF3C7' : req.status === 'APPROVED' ? '#D1FAE5' : req.status === 'SENT' ? '#DBEAFE' : '#F1F5F9',
                        color: req.status === 'PENDING' || req.status === 'REQUESTED' ? '#B45309' : req.status === 'APPROVED' ? '#065F46' : req.status === 'SENT' ? '#1D4ED8' : '#475569'
                      }}>
                        {req.status}
                      </span>
                    </div>
                  </div>

                  <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#E2E8F0' }}>
                        <th style={{ padding: '0.4rem 0.6rem' }}>Item</th>
                        <th style={{ padding: '0.4rem 0.6rem', textAlign: 'center' }}>Shortage Requested</th>
                      </tr>
                    </thead>
                    <tbody>
                      {req.items?.map((it, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #E2E8F0' }}>
                          <td style={{ padding: '0.4rem 0.6rem', fontWeight: 600 }}>{it.itemName}</td>
                          <td style={{ padding: '0.4rem 0.6rem', textAlign: 'center', fontWeight: 700 }}>{it.shortageQuantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
