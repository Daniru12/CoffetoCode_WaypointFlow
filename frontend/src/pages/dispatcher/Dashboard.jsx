import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { planningApi } from '../../api/planning.api';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  ShoppingCart,
  Truck,
  RotateCcw,
  Calendar,
  AlertTriangle,
  Compass,
  TrendingUp,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';

export const DispatcherDashboard = () => {
  const [data, setData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { socket } = useSocket();

  useEffect(() => {
    loadDashboard();
    loadAlerts();

    if (socket) {
      const handleRefresh = () => {
        loadDashboard();
        loadAlerts();
      };
      socket.on('order.created', handleRefresh);
      socket.on('plan.published', handleRefresh);
      socket.on('loading.shortfall', handleRefresh);
      socket.on('vehicle.breakdown', handleRefresh);
      socket.on('order.deferred', handleRefresh);

      return () => {
        socket.off('order.created', handleRefresh);
        socket.off('plan.published', handleRefresh);
        socket.off('loading.shortfall', handleRefresh);
        socket.off('vehicle.breakdown', handleRefresh);
        socket.off('order.deferred', handleRefresh);
      };
    }
  }, [socket]);

  const loadDashboard = async () => {
    try {
      const res = await planningApi.getDispatcherDashboard();
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      const res = await planningApi.getDispatcherAlerts();
      setAlerts(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <LoadingSpinner text="Connecting to Central Dispatch Tower..." />;

  const { metrics = {}, vehiclesByStatus = [], activePlans = [] } = data || {};

  return (
    <div>
      {/* Action Header Strip */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Central Operations Overview</h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Real-time multi-depot fleet monitoring & planning orchestration
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-secondary" onClick={() => navigate('/dispatcher/orders')}>
            <ShoppingCart size={18} />
            <span>Orders Queue ({metrics.totalOrdersInQueue || 0})</span>
          </button>
          <button className="btn-primary" onClick={() => navigate('/dispatcher/planning')}>
            <Calendar size={18} />
            <span>Delivery Planning Console</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <Card style={{ cursor: 'pointer' }} onSelect={() => navigate('/dispatcher/orders')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Orders In Queue</span>
              <h3 style={{ fontSize: '1.8rem', marginTop: '0.2rem' }}>{metrics.totalOrdersInQueue || 0}</h3>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
              <ShoppingCart size={22} />
            </div>
          </div>
        </Card>

        <Card style={{ cursor: 'pointer' }} onSelect={() => navigate('/dispatcher/planning')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Available Vehicles</span>
              <h3 style={{ fontSize: '1.8rem', marginTop: '0.2rem', color: 'var(--primary-green)' }}>{metrics.availableVehiclesCount || 0}</h3>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#E8F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-green)' }}>
              <Truck size={22} />
            </div>
          </div>
        </Card>

        <Card style={{ cursor: 'pointer' }} onSelect={() => navigate('/dispatcher/tracking')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Routes</span>
              <h3 style={{ fontSize: '1.8rem', marginTop: '0.2rem', color: '#4338CA' }}>{metrics.activeTripsCount || 0}</h3>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4338CA' }}>
              <Compass size={22} />
            </div>
          </div>
        </Card>

        <Card style={{ cursor: 'pointer' }} onSelect={() => navigate('/dispatcher/deferrals')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Deferred Orders</span>
              <h3 style={{ fontSize: '1.8rem', marginTop: '0.2rem', color: metrics.deferredOrdersCount > 0 ? '#D97706' : 'inherit' }}>
                {metrics.deferredOrdersCount || 0}
              </h3>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706' }}>
              <RotateCcw size={22} />
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Critical Incidents</span>
              <h3 style={{ fontSize: '1.8rem', marginTop: '0.2rem', color: metrics.criticalIssuesCount > 0 ? '#DC2626' : 'inherit' }}>
                {metrics.criticalIssuesCount || 0}
              </h3>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626' }}>
              <AlertTriangle size={22} />
            </div>
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '1.5rem' }}>
        {/* Operational Alerts & Interventions */}
        <Card title="Live Operational Alerts & Exceptions" subtitle="Real-time shortfalls, breakdown warnings, and repeat deferrals">
          {alerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              No critical exceptions currently detected. Operations are running within tolerance.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {alerts.map((al, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: al.severity === 'CRITICAL' ? '#FEF2F2' : '#FFFBEB',
                    border: `1px solid ${al.severity === 'CRITICAL' ? '#FECACA' : '#FDE68A'}`
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <ShieldAlert size={20} color={al.severity === 'CRITICAL' ? '#DC2626' : '#D97706'} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{al.title}</div>
                      <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>{al.message}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {al.timestamp ? new Date(al.timestamp).toLocaleTimeString() : 'Recent'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Fleet Distribution & Quick Tools */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card title="Fleet Status Breakdown">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {vehiclesByStatus.map((v) => (
                <div key={v._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <Badge status={v._id} />
                  <span style={{ fontWeight: 700 }}>{v.count} units</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Operational Controls">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                className="btn-secondary"
                style={{ width: '100%', justifyContent: 'space-between' }}
                onClick={() => navigate('/dispatcher/planning')}
              >
                <span>Launch Planning Console</span>
                <ArrowRight size={16} />
              </button>
              <button
                className="btn-secondary"
                style={{ width: '100%', justifyContent: 'space-between' }}
                onClick={() => navigate('/dispatcher/tracking')}
              >
                <span>Live Fleet GPS Tracking</span>
                <ArrowRight size={16} />
              </button>
              <button
                className="btn-secondary"
                style={{ width: '100%', justifyContent: 'space-between' }}
                onClick={() => navigate('/dispatcher/forecasts')}
              >
                <span>Capacity & Demand Sizing</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
