import React, { useState, useEffect } from 'react';
import {
  UserPlus, Mail, Lock, User, Building2, Store,
  CheckCircle, XCircle, ChevronDown, ShieldCheck,
  Truck, Package, Navigation, Users, Search, Activity,
  Edit2, KeyRound, Power, MapPin, AlertCircle, RefreshCw, X
} from 'lucide-react';
import { usersApi } from '../../api/users.api';
import { authApi } from '../../api/auth.api';
import { adminApi } from '../../api/admin.api';

const ROLES = [
  { value: 'DISPATCHER',    label: 'Dispatcher',       icon: Truck,       color: '#025E4C', badgeBg: '#E6F4F0', desc: 'Central logistics routing & deferrals' },
  { value: 'LOADER',        label: 'Warehouse Loader', icon: Package,     color: '#D97706', badgeBg: '#FEF3C7', desc: 'Dock sequencing & shortfall checks' },
  { value: 'DRIVER',        label: 'Fleet Driver',     icon: Navigation,  color: '#2563EB', badgeBg: '#DBEAFE', desc: 'Route execution & proof of delivery' },
  { value: 'STORE_MANAGER', label: 'Store Manager',    icon: Store,       color: '#DC2626', badgeBg: '#FEE2E2', desc: 'Store order placement & receipt confirmation' },
  { value: 'ADMIN',         label: 'System Admin',     icon: ShieldCheck, color: '#7C3AED', badgeBg: '#EDE9FE', desc: 'Master directory & fleet configuration' },
];

const DEPOTS = ['Peliyagoda', 'Kandy'];

const fieldStyle = {
  width: '100%',
  padding: '0.65rem 0.85rem 0.65rem 2.4rem',
  borderRadius: '8px',
  border: '1.5px solid var(--border)',
  backgroundColor: '#F8FAFC',
  fontSize: '0.875rem',
  color: 'var(--text-primary)',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  marginBottom: '0.35rem'
};

const iconPos = {
  position: 'absolute',
  left: '0.75rem',
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#94A3B8',
  pointerEvents: 'none'
};

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: '',
  depot: 'Peliyagoda',
  outletId: '',
  assignedVehicle: '',
  licenseNumber: '',
  licenseCategory: 'HEAVY_COMMERCIAL',
  licenseExpiryDate: '',
  phone: ''
};

export const UserManagement = () => {
  const [activeTab, setActiveTab] = useState('directory'); // 'directory' or 'provision'

  // Reference Datasets
  const [outlets, setOutlets] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loadingRefs, setLoadingRefs] = useState(false);

  // Form State
  const [form, setForm] = useState(EMPTY_FORM);
  const [status, setStatus] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  // Directory State
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [depotFilter, setDepotFilter] = useState('ALL');

  // Modals
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    role: '',
    depot: '',
    outletId: '',
    assignedVehicle: '',
    isActive: true,
    licenseNumber: '',
    licenseCategory: 'HEAVY_COMMERCIAL',
    licenseExpiryDate: '',
    phone: ''
  });
  const [editLoading, setEditLoading] = useState(false);

  const [passwordResetUser, setPasswordResetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  useEffect(() => {
    fetchUsers();
    fetchReferenceData();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await usersApi.getAll();
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReferenceData = async () => {
    setLoadingRefs(true);
    try {
      const [outletsRes, vehiclesRes] = await Promise.all([
        adminApi.getOutlets(),
        adminApi.getVehicles()
      ]);
      setOutlets(Array.isArray(outletsRes.data) ? outletsRes.data : []);
      setVehicles(Array.isArray(vehiclesRes.data) ? vehiclesRes.data : []);
    } catch (err) {
      console.error('Failed to load reference data:', err);
    } finally {
      setLoadingRefs(false);
    }
  };

  const selectedRole = ROLES.find(r => r.value === form.role);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => {
      const next = { ...prev, [name]: value };
      // Reset dependent fields when role changes
      if (name === 'role') {
        if (value === 'STORE_MANAGER') {
          next.assignedVehicle = '';
        } else if (value === 'DRIVER') {
          next.outletId = '';
        } else if (value === 'DISPATCHER' || value === 'LOADER') {
          next.outletId = '';
          next.assignedVehicle = '';
        }
      }
      return next;
    });
    setStatus(null);
  };

  const handleProvisionSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);

    if (form.password !== form.confirmPassword) {
      setStatus({ type: 'error', message: 'Entered passwords do not match.' });
      return;
    }
    if (form.password.length < 8) {
      setStatus({ type: 'error', message: 'Password must contain at least 8 characters.' });
      return;
    }

    setFormLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
        depot: form.depot || undefined,
        outletId: form.role === 'STORE_MANAGER' ? form.outletId : undefined,
        assignedVehicle: form.role === 'DRIVER' ? (form.assignedVehicle || undefined) : undefined,
        licenseNumber: form.role === 'DRIVER' ? (form.licenseNumber || undefined) : undefined,
        licenseCategory: form.role === 'DRIVER' ? (form.licenseCategory || undefined) : undefined,
        licenseExpiryDate: form.role === 'DRIVER' ? (form.licenseExpiryDate || undefined) : undefined,
        phone: form.phone || undefined,
      };

      // Match selected outlet ObjectId if STORE_MANAGER
      if (form.role === 'STORE_MANAGER' && form.outletId) {
        const found = outlets.find(o => o.outletId === form.outletId);
        if (found) payload.outlet = found._id;
      }

      await authApi.register(payload);

      setStatus({
        type: 'success',
        message: `Account for ${form.name} created successfully as ${selectedRole?.label}.`
      });
      setForm(EMPTY_FORM);
      fetchUsers();
    } catch (err) {
      setStatus({
        type: 'error',
        message: err?.response?.data?.message || err.message || 'Failed to create user account.'
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async (user) => {
    const nextStatus = !user.isActive;
    try {
      await usersApi.toggleStatus(user._id, nextStatus);
      setUsers(prev => prev.map(u => u._id === user._id ? { ...u, isActive: nextStatus } : u));
      setActionNotice({
        type: 'success',
        text: `Account for ${user.name} is now ${nextStatus ? 'Active' : 'Suspended'}.`
      });
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err) {
      setActionNotice({
        type: 'error',
        text: err?.response?.data?.message || 'Failed to update user status.'
      });
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || '',
      role: user.role || '',
      depot: user.depot || 'Peliyagoda',
      outletId: user.outletId || (user.outlet?.outletId) || '',
      assignedVehicle: user.assignedVehicle?._id || user.assignedVehicle || '',
      isActive: user.isActive !== undefined ? user.isActive : true,
      licenseNumber: user.licenseNumber || '',
      licenseCategory: user.licenseCategory || 'HEAVY_COMMERCIAL',
      licenseExpiryDate: user.licenseExpiryDate ? user.licenseExpiryDate.substring(0, 10) : '',
      phone: user.phone || ''
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      const payload = {
        name: editForm.name.trim(),
        role: editForm.role,
        depot: editForm.depot,
        isActive: editForm.isActive
      };

      if (editForm.role === 'STORE_MANAGER') {
        payload.outletId = editForm.outletId;
        const found = outlets.find(o => o.outletId === editForm.outletId);
        if (found) payload.outlet = found._id;
      } else {
        payload.outletId = null;
        payload.outlet = null;
      }

      if (editForm.role === 'DRIVER') {
        payload.assignedVehicle = editForm.assignedVehicle || null;
        payload.licenseNumber = editForm.licenseNumber || null;
        payload.licenseCategory = editForm.licenseCategory || null;
        payload.licenseExpiryDate = editForm.licenseExpiryDate || null;
        payload.phone = editForm.phone || null;
      } else {
        payload.assignedVehicle = null;
      }

      await usersApi.update(editingUser._id, payload);
      setEditingUser(null);
      fetchUsers();
      setActionNotice({ type: 'success', text: `Profile for ${editForm.name} updated.` });
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to update user.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters long.');
      return;
    }
    setResetLoading(true);
    try {
      await usersApi.resetPassword(passwordResetUser._id, newPassword);
      setPasswordResetUser(null);
      setNewPassword('');
      setActionNotice({ type: 'success', text: `Credentials reset for ${passwordResetUser.name}.` });
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err) {
      alert(err?.response?.data?.message || 'Password reset failed.');
    } finally {
      setResetLoading(false);
    }
  };

  // Filtered directory
  const filteredUsers = users.filter(u => {
    const term = search.toLowerCase();
    const matchesSearch =
      (u.name && u.name.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.outletId && u.outletId.toLowerCase().includes(term)) ||
      (u.depot && u.depot.toLowerCase().includes(term));
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesDepot = depotFilter === 'ALL' || u.depot === depotFilter;
    return matchesSearch && matchesRole && matchesDepot;
  });

  // Filter available vehicles for selected depot in provision/edit form
  const availableVehicles = vehicles.filter(v => {
    const targetDepot = activeTab === 'provision' ? form.depot : editForm.depot;
    return !targetDepot || v.depot === targetDepot;
  });

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#7C3AED15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={22} color="#7C3AED" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Personnel & Role Directory</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                Manage staff assignments, base depots, vehicle allocation, and authentication access.
              </p>
            </div>
          </div>
        </div>

        {/* Tab switch */}
        <div style={{ display: 'flex', gap: '0.4rem', backgroundColor: '#F1F5F9', padding: '0.3rem', borderRadius: '10px' }}>
          <button
            onClick={() => setActiveTab('directory')}
            style={{
              padding: '0.5rem 1.1rem',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: activeTab === 'directory' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'directory' ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: activeTab === 'directory' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            Staff Directory ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('provision')}
            style={{
              padding: '0.5rem 1.1rem',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: activeTab === 'provision' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'provision' ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: activeTab === 'provision' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            + Register Staff Member
          </button>
        </div>
      </div>

      {/* Global alert feedback */}
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

      {/* DIRECTORY VIEW */}
      {activeTab === 'directory' && (
        <div className="wf-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* Filter Bar */}
          <div style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            alignItems: 'center',
            backgroundColor: '#FAFAFA'
          }}>
            <div style={{ flex: '1 1 260px', position: 'relative' }}>
              <input
                type="text"
                placeholder="Search staff by name, email, outlet, or depot..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ ...fieldStyle, paddingLeft: '2.5rem' }}
              />
              <Search size={16} style={iconPos} />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{ ...fieldStyle, width: '175px', paddingLeft: '0.85rem' }}
              >
                <option value="ALL">All Roles</option>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>

              <select
                value={depotFilter}
                onChange={(e) => setDepotFilter(e.target.value)}
                style={{ ...fieldStyle, width: '160px', paddingLeft: '0.85rem' }}
              >
                <option value="ALL">All Base Depots</option>
                <option value="Peliyagoda">Peliyagoda</option>
                <option value="Kandy">Kandy</option>
              </select>

              <button
                onClick={fetchUsers}
                title="Refresh staff list"
                style={{
                  padding: '0.65rem 0.85rem',
                  border: '1.5px solid var(--border)',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)'
                }}
              >
                <RefreshCw size={15} />
                <span>Sync</span>
              </button>
            </div>
          </div>

          {/* Staff Roster Grid */}
          <div style={{ padding: '1.5rem', minHeight: '300px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
                Loading personnel records...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
                No personnel found matching the specified filters.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.1rem' }}>
                {filteredUsers.map(u => {
                  const rInfo = ROLES.find(r => r.value === u.role) || { icon: User, color: '#64748B', label: u.role, badgeBg: '#F1F5F9' };
                  const RoleIcon = rInfo.icon;
                  const isStoreManager = u.role === 'STORE_MANAGER';
                  const isDriver = u.role === 'DRIVER';

                  return (
                    <div
                      key={u._id}
                      style={{
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        padding: '1.25rem',
                        backgroundColor: '#FFFFFF',
                        boxShadow: 'var(--shadow-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.9rem',
                        position: 'relative',
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                      }}
                    >
                      {/* Left color bar */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '4px',
                        height: '100%',
                        backgroundColor: rInfo.color,
                        borderTopLeftRadius: '12px',
                        borderBottomLeftRadius: '12px'
                      }} />

                      {/* Header: Avatar, Name, Role badge */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                          <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '10px',
                            backgroundColor: rInfo.badgeBg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <RoleIcon size={20} color={rInfo.color} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {u.name}
                            </h3>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '2px' }}>
                              <Mail size={12} />
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</span>
                            </div>
                          </div>
                        </div>

                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.25rem 0.6rem',
                          borderRadius: '999px',
                          backgroundColor: rInfo.badgeBg,
                          color: rInfo.color,
                          whiteSpace: 'nowrap'
                        }}>
                          {rInfo.label}
                        </span>
                      </div>

                      {/* Station / Base Assignment details */}
                      <div style={{
                        backgroundColor: '#F8FAFC',
                        borderRadius: '8px',
                        padding: '0.65rem 0.85rem',
                        fontSize: '0.8rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem'
                      }}>
                        {isStoreManager ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Store size={14} color="#DC2626" />
                            <span style={{ color: 'var(--text-secondary)' }}>Assigned Outlet:</span>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {u.outlet?.name || u.outletId || 'Unassigned'}
                            </span>
                            {u.outlet?.brand && (
                              <span style={{
                                fontSize: '0.68rem',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: u.outlet.brand === 'Fresh' ? '#DCFCE7' : u.outlet.brand === 'Style' ? '#FEF3C7' : '#E0E7FF',
                                color: u.outlet.brand === 'Fresh' ? '#15803D' : u.outlet.brand === 'Style' ? '#B45309' : '#3730A3',
                                fontWeight: 700
                              }}>
                                {u.outlet.brand}
                              </span>
                            )}
                          </div>
                        ) : isDriver ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Truck size={14} color="#2563EB" />
                            <span style={{ color: 'var(--text-secondary)' }}>Assigned Fleet Vehicle:</span>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {u.assignedVehicle?.vehicleId || (typeof u.assignedVehicle === 'string' ? u.assignedVehicle : 'No Vehicle Linked')}
                            </span>
                            {u.assignedVehicle?.temp && (
                              <span style={{
                                fontSize: '0.68rem',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: u.assignedVehicle.temp === 'reefer' ? '#CFFAFE' : '#F1F5F9',
                                color: u.assignedVehicle.temp === 'reefer' ? '#0369A1' : '#475569',
                                fontWeight: 700
                              }}>
                                {u.assignedVehicle.temp.toUpperCase()}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Building2 size={14} color="#64748B" />
                            <span style={{ color: 'var(--text-secondary)' }}>Logistics Base:</span>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {u.depot ? `${u.depot} Operations` : 'Central Headquarters'}
                            </span>
                          </div>
                        )}

                        {/* Secondary line if depot is relevant */}
                        {isDriver && (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748B', fontSize: '0.75rem' }}>
                              <MapPin size={12} />
                              <span>Home Depot: <strong>{u.depot || 'Peliyagoda'}</strong></span>
                            </div>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '0.74rem',
                              borderTop: '1px dashed #E2E8F0',
                              paddingTop: '0.35rem',
                              marginTop: '0.2rem'
                            }}>
                              <span style={{ color: '#475569' }}>
                                License: <strong>{u.licenseNumber || 'Not on file'}</strong> ({u.licenseCategory?.replace('_', ' ') || 'HEAVY'})
                              </span>
                              {u.licenseExpiryDate ? (
                                <span style={{
                                  fontSize: '0.68rem',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  backgroundColor: new Date(u.licenseExpiryDate) < new Date() ? '#FEE2E2' : '#DCFCE7',
                                  color: new Date(u.licenseExpiryDate) < new Date() ? '#DC2626' : '#15803D',
                                  fontWeight: 700
                                }}>
                                  {new Date(u.licenseExpiryDate) < new Date() ? 'EXPIRED' : `EXP: ${new Date(u.licenseExpiryDate).toLocaleDateString()}`}
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.68rem', color: '#94A3B8' }}>No Expiry</span>
                              )}
                            </div>
                          </>
                        )}
                        {isStoreManager && u.outlet?.district && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748B', fontSize: '0.75rem' }}>
                            <MapPin size={12} />
                            <span>District: <strong>{u.outlet.district}</strong> ({u.outlet.depot} Depot)</span>
                          </div>
                        )}
                      </div>

                      {/* Footer Actions: Status Toggle, Edit, Reset Password */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 'auto',
                        paddingTop: '0.75rem',
                        borderTop: '1px solid var(--border)'
                      }}>
                        <button
                          onClick={() => handleToggleStatus(u)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: u.isActive ? 'var(--success)' : '#DC2626'
                          }}
                        >
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: u.isActive ? 'var(--success)' : '#DC2626',
                            display: 'inline-block'
                          }} />
                          <span>{u.isActive ? 'Active Staff' : 'Suspended'}</span>
                        </button>

                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            onClick={() => openEditModal(u)}
                            title="Edit personnel assignment"
                            style={{
                              padding: '0.35rem 0.6rem',
                              border: '1px solid var(--border)',
                              borderRadius: '6px',
                              backgroundColor: '#FFFFFF',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              fontSize: '0.75rem'
                            }}
                          >
                            <Edit2 size={13} />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => setPasswordResetUser(u)}
                            title="Reset authentication password"
                            style={{
                              padding: '0.35rem 0.6rem',
                              border: '1px solid var(--border)',
                              borderRadius: '6px',
                              backgroundColor: '#FFFFFF',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              fontSize: '0.75rem'
                            }}
                          >
                            <KeyRound size={13} />
                            <span>Reset Key</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PROVISION VIEW */}
      {activeTab === 'provision' && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="wf-card" style={{ maxWidth: '620px', width: '100%', padding: '2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.35rem', color: 'var(--text-primary)' }}>
                Register Staff Member
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                Assign an operational role, workstation, and secure authentication credentials.
              </p>
            </div>

            {status && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
                backgroundColor: status.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                color: status.type === 'success' ? '#065F46' : '#991B1B',
                border: `1px solid ${status.type === 'success' ? '#A7F3D0' : '#FECACA'}`
              }}>
                {status.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                <span>{status.message}</span>
              </div>
            )}

            <form onSubmit={handleProvisionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

              {/* Role selection cards */}
              <div>
                <label style={labelStyle}>Operational Role *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.5rem' }}>
                  {ROLES.map(r => {
                    const isSelected = form.role === r.value;
                    const Icon = r.icon;
                    return (
                      <button
                        type="button"
                        key={r.value}
                        onClick={() => handleFormChange({ target: { name: 'role', value: r.value } })}
                        style={{
                          padding: '0.75rem 0.5rem',
                          borderRadius: '8px',
                          border: isSelected ? `2px solid ${r.color}` : '1.5px solid var(--border)',
                          backgroundColor: isSelected ? r.badgeBg : '#FFFFFF',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.35rem',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Icon size={20} color={isSelected ? r.color : '#64748B'} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isSelected ? r.color : 'var(--text-primary)' }}>
                          {r.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Basic Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Full Name *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      name="name"
                      type="text"
                      required
                      placeholder="e.g. Kasun Jayawardena"
                      style={fieldStyle}
                      value={form.name}
                      onChange={handleFormChange}
                    />
                    <User size={15} style={iconPos} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Corporate Work Email *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="name@waypoint.lk"
                      style={fieldStyle}
                      value={form.email}
                      onChange={handleFormChange}
                    />
                    <Mail size={15} style={iconPos} />
                  </div>
                </div>
              </div>

              {/* Role-contextual station fields */}
              {form.role && (
                <div style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Station & Logistics Assignment
                  </div>

                  {/* Depot selection for DISPATCHER, LOADER, DRIVER, ADMIN */}
                  {form.role !== 'STORE_MANAGER' && (
                    <div>
                      <label style={labelStyle}>Base Operating Depot *</label>
                      <div style={{ position: 'relative' }}>
                        <select
                          name="depot"
                          required
                          value={form.depot}
                          onChange={handleFormChange}
                          style={{ ...fieldStyle, appearance: 'none', cursor: 'pointer' }}
                        >
                          <option value="Peliyagoda">Peliyagoda Central Operations (Western Hub)</option>
                          <option value="Kandy">Kandy Regional Depot (Central Corridor)</option>
                        </select>
                        <Building2 size={15} style={iconPos} />
                        <ChevronDown size={14} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                      </div>
                    </div>
                  )}

                  {/* Store Manager: Select 1 of 120 Outlets */}
                  {form.role === 'STORE_MANAGER' && (
                    <div>
                      <label style={labelStyle}>Assigned Retail Outlet *</label>
                      <div style={{ position: 'relative' }}>
                        <select
                          name="outletId"
                          required
                          value={form.outletId}
                          onChange={handleFormChange}
                          style={{ ...fieldStyle, appearance: 'none', cursor: 'pointer' }}
                        >
                          <option value="">Choose retail outlet location...</option>
                          {outlets.map(o => (
                            <option key={o.outletId} value={o.outletId}>
                              {o.outletId} — {o.name || `Waypoint ${o.brand} - ${o.district}`} ({o.brand} | {o.district} | {o.depot} Depot)
                            </option>
                          ))}
                        </select>
                        <Store size={15} style={iconPos} />
                        <ChevronDown size={14} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                      </div>
                    </div>
                  )}

                  {/* Driver: Select Fleet Vehicle from Depot */}
                  {form.role === 'DRIVER' && (
                    <div>
                      <label style={labelStyle}>Primary Fleet Vehicle Link</label>
                      <div style={{ position: 'relative' }}>
                        <select
                          name="assignedVehicle"
                          value={form.assignedVehicle}
                          onChange={handleFormChange}
                          style={{ ...fieldStyle, appearance: 'none', cursor: 'pointer' }}
                        >
                          <option value="">Leave vehicle unassigned for now</option>
                          {availableVehicles.map(v => (
                            <option key={v._id} value={v._id}>
                              {v.vehicleId} — {v.type.toUpperCase()} ({v.temp.toUpperCase()} | {v.weightCapKg}kg | {v.volumeCapM3}m³)
                            </option>
                          ))}
                        </select>
                        <Truck size={15} style={iconPos} />
                        <ChevronDown size={14} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '4px', display: 'block' }}>
                        Vehicles filtered to {form.depot} Depot roster.
                      </span>
                    </div>
                  )}

                  {/* Driver: License & CDL Details */}
                  {form.role === 'DRIVER' && (
                    <div style={{
                      backgroundColor: '#F8FAFC',
                      padding: '1rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Commercial Driving License (CDL) & Compliance
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <label style={labelStyle}>License Number</label>
                          <input
                            name="licenseNumber"
                            type="text"
                            placeholder="e.g. B1234567"
                            style={{ ...fieldStyle, paddingLeft: '0.85rem' }}
                            value={form.licenseNumber}
                            onChange={handleFormChange}
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>License Category</label>
                          <select
                            name="licenseCategory"
                            value={form.licenseCategory}
                            onChange={handleFormChange}
                            style={{ ...fieldStyle, paddingLeft: '0.85rem', appearance: 'none' }}
                          >
                            <option value="LIGHT_VEHICLE">Light Vehicle (Van)</option>
                            <option value="HEAVY_COMMERCIAL">Heavy Commercial (Truck)</option>
                            <option value="ARTICULATED">Articulated (Semi)</option>
                            <option value="MOTOR_COACH">Motor Coach</option>
                          </select>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <label style={labelStyle}>License Expiry Date</label>
                          <input
                            name="licenseExpiryDate"
                            type="date"
                            style={{ ...fieldStyle, paddingLeft: '0.85rem' }}
                            value={form.licenseExpiryDate}
                            onChange={handleFormChange}
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>Driver Mobile Phone</label>
                          <input
                            name="phone"
                            type="tel"
                            placeholder="e.g. +94 77 123 4567"
                            style={{ ...fieldStyle, paddingLeft: '0.85rem' }}
                            value={form.phone}
                            onChange={handleFormChange}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Password credentials */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Temporary Password *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      name="password"
                      type="password"
                      required
                      placeholder="Min. 8 characters"
                      style={fieldStyle}
                      value={form.password}
                      onChange={handleFormChange}
                    />
                    <Lock size={15} style={iconPos} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Confirm Password *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      name="confirmPassword"
                      type="password"
                      required
                      placeholder="Repeat password"
                      style={fieldStyle}
                      value={form.confirmPassword}
                      onChange={handleFormChange}
                    />
                    <Lock size={15} style={iconPos} />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  marginTop: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
                disabled={formLoading || !form.role}
              >
                <UserPlus size={18} />
                <span>{formLoading ? 'Provisioning Record...' : 'Complete Staff Registration'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
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
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                Edit Personnel Profile: {editingUser.name}
              </h3>
              <button onClick={() => setEditingUser(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  style={fieldStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={labelStyle}>Operational Role</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                    style={{ ...fieldStyle, appearance: 'none' }}
                  >
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Base Depot</label>
                  <select
                    value={editForm.depot}
                    onChange={(e) => setEditForm(prev => ({ ...prev, depot: e.target.value }))}
                    style={{ ...fieldStyle, appearance: 'none' }}
                  >
                    <option value="Peliyagoda">Peliyagoda</option>
                    <option value="Kandy">Kandy</option>
                  </select>
                </div>
              </div>

              {editForm.role === 'STORE_MANAGER' && (
                <div>
                  <label style={labelStyle}>Assigned Retail Outlet</label>
                  <select
                    value={editForm.outletId}
                    onChange={(e) => setEditForm(prev => ({ ...prev, outletId: e.target.value }))}
                    style={{ ...fieldStyle, appearance: 'none' }}
                  >
                    <option value="">Select outlet...</option>
                    {outlets.map(o => (
                      <option key={o.outletId} value={o.outletId}>
                        {o.outletId} — {o.name || `Waypoint ${o.brand} - ${o.district}`} ({o.brand} | {o.district})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {editForm.role === 'DRIVER' && (
                <>
                  <div>
                    <label style={labelStyle}>Assigned Fleet Vehicle</label>
                    <select
                      value={editForm.assignedVehicle}
                      onChange={(e) => setEditForm(prev => ({ ...prev, assignedVehicle: e.target.value }))}
                      style={{ ...fieldStyle, appearance: 'none' }}
                    >
                      <option value="">No Vehicle Assigned</option>
                      {availableVehicles.map(v => (
                        <option key={v._id} value={v._id}>
                          {v.vehicleId} — {v.type.toUpperCase()} ({v.temp})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{
                    backgroundColor: '#F8FAFC',
                    padding: '0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.65rem'
                  }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Commercial Driving License (CDL) Info
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                      <div>
                        <label style={labelStyle}>License Number</label>
                        <input
                          type="text"
                          value={editForm.licenseNumber}
                          onChange={(e) => setEditForm(prev => ({ ...prev, licenseNumber: e.target.value }))}
                          style={{ ...fieldStyle, paddingLeft: '0.75rem' }}
                          placeholder="e.g. B1234567"
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>License Category</label>
                        <select
                          value={editForm.licenseCategory}
                          onChange={(e) => setEditForm(prev => ({ ...prev, licenseCategory: e.target.value }))}
                          style={{ ...fieldStyle, paddingLeft: '0.75rem', appearance: 'none' }}
                        >
                          <option value="LIGHT_VEHICLE">Light Vehicle</option>
                          <option value="HEAVY_COMMERCIAL">Heavy Commercial</option>
                          <option value="ARTICULATED">Articulated</option>
                          <option value="MOTOR_COACH">Motor Coach</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                      <div>
                        <label style={labelStyle}>Expiry Date</label>
                        <input
                          type="date"
                          value={editForm.licenseExpiryDate}
                          onChange={(e) => setEditForm(prev => ({ ...prev, licenseExpiryDate: e.target.value }))}
                          style={{ ...fieldStyle, paddingLeft: '0.75rem' }}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Driver Phone</label>
                        <input
                          type="tel"
                          value={editForm.phone}
                          onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                          style={{ ...fieldStyle, paddingLeft: '0.75rem' }}
                          placeholder="+94 77 123 4567"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label style={labelStyle}>Account Status</label>
                <select
                  value={editForm.isActive ? 'true' : 'false'}
                  onChange={(e) => setEditForm(prev => ({ ...prev, isActive: e.target.value === 'true' }))}
                  style={{ ...fieldStyle, appearance: 'none' }}
                >
                  <option value="true">Active Staff Member</option>
                  <option value="false">Suspended / Inactive</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: '#F8FAFC', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1, padding: '0.75rem' }}
                  disabled={editLoading}
                >
                  {editLoading ? 'Saving Changes...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {passwordResetUser && (
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
          <div className="wf-card" style={{ maxWidth: '420px', width: '100%', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Reset Password</h3>
              <button onClick={() => setPasswordResetUser(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={20} />
              </button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Issue a new login key for <strong>{passwordResetUser.name}</strong> ({passwordResetUser.email}).
            </p>

            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Min. 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={fieldStyle}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setPasswordResetUser(null)}
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: '#F8FAFC', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1, padding: '0.75rem' }}
                  disabled={resetLoading}
                >
                  {resetLoading ? 'Resetting...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
