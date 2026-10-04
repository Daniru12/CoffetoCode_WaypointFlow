import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersApi } from '../../api/orders.api';
import { planningApi } from '../../api/planning.api';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { AssignmentModal } from '../../components/planning/AssignmentModal';
import { Search, Filter, RotateCcw, Calendar, CheckSquare } from 'lucide-react';

export const OrdersQueue = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [brand, setBrand] = useState('');
  const [district, setDistrict] = useState('');
  const [depot, setDepot] = useState('Peliyagoda');
  const [temperature, setTemperature] = useState('');
  const [status, setStatus] = useState('');
  const [orderSource, setOrderSource] = useState('');
  const [dispatchCycle, setDispatchCycle] = useState('');
  const [deferredOnly, setDeferredOnly] = useState(false);
  const [search, setSearch] = useState('');

  // Selected Order for Assignment
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [activePlan, setActivePlan] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    loadQueue();
    loadLatestPlan();
  }, [brand, district, depot, temperature, status, orderSource, dispatchCycle, deferredOnly]);

  const loadLatestPlan = async () => {
    try {
      const res = await planningApi.getPlans({ depot });
      const draftPlan = res.data?.find(p => p.status === 'DRAFT' || p.status === 'READY') || res.data?.[0];
      setActivePlan(draftPlan);
    } catch {
      // ignore
    }
  };

  const loadQueue = async () => {
    setLoading(true);
    try {
      const res = await ordersApi.getOrderQueue({
        brand: brand || undefined,
        district: district || undefined,
        depot: depot || undefined,
        temperature: temperature || undefined,
        status: status || undefined,
        orderSource: orderSource || undefined,
        dispatchCycle: dispatchCycle || undefined,
        deferred: deferredOnly ? 'true' : undefined
      });
      setOrders(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(o =>
    !search || o.orderRef.toLowerCase().includes(search.toLowerCase()) || o.outlet?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Dispatcher Orders Queue</h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Unallocated & pending store orders filtered by constraints
          </span>
        </div>

        <button className="btn-primary" onClick={() => navigate('/dispatcher/planning')}>
          <Calendar size={18} />
          <span>Open Planning Console</span>
        </button>
      </div>

      <Card>
        {/* Filter Controls Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.25rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid var(--border)'
        }}>
          <div>
            <label className="form-label">Search</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ref or Outlet..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label">Depot</label>
            <select className="form-select" value={depot} onChange={(e) => setDepot(e.target.value)}>
              <option value="Peliyagoda">Peliyagoda Hub</option>
              <option value="Kandy">Kandy Depot</option>
              <option value="Galle">Galle Depot</option>
            </select>
          </div>

          <div>
            <label className="form-label">Brand</label>
            <select className="form-select" value={brand} onChange={(e) => setBrand(e.target.value)}>
              <option value="">All Brands</option>
              <option value="Fresh">Fresh</option>
              <option value="Style">Style</option>
              <option value="Tech">Tech</option>
            </select>
          </div>

          <div>
            <label className="form-label">Temperature</label>
            <select className="form-select" value={temperature} onChange={(e) => setTemperature(e.target.value)}>
              <option value="">All Temperatures</option>
              <option value="ambient">Ambient</option>
              <option value="chilled">Chilled (Reefer)</option>
            </select>
          </div>

          <div>
            <label className="form-label">Status</label>
            <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All Active</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PLANNING">In Planning</option>
              <option value="DEFERRED">Deferred</option>
            </select>
          </div>

          <div>
            <label className="form-label">Source</label>
            <select className="form-select" value={orderSource} onChange={(e) => setOrderSource(e.target.value)}>
              <option value="">All Sources</option>
              <option value="MANUAL">Manual Ad-Hoc</option>
              <option value="REPLENISHMENT_PLAN">Replenishment Plan</option>
            </select>
          </div>

          <div>
            <label className="form-label">Cutoff Cycle</label>
            <select className="form-select" value={dispatchCycle} onChange={(e) => setDispatchCycle(e.target.value)}>
              <option value="">All Cycles</option>
              <option value="CURRENT_CYCLE">Current Cycle (Pre-Cutoff)</option>
              <option value="NEXT_CYCLE">Next Cycle (Post-Cutoff)</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.4rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={deferredOnly}
                onChange={(e) => setDeferredOnly(e.target.checked)}
              />
              <span>Deferred Only</span>
            </label>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner text="Filtering dispatcher queue..." />
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            title="No orders found in queue"
            message="No orders match the current depot, brand, and temperature filter settings."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Order ID</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Source</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Outlet & District</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Brand & Temp</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Cycle & Window</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Load Size</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((ord) => (
                  <tr key={ord._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>{ord.orderRef}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span style={{
                        padding: '0.2rem 0.45rem',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        backgroundColor: ord.orderSource === 'REPLENISHMENT_PLAN' ? '#EFF6FF' : '#F1F5F9',
                        color: ord.orderSource === 'REPLENISHMENT_PLAN' ? '#1D4ED8' : '#475569'
                      }}>
                        {ord.orderSource === 'REPLENISHMENT_PLAN' ? 'Plan' : 'Manual'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <div style={{ fontWeight: 600 }}>{ord.outlet?.name || ord.outlet?.outletId}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {ord.outlet?.district} • {ord.outlet?.dockType || 'rear_dock'}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                        <Badge status={ord.brand} />
                        <span style={{
                          padding: '0.15rem 0.4rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          backgroundColor: ord.tempRequirement === 'chilled' ? '#EFF6FF' : '#F1F5F9',
                          color: ord.tempRequirement === 'chilled' ? '#1D4ED8' : '#475569'
                        }}>
                          {ord.tempRequirement}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <div style={{ fontSize: '0.75rem' }}>
                        {ord.deliveryWindow ? `${ord.deliveryWindow.start} - ${ord.deliveryWindow.end}` : '06:00 - 08:00'}
                      </div>
                      {ord.isPostCutoff ? (
                        <span style={{ fontSize: '0.68rem', color: '#EA580C', fontWeight: 800 }}>
                          Post-Cutoff (Next Cycle)
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.68rem', color: '#16A34A', fontWeight: 700 }}>
                          Current Cycle
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      {ord.orderUnits} units ({ord.orderWeightKg}kg / {ord.orderVolumeM3}m³)
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <Badge status={ord.status} />
                      {ord.deferredCount > 0 && (
                        <span style={{ fontSize: '0.7rem', color: '#DC2626', fontWeight: 700, marginLeft: '4px' }}>
                          ({ord.deferredCount}x)
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                      <button
                        className="btn-primary"
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                        onClick={() => {
                          setSelectedOrder(ord);
                          setAssignModalOpen(true);
                        }}
                      >
                        Allocate Vehicle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Assignment Modal */}
      {selectedOrder && (
        <AssignmentModal
          isOpen={assignModalOpen}
          onClose={() => {
            setAssignModalOpen(false);
            setSelectedOrder(null);
          }}
          order={selectedOrder}
          plan={activePlan}
          onAssigned={() => loadQueue()}
          onDeferred={(ord) => navigate('/dispatcher/deferrals')}
        />
      )}
    </div>
  );
};
