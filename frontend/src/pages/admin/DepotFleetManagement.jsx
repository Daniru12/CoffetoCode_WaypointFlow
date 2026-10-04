import React, { useState, useEffect } from 'react';
import {
  Building2, Truck, Gauge, Wrench, AlertTriangle, CheckCircle,
  Filter, Search, User, Fuel, ShieldCheck, RefreshCw, X, ChevronRight, Plus
} from 'lucide-react';
import { adminApi } from '../../api/admin.api';
import { usersApi } from '../../api/users.api';

const STATUS_CONFIG = {
  AVAILABLE:   { label: 'Available / Ready', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  ASSIGNED:    { label: 'Assigned to Trip',  color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  LOADING:     { label: 'At Dock Loading',   color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  IN_TRANSIT:  { label: 'En Route',         color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  IN_WORKSHOP: { label: 'In Maintenance',    color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  UNAVAILABLE: { label: 'Offline / OOO',     color: '#4B5563', bg: '#F3F4F6', border: '#E5E7EB' },
};

export const DepotFleetManagement = () => {
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [depotFilter, setDepotFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [tempFilter, setTempFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Maintenance & Driver Assignment Modal
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [modalForm, setModalForm] = useState({
    status: '',
    reason: '',
    assignedDriver: '',
    weeklyFuelQuotaL: 200,
    fuelUsedThisWeek: 0
  });

  // Provision New Fleet Vehicle Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVehicleForm, setNewVehicleForm] = useState({
    vehicleId: '',
    type: 'van',
    temp: 'reefer',
    weightCapKg: 1500,
    volumeCapM3: 8,
    fuelType: 'diesel',
    kmPerL: 7.5,
    weeklyFuelQuotaL: 180,
    depot: 'Peliyagoda',
    assignedDriver: '',
    status: 'AVAILABLE'
  });

  const [submitting, setSubmitting] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [vRes, dRes] = await Promise.all([
        adminApi.getVehicles(),
        usersApi.getDrivers()
      ]);
      setVehicles(Array.isArray(vRes.data) ? vRes.data : []);
      setDrivers(Array.isArray(dRes.data) ? dRes.data : []);
    } catch (err) {
      console.error('Error loading fleet data:', err);
    } finally {
      setLoading(false);
    }
  };

  const openVehicleModal = (v) => {
    setSelectedVehicle(v);
    setModalForm({
      status: v.status || 'AVAILABLE',
      reason: '',
      assignedDriver: v.assignedDriver?._id || v.assignedDriver || '',
      weeklyFuelQuotaL: v.weeklyFuelQuotaL || 200,
      fuelUsedThisWeek: v.fuelUsedThisWeek || 0
    });
  };

  const handleUpdateVehicle = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminApi.updateVehicle(selectedVehicle.vehicleId || selectedVehicle._id, {
        status: modalForm.status,
        reason: modalForm.reason || 'Operational status update by Administrator',
        assignedDriver: modalForm.assignedDriver || null,
        weeklyFuelQuotaL: Number(modalForm.weeklyFuelQuotaL),
        fuelUsedThisWeek: Number(modalForm.fuelUsedThisWeek)
      });

      setSelectedVehicle(null);
      await loadData();
      setActionNotice({ type: 'success', text: `Fleet unit ${selectedVehicle.vehicleId} updated successfully.` });
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to update vehicle record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateVehicle = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminApi.createVehicle({
        vehicleId: newVehicleForm.vehicleId,
        type: newVehicleForm.type,
        temp: newVehicleForm.temp,
        weightCapKg: Number(newVehicleForm.weightCapKg),
        volumeCapM3: Number(newVehicleForm.volumeCapM3),
        fuelType: newVehicleForm.fuelType,
        kmPerL: Number(newVehicleForm.kmPerL),
        weeklyFuelQuotaL: Number(newVehicleForm.weeklyFuelQuotaL),
        depot: newVehicleForm.depot,
        status: newVehicleForm.status,
        assignedDriver: newVehicleForm.assignedDriver || null
      });

      setShowAddModal(false);
      setNewVehicleForm({
        vehicleId: '',
        type: 'van',
        temp: 'reefer',
        weightCapKg: 1500,
        volumeCapM3: 8,
        fuelType: 'diesel',
        kmPerL: 7.5,
        weeklyFuelQuotaL: 180,
        depot: 'Peliyagoda',
        assignedDriver: '',
        status: 'AVAILABLE'
      });
      await loadData();
      setActionNotice({ type: 'success', text: `New fleet vehicle registered successfully.` });
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to register new vehicle.');
    } finally {
      setSubmitting(false);
    }
  };

  // Metrics computation
  const peliyagodaVehicles = vehicles.filter(v => v.depot === 'Peliyagoda');
  const kandyVehicles = vehicles.filter(v => v.depot === 'Kandy');
  const totalReefers = vehicles.filter(v => v.temp === 'reefer').length;
  const inWorkshopCount = vehicles.filter(v => v.status === 'IN_WORKSHOP').length;

  const filteredVehicles = vehicles.filter(v => {
    const term = search.toLowerCase();
    const matchesSearch =
      (v.vehicleId && v.vehicleId.toLowerCase().includes(term)) ||
      (v.depot && v.depot.toLowerCase().includes(term)) ||
      (v.assignedDriver?.name && v.assignedDriver.name.toLowerCase().includes(term));
    const matchesDepot = depotFilter === 'ALL' || v.depot === depotFilter;
    const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || v.type === typeFilter;
    const matchesTemp = tempFilter === 'ALL' || v.temp === tempFilter;
    return matchesSearch && matchesDepot && matchesStatus && matchesType && matchesTemp;
  });

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#025E4C15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={22} color="#025E4C" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Depot & Fleet Roster
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
              Peliyagoda Central Operations & Kandy Regional Hub vehicle allocations and maintenance governance.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
            style={{
              padding: '0.55rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.85rem'
            }}
          >
            <Plus size={16} />
            <span>+ Provision Vehicle</span>
          </button>

          <button
            onClick={loadData}
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
            <span>Refresh Fleet</span>
          </button>
        </div>
      </div>

      {actionNotice && (
        <div style={{
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          fontSize: '0.85rem',
          fontWeight: 600,
          backgroundColor: actionNotice.type === 'success' ? '#ECFDF5' : '#FEF2F2',
          color: actionNotice.type === 'success' ? '#065F46' : '#991B1B',
          border: `1px solid ${actionNotice.type === 'success' ? '#A7F3D0' : '#FECACA'}`
        }}>
          {actionNotice.text}
        </div>
      )}

      {/* Depot Overview Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>

        {/* Peliyagoda Card */}
        <div className="wf-card" style={{ padding: '1.25rem', borderLeft: '4px solid #025E4C' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#025E4C', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Western Headquarters
            </span>
            <span style={{ fontSize: '0.72rem', backgroundColor: '#E6F4F0', color: '#025E4C', padding: '2px 8px', borderRadius: '999px', fontWeight: 700 }}>
              Primary Hub
            </span>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>
            Peliyagoda Logistics Depot
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.75rem' }}>
            <div style={{ backgroundColor: '#F8FAFC', padding: '0.6rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Fleet Units</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>{peliyagodaVehicles.length}</div>
            </div>
            <div style={{ backgroundColor: '#F8FAFC', padding: '0.6rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Reefer Trucks/Vans</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0369A1' }}>
                {peliyagodaVehicles.filter(v => v.temp === 'reefer').length}
              </div>
            </div>
          </div>
        </div>

        {/* Kandy Card */}
        <div className="wf-card" style={{ padding: '1.25rem', borderLeft: '4px solid #2563EB' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Central Hill Country Hub
            </span>
            <span style={{ fontSize: '0.72rem', backgroundColor: '#EFF6FF', color: '#2563EB', padding: '2px 8px', borderRadius: '999px', fontWeight: 700 }}>
              Regional Hub
            </span>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>
            Kandy Logistics Depot
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.75rem' }}>
            <div style={{ backgroundColor: '#F8FAFC', padding: '0.6rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Fleet Units</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>{kandyVehicles.length}</div>
            </div>
            <div style={{ backgroundColor: '#F8FAFC', padding: '0.6rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Reefer Units</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0369A1' }}>
                {kandyVehicles.filter(v => v.temp === 'reefer').length}
              </div>
            </div>
          </div>
        </div>

        {/* Fleet Integrity Card */}
        <div className="wf-card" style={{ padding: '1.25rem', borderLeft: '4px solid #D97706' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Network Readiness
            </span>
            <span style={{ fontSize: '0.72rem', backgroundColor: '#FEF3C7', color: '#D97706', padding: '2px 8px', borderRadius: '999px', fontWeight: 700 }}>
              60 Total Fleet
            </span>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>
            Operational Availability
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.75rem' }}>
            <div style={{ backgroundColor: '#F8FAFC', padding: '0.6rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Active Service Ready</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#059669' }}>
                {vehicles.filter(v => v.status === 'AVAILABLE' || v.status === 'READY').length}
              </div>
            </div>
            <div style={{ backgroundColor: '#F8FAFC', padding: '0.6rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>In Workshop / Offline</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: inWorkshopCount > 0 ? '#DC2626' : '#64748B' }}>
                {inWorkshopCount}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fleet Filter & Inventory */}
      <div className="wf-card" style={{ padding: 0, overflow: 'hidden' }}>

        {/* Filters */}
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
              placeholder="Search vehicle code or driver..."
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
            value={depotFilter}
            onChange={(e) => setDepotFilter(e.target.value)}
            style={{ padding: '0.6rem', borderRadius: '8px', border: '1.5px solid var(--border)', fontSize: '0.85rem', backgroundColor: '#fff' }}
          >
            <option value="ALL">All Depots</option>
            <option value="Peliyagoda">Peliyagoda Depot</option>
            <option value="Kandy">Kandy Depot</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '0.6rem', borderRadius: '8px', border: '1.5px solid var(--border)', fontSize: '0.85rem', backgroundColor: '#fff' }}
          >
            <option value="ALL">All Operational Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ padding: '0.6rem', borderRadius: '8px', border: '1.5px solid var(--border)', fontSize: '0.85rem', backgroundColor: '#fff' }}
          >
            <option value="ALL">All Vehicle Types</option>
            <option value="truck">Trucks (Heavy/Standard)</option>
            <option value="van">Vans (Access Constrained)</option>
          </select>

          <select
            value={tempFilter}
            onChange={(e) => setTempFilter(e.target.value)}
            style={{ padding: '0.6rem', borderRadius: '8px', border: '1.5px solid var(--border)', fontSize: '0.85rem', backgroundColor: '#fff' }}
          >
            <option value="ALL">All Temperature Classes</option>
            <option value="reefer">Refrigerated (Chilled & Ambient)</option>
            <option value="ambient">Ambient (Dry Box Only)</option>
          </select>
        </div>

        {/* Vehicles Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.85rem 1.25rem' }}>Unit Code</th>
                <th style={{ padding: '0.85rem 1rem' }}>Type & Class</th>
                <th style={{ padding: '0.85rem 1rem' }}>Base Depot</th>
                <th style={{ padding: '0.85rem 1rem' }}>Payload & Capacity</th>
                <th style={{ padding: '0.85rem 1rem' }}>Fuel Quota Status</th>
                <th style={{ padding: '0.85rem 1rem' }}>Designated Driver</th>
                <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Loading fleet records...
                  </td>
                </tr>
              ) : filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No fleet units match the current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredVehicles.map(v => {
                  const s = STATUS_CONFIG[v.status] || STATUS_CONFIG.AVAILABLE;
                  const fuelPct = Math.min(100, Math.round(((v.fuelUsedThisWeek || 0) / (v.weeklyFuelQuotaL || 200)) * 100));

                  return (
                    <tr key={v._id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.85rem 1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Truck size={16} color={v.temp === 'reefer' ? '#0369A1' : '#64748B'} />
                          <span>{v.vehicleId}</span>
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{v.type}</span>
                          <span style={{
                            fontSize: '0.7rem',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: v.temp === 'reefer' ? '#CFFAFE' : '#F1F5F9',
                            color: v.temp === 'reefer' ? '#0369A1' : '#475569',
                            fontWeight: 700
                          }}>
                            {v.temp.toUpperCase()}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                        {v.depot}
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div>{v.weightCapKg} kg</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{v.volumeCapM3} m³</div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}>
                          <Fuel size={12} color="#64748B" />
                          <span>{v.fuelUsedThisWeek || 0} / {v.weeklyFuelQuotaL || 200} L ({fuelPct}%)</span>
                        </div>
                        <div style={{ width: '100px', height: '5px', backgroundColor: '#E2E8F0', borderRadius: '999px', marginTop: '4px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${fuelPct}%`,
                            height: '100%',
                            backgroundColor: fuelPct > 85 ? '#DC2626' : fuelPct > 60 ? '#D97706' : '#059669'
                          }} />
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        {v.assignedDriver ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <User size={13} color="#2563EB" />
                            <span style={{ fontWeight: 600 }}>{v.assignedDriver.name}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Unassigned</span>
                        )}
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.25rem 0.6rem',
                          borderRadius: '999px',
                          backgroundColor: s.bg,
                          color: s.color,
                          border: `1px solid ${s.border}`
                        }}>
                          {s.label}
                        </span>
                      </td>

                      <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                        <button
                          onClick={() => openVehicleModal(v)}
                          style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '6px',
                            border: '1px solid var(--border)',
                            backgroundColor: '#FFFFFF',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            color: 'var(--text-primary)'
                          }}
                        >
                          Manage Unit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MANAGE VEHICLE MODAL */}
      {selectedVehicle && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div className="wf-card" style={{ maxWidth: '520px', width: '100%', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                  Manage Unit: {selectedVehicle.vehicleId}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {selectedVehicle.depot} Depot • {selectedVehicle.type.toUpperCase()} ({selectedVehicle.temp})
                </span>
              </div>
              <button onClick={() => setSelectedVehicle(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateVehicle} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* Status */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Operational State *
                </label>
                <select
                  value={modalForm.status}
                  onChange={(e) => setModalForm(prev => ({ ...prev, status: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1.5px solid var(--border)',
                    fontSize: '0.875rem'
                  }}
                >
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>

              {/* Status Reason */}
              {modalForm.status === 'IN_WORKSHOP' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#DC2626', marginBottom: '0.35rem' }}>
                    Maintenance & Workshop Reason *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Scheduled brake overhaul, reefer compressor fault"
                    value={modalForm.reason}
                    onChange={(e) => setModalForm(prev => ({ ...prev, reason: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1.5px solid #FECACA',
                      fontSize: '0.875rem',
                      backgroundColor: '#FFF5F5'
                    }}
                  />
                </div>
              )}

              {/* Driver Pairing */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Designated Fleet Driver
                </label>
                <select
                  value={modalForm.assignedDriver}
                  onChange={(e) => setModalForm(prev => ({ ...prev, assignedDriver: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1.5px solid var(--border)',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="">No Driver Assigned (Pool Unit)</option>
                  {drivers
                    .filter(d => !d.depot || d.depot === selectedVehicle.depot)
                    .map(d => (
                      <option key={d._id} value={d._id}>
                        {d.name} ({d.email})
                      </option>
                    ))}
                </select>
                <span style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '3px', display: 'block' }}>
                  Drivers filtered to {selectedVehicle.depot} Depot roster.
                </span>
              </div>

              {/* Fuel Quota Adjustments */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Weekly Quota (Litres)
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="1000"
                    value={modalForm.weeklyFuelQuotaL}
                    onChange={(e) => setModalForm(prev => ({ ...prev, weeklyFuelQuotaL: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1.5px solid var(--border)',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Consumed This Week (L)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    value={modalForm.fuelUsedThisWeek}
                    onChange={(e) => setModalForm(prev => ({ ...prev, fuelUsedThisWeek: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1.5px solid var(--border)',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setSelectedVehicle(null)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: '#F8FAFC',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1, padding: '0.75rem' }}
                  disabled={submitting}
                >
                  {submitting ? 'Updating...' : 'Save Unit Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Provision New Vehicle Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '560px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Provision Fleet Vehicle
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Register a new transport asset into the Waypoint central fleet registry.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateVehicle} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Vehicle ID / Plate *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. VEH061 or WP-VAN-09"
                    value={newVehicleForm.vehicleId}
                    onChange={(e) => setNewVehicleForm(prev => ({ ...prev, vehicleId: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1.5px solid var(--border)',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Operating Depot *
                  </label>
                  <select
                    value={newVehicleForm.depot}
                    onChange={(e) => setNewVehicleForm(prev => ({ ...prev, depot: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1.5px solid var(--border)',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="Peliyagoda">Peliyagoda Central</option>
                    <option value="Kandy">Kandy Regional Hub</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Vehicle Type *
                  </label>
                  <select
                    value={newVehicleForm.type}
                    onChange={(e) => {
                      const t = e.target.value;
                      setNewVehicleForm(prev => ({
                        ...prev,
                        type: t,
                        weightCapKg: t === 'van' ? 1500 : 5000,
                        volumeCapM3: t === 'van' ? 8 : 24,
                        kmPerL: t === 'van' ? 7.5 : 4.0
                      }));
                    }}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1.5px solid var(--border)',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="van">Van (Access-friendly, 1.5-1.8t)</option>
                    <option value="truck">Heavy Truck (Standard, 5-6t)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Temperature Regimen *
                  </label>
                  <select
                    value={newVehicleForm.temp}
                    onChange={(e) => setNewVehicleForm(prev => ({ ...prev, temp: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1.5px solid var(--border)',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="reefer">Reefer (Cold Chain / Chilled Dairy & Produce)</option>
                    <option value="ambient">Ambient (Dry Cargo / Style & Tech)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Payload Cap (kg) *
                  </label>
                  <input
                    type="number"
                    required
                    min="500"
                    max="15000"
                    value={newVehicleForm.weightCapKg}
                    onChange={(e) => setNewVehicleForm(prev => ({ ...prev, weightCapKg: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1.5px solid var(--border)',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Volume Cap (m³) *
                  </label>
                  <input
                    type="number"
                    required
                    min="3"
                    max="50"
                    step="0.5"
                    value={newVehicleForm.volumeCapM3}
                    onChange={(e) => setNewVehicleForm(prev => ({ ...prev, volumeCapM3: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1.5px solid var(--border)',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Fuel Quota (L/week)
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="1000"
                    value={newVehicleForm.weeklyFuelQuotaL}
                    onChange={(e) => setNewVehicleForm(prev => ({ ...prev, weeklyFuelQuotaL: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1.5px solid var(--border)',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Efficiency (km/L)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="20"
                    value={newVehicleForm.kmPerL}
                    onChange={(e) => setNewVehicleForm(prev => ({ ...prev, kmPerL: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1.5px solid var(--border)',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Assign Primary Fleet Driver (Optional)
                </label>
                <select
                  value={newVehicleForm.assignedDriver}
                  onChange={(e) => setNewVehicleForm(prev => ({ ...prev, assignedDriver: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1.5px solid var(--border)',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="">Leave Unassigned (Pool Unit)</option>
                  {drivers
                    .filter(d => !d.depot || d.depot === newVehicleForm.depot)
                    .map(d => (
                      <option key={d._id} value={d._id}>
                        {d.name} ({d.email})
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: '#F8FAFC',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1, padding: '0.75rem' }}
                  disabled={submitting}
                >
                  {submitting ? 'Registering...' : 'Provision Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
