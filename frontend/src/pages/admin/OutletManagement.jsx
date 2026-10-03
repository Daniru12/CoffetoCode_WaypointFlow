import React, { useState, useEffect } from 'react';
import {
  Store, MapPin, Building2, Clock, AlertTriangle, ShieldCheck,
  Search, Filter, ExternalLink, RefreshCw, CheckCircle2
} from 'lucide-react';
import { adminApi } from '../../api/admin.api';

const BRAND_CONFIG = {
  Fresh: { label: 'Waypoint Fresh', color: '#15803D', bg: '#DCFCE7', border: '#86EFAC', count: 80, desc: 'Pre-08:00 AM delivery window, ambient & chilled' },
  Style: { label: 'Waypoint Style', color: '#B45309', bg: '#FEF3C7', border: '#FCD34D', count: 25, desc: 'Weekly bulk orders, mall bay delivery windows' },
  Tech:  { label: 'Waypoint Tech',  color: '#3730A3', bg: '#E0E7FF', border: '#A5B4FC', count: 15, desc: 'High-value, fragile appliances, on-demand' }
};

export const OutletManagement = () => {
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('ALL');
  const [depotFilter, setDepotFilter] = useState('ALL');
  const [districtFilter, setDistrictFilter] = useState('ALL');
  const [constraintFilter, setConstraintFilter] = useState('ALL');

  useEffect(() => {
    loadOutlets();
  }, []);

  const loadOutlets = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getOutlets();
      setOutlets(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load outlets:', err);
    } finally {
      setLoading(false);
    }
  };

  // Distinct districts from data
  const districts = Array.from(new Set(outlets.map(o => o.district).filter(Boolean))).sort();

  const filteredOutlets = outlets.filter(o => {
    const term = search.toLowerCase();
    const matchesSearch =
      (o.outletId && o.outletId.toLowerCase().includes(term)) ||
      (o.name && o.name.toLowerCase().includes(term)) ||
      (o.district && o.district.toLowerCase().includes(term));
    const matchesBrand = brandFilter === 'ALL' || o.brand === brandFilter;
    const matchesDepot = depotFilter === 'ALL' || o.depot === depotFilter;
    const matchesDistrict = districtFilter === 'ALL' || o.district === districtFilter;
    const matchesConstraint =
      constraintFilter === 'ALL' ||
      (constraintFilter === 'van_only' && o.parkingConstraint === 'van_only') ||
      (constraintFilter === 'mall_dock' && o.parkingConstraint === 'mall_dock') ||
      (constraintFilter === 'normal' && (o.parkingConstraint === 'normal' || !o.parkingConstraint));

    return matchesSearch && matchesBrand && matchesDepot && matchesDistrict && matchesConstraint;
  });

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#DC262615', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Store size={22} color="#DC2626" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Retail Outlet Network
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
              120 commercial locations across 12 Sri Lankan districts with access and delivery constraints.
            </p>
          </div>
        </div>

        <button
          onClick={loadOutlets}
          style={{
            padding: '0.55rem 0.9rem',
            border: '1.5px solid var(--border)',
            borderRadius: '8px',
            backgroundColor: '#FFFFFF',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            fontWeight: 600
          }}
        >
          <RefreshCw size={15} />
          <span>Refresh Directory</span>
        </button>
      </div>

      {/* Brand Stat Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        {Object.entries(BRAND_CONFIG).map(([brandKey, config]) => {
          const brandOutlets = outlets.filter(o => o.brand === brandKey);
          const vanOnlyCount = brandOutlets.filter(o => o.parkingConstraint === 'van_only').length;

          return (
            <div
              key={brandKey}
              className="wf-card"
              style={{
                padding: '1.25rem',
                borderLeft: `4px solid ${config.color}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  backgroundColor: config.bg,
                  color: config.color,
                  border: `1px solid ${config.border}`
                }}>
                  {config.label}
                </span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {brandOutlets.length} Outlets
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                {config.desc}
              </p>
              <div style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', gap: '1rem', marginTop: '0.4rem', borderTop: '1px dashed var(--border)', paddingTop: '0.5rem' }}>
                <span>Van-Only Outlets: <strong>{vanOnlyCount}</strong></span>
                <span>Depots: Peliyagoda / Kandy</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Outlets Table & Filters */}
      <div className="wf-card" style={{ padding: 0, overflow: 'hidden' }}>

        {/* Filter bar */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          backgroundColor: '#FAFAFA'
        }}>
          <div style={{ flex: '1 1 240px', position: 'relative' }}>
            <input
              type="text"
              placeholder="Search by Outlet ID, Store Name, or District..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.85rem 0.6rem 2.4rem',
                borderRadius: '8px',
                border: '1.5px solid var(--border)',
                backgroundColor: '#FFFFFF',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          </div>

          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            style={{ padding: '0.6rem', borderRadius: '8px', border: '1.5px solid var(--border)', fontSize: '0.85rem', backgroundColor: '#fff' }}
          >
            <option value="ALL">All Brands (120)</option>
            <option value="Fresh">Waypoint Fresh</option>
            <option value="Style">Waypoint Style</option>
            <option value="Tech">Waypoint Tech</option>
          </select>

          <select
            value={depotFilter}
            onChange={(e) => setDepotFilter(e.target.value)}
            style={{ padding: '0.6rem', borderRadius: '8px', border: '1.5px solid var(--border)', fontSize: '0.85rem', backgroundColor: '#fff' }}
          >
            <option value="ALL">All Home Depots</option>
            <option value="Peliyagoda">Peliyagoda Depot</option>
            <option value="Kandy">Kandy Depot</option>
          </select>

          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            style={{ padding: '0.6rem', borderRadius: '8px', border: '1.5px solid var(--border)', fontSize: '0.85rem', backgroundColor: '#fff' }}
          >
            <option value="ALL">All Districts</option>
            {districts.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            value={constraintFilter}
            onChange={(e) => setConstraintFilter(e.target.value)}
            style={{ padding: '0.6rem', borderRadius: '8px', border: '1.5px solid var(--border)', fontSize: '0.85rem', backgroundColor: '#fff' }}
          >
            <option value="ALL">All Access Constraints</option>
            <option value="van_only">Van Only Access</option>
            <option value="mall_dock">Mall Bay Dock</option>
            <option value="normal">Standard Truck Access</option>
          </select>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.85rem 1.25rem' }}>Outlet Code</th>
                <th style={{ padding: '0.85rem 1rem' }}>Location Name</th>
                <th style={{ padding: '0.85rem 1rem' }}>Brand Segment</th>
                <th style={{ padding: '0.85rem 1rem' }}>District & Depot</th>
                <th style={{ padding: '0.85rem 1rem' }}>Dock & Parking Type</th>
                <th style={{ padding: '0.85rem 1rem' }}>Delivery Window</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Coordinates</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Loading outlet records...
                  </td>
                </tr>
              ) : filteredOutlets.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No outlets match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredOutlets.map(o => {
                  const bConfig = BRAND_CONFIG[o.brand] || BRAND_CONFIG.Fresh;
                  const isVanOnly = o.parkingConstraint === 'van_only';

                  return (
                    <tr key={o.outletId} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.85rem 1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {o.outletId}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>
                        {o.name || `Waypoint ${o.brand} ${o.district}`}
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '4px',
                          backgroundColor: bConfig.bg,
                          color: bConfig.color,
                          border: `1px solid ${bConfig.border}`
                        }}>
                          {o.brand}
                        </span>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <MapPin size={13} color="#64748B" />
                          <span>{o.district}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {o.depot} Depot
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {isVanOnly ? (
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#FEF2F2',
                              color: '#DC2626',
                              border: '1px solid #FECACA'
                            }}>
                              Van Only
                            </span>
                          ) : o.parkingConstraint === 'mall_dock' ? (
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#FFFBEB',
                              color: '#D97706',
                              border: '1px solid #FDE68A'
                            }}>
                              Mall Dock
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: '#475569' }}>
                              Standard Dock
                            </span>
                          )}
                        </div>
                        {o.dockType && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Type: {o.dockType}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}>
                          <Clock size={12} color="#64748B" />
                          <span>{o.windowOpenTime || '06:00'} – {o.windowCloseTime || '08:00'}</span>
                        </div>
                        {o.brand === 'Fresh' && (
                          <span style={{ fontSize: '0.68rem', color: '#15803D', fontWeight: 600 }}>
                            Pre-08:00 Mandate
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '0.85rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {o.latitude ? `${o.latitude.toFixed(4)}, ${o.longitude.toFixed(4)}` : 'GPS Verified'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
