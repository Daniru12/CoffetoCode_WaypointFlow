import React, { useState, useEffect } from 'react';
import { forecastsApi } from '../../api/forecasts.api';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { TrendingUp, Truck, Users, ThermometerSnowflake, BarChart3 } from 'lucide-react';

export const CapacityForecast = () => {
  const [forecasts, setForecasts] = useState([]);
  const [demandSummary, setDemandSummary] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadForecastData();
  }, []);

  const loadForecastData = async () => {
    setLoading(true);
    try {
      const [fRes, dRes] = await Promise.all([
        forecastsApi.getCapacityForecasts(),
        forecastsApi.getDemandForecast()
      ]);
      setForecasts(fRes.data || []);
      setDemandSummary(dRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Calculating fleet sizing & capacity forecasts..." />;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Capacity & Fleet Sizing Forecasts</h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Weekly predictive volume, reefer sizing, and driver scheduling models
        </span>
      </div>

      {/* Aggregate Demand Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Estimated Weekly Volume</span>
              <h3 style={{ fontSize: '1.6rem', marginTop: '0.2rem' }}>980 m³</h3>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
              <TrendingUp size={22} />
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Reefer Cold Chain Sizing</span>
              <h3 style={{ fontSize: '1.6rem', marginTop: '0.2rem', color: '#025E4C' }}>8 Vehicles</h3>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#E8F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#025E4C' }}>
              <ThermometerSnowflake size={22} />
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Fleet Crew Required</span>
              <h3 style={{ fontSize: '1.6rem', marginTop: '0.2rem', color: '#7C3AED' }}>24 Drivers</h3>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7C3AED' }}>
              <Users size={22} />
            </div>
          </div>
        </Card>
      </div>

      {/* Capacity Table */}
      <Card title="Multi-Depot Forecast Schedule">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 0.5rem' }}>Week Cycle</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Depot</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Brand</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Predicted Volume</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Chilled Volume</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Vehicles Needed</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Reefer Units</th>
              </tr>
            </thead>
            <tbody>
              {forecasts.map((f) => (
                <tr key={f._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>{f.week}</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>{f.depot}</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <Badge status={f.brand} />
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>{f.predictedTotalVolume} m³</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>{f.predictedChilledVolume} m³</td>
                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{f.estimatedVehicles} units</td>
                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{f.estimatedReeferCapacity} units</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
