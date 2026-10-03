import React, { useState, useEffect } from 'react';
import {
  UserPlus, Mail, Lock, User, Building2, Store,
  CheckCircle, XCircle, ChevronDown, ShieldCheck,
  Truck, Package, Navigation, Users, Search, Activity
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usersApi } from '../../api/users.api';

const ROLES = [
  { value: 'DISPATCHER',    label: 'Dispatcher',       icon: Truck,       color: '#025E4C', extra: 'depot' },
  { value: 'LOADER',        label: 'Warehouse Loader', icon: Package,     color: '#D97706', extra: 'depot' },
  { value: 'DRIVER',        label: 'Fleet Driver',     icon: Navigation,  color: '#2563EB', extra: 'depot' },
  { value: 'STORE_MANAGER', label: 'Store Manager',    icon: Store,       color: '#DC2626', extra: 'outletId' },
  { value: 'ADMIN',         label: 'Admin',            icon: ShieldCheck, color: '#7C3AED', extra: 'depot' },
];

const fieldStyle = {
  width: '100%', padding: '0.6rem 0.85rem 0.6rem 2.4rem', borderRadius: '8px',
  border: '1.5px solid var(--border)', backgroundColor: '#F8FAFC', fontSize: '0.875rem',
  color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
};

const labelStyle = { display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' };
const iconPos = { position: 'absolute', left: '0.72rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' };
const EMPTY = { name: '', email: '', password: '', confirmPassword: '', role: '', depot: '', outletId: '' };

import { authApi } from '../../api/auth.api';

export const UserManagement = () => {
  const [activeTab, setActiveTab] = useState('directory'); // 'directory' or 'provision'

  // Form State
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  // Directory State
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await usersApi.getAll();
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
      setLoading(false);
    }
  };

  const selectedRole = ROLES.find(r => r.value === form.role);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setStatus(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);

    if (form.password !== form.confirmPassword) {
      setStatus({ type: 'error', message: 'Passwords do not match.' });
      return;
    }
    if (form.password.length < 8) {
      setStatus({ type: 'error', message: 'Password must be at least 8 characters.' });
      return;
    }

    setFormLoading(true);
    try {
      const payload = {
        name: form.name, email: form.email, password: form.password, role: form.role,
        depot: form.depot || undefined, outletId: form.outletId || undefined,
      };
      // Call authApi directly to avoid AuthContext overwriting the Admin's session token
      await authApi.register(payload);
      setStatus({ type: 'success', message: `User "${form.name}" created successfully as ${selectedRole?.label}.` });
      setForm(EMPTY);
      fetchUsers(); // Refresh directory
    } catch (err) {
      setStatus({ type: 'error', message: err?.response?.data?.message || err.message || 'Failed to create user.' });
    } finally {
      setFormLoading(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header & Tabs */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#7C3AED18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={20} color="#7C3AED" />
              </div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>System Directory</h1>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>Manage personnel, assign roles, and view user details across the organization.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: '#F1F5F9', padding: '0.35rem', borderRadius: '10px' }}>
            <button
              onClick={() => setActiveTab('directory')}
              style={{
                padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                backgroundColor: activeTab === 'directory' ? '#fff' : 'transparent',
                color: activeTab === 'directory' ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: activeTab === 'directory' ? 'var(--shadow-sm)' : 'none',
              }}
            >
              User Directory
            </button>
            <button
              onClick={() => setActiveTab('provision')}
              style={{
                padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                backgroundColor: activeTab === 'provision' ? '#fff' : 'transparent',
                color: activeTab === 'provision' ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: activeTab === 'provision' ? 'var(--shadow-sm)' : 'none',
              }}
            >
              Provision New User
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'directory' && (
        <div className="wf-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text" placeholder="Search users by name or email..."
                value={search} onChange={(e) => setSearch(e.target.value)}
                style={{ ...fieldStyle, paddingLeft: '2.5rem' }}
              />
              <Search size={16} style={iconPos} />
            </div>
            <select
              value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
              style={{ ...fieldStyle, width: '200px' }}
            >
              <option value="ALL">All Roles</option>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No users found matching your criteria.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                {filteredUsers.map(u => {
                  const rInfo = ROLES.find(r => r.value === u.role) || { icon: User, color: '#64748B', label: u.role };
                  const Icon = rInfo.icon;
                  return (
                    <div key={u._id} style={{
                      border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem',
                      display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: '#fff',
                      boxShadow: 'var(--shadow-sm)', position: 'relative', overflow: 'hidden'
                    }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: rInfo.color }} />
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: rInfo.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon size={24} color={rInfo.color} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 style={{ margin: '0 0 0.2rem', fontSize: '1rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</h3>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Mail size={12} /> <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px dashed var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {u.isActive ? <Activity size={14} color="var(--success)" /> : <XCircle size={14} color="var(--error-text)" />}
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: u.isActive ? 'var(--success)' : 'var(--error-text)' }}>
                            {u.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.3rem 0.6rem', borderRadius: '999px', backgroundColor: rInfo.color + '15', color: rInfo.color }}>
                          {rInfo.label}
                        </span>
                      </div>
                      {(u.depot || (u.outlet && u.outlet.name)) && (
                         <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                           {u.role === 'STORE_MANAGER' ? <Store size={12} /> : <Building2 size={12} />}
                           {u.role === 'STORE_MANAGER' ? (u.outlet ? u.outlet.name : 'Unknown Store') : u.depot}
                         </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'provision' && (
        <div className="wf-card" style={{ padding: '2rem', maxWidth: '500px', margin: '0 auto', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
             <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.25rem', fontWeight: 800 }}>Provision New User</h3>
             <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>Create credentials and assign a role securely.</p>
          </div>

          {status && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1.25rem', backgroundColor: status.type === 'success' ? 'var(--success-bg)' : 'var(--error-bg)', color: status.type === 'success' ? 'var(--success-text)' : 'var(--error-text)', border: `1px solid ${status.type === 'success' ? '#A7F3D0' : 'var(--error-border)'}` }}>
              {status.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />} <span>{status.message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Role Assignment *</label>
              <div style={{ position: 'relative' }}>
                <select name="role" required value={form.role} onChange={handleChange} style={{ ...fieldStyle, paddingLeft: '2.4rem', appearance: 'none', cursor: 'pointer', borderColor: selectedRole ? selectedRole.color : 'var(--border)' }}>
                  <option value="">Select a role...</option>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                {selectedRole ? <selectedRole.icon size={15} style={{ ...iconPos, color: selectedRole.color }} /> : <ShieldCheck size={15} style={iconPos} />}
                <ChevronDown size={14} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Full Name *</label>
              <div style={{ position: 'relative' }}>
                <input name="name" type="text" required placeholder="Full name" style={fieldStyle} value={form.name} onChange={handleChange} />
                <User size={14} style={iconPos} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Email Address *</label>
              <div style={{ position: 'relative' }}>
                <input name="email" type="email" required placeholder="user@waypoint.lk" style={fieldStyle} value={form.email} onChange={handleChange} />
                <Mail size={14} style={iconPos} />
              </div>
            </div>
            {form.role && selectedRole?.extra === 'depot' && (
              <div>
                <label style={labelStyle}>Base Depot</label>
                <div style={{ position: 'relative' }}>
                  <input name="depot" type="text" placeholder="e.g. Peliyagoda" style={fieldStyle} value={form.depot} onChange={handleChange} />
                  <Building2 size={14} style={iconPos} />
                </div>
              </div>
            )}
            {form.role === 'STORE_MANAGER' && (
              <div>
                <label style={labelStyle}>Outlet ID</label>
                <div style={{ position: 'relative' }}>
                  <input name="outletId" type="text" placeholder="e.g. OUT001" style={fieldStyle} value={form.outletId} onChange={handleChange} />
                  <Store size={14} style={iconPos} />
                </div>
              </div>
            )}
            <div>
              <label style={labelStyle}>Temporary Password *</label>
              <div style={{ position: 'relative' }}>
                <input name="password" type="password" required placeholder="Min. 8 characters" style={fieldStyle} value={form.password} onChange={handleChange} />
                <Lock size={14} style={iconPos} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Confirm Password *</label>
              <div style={{ position: 'relative' }}>
                <input name="confirmPassword" type="password" required placeholder="Repeat password" style={fieldStyle} value={form.confirmPassword} onChange={handleChange} />
                <Lock size={14} style={iconPos} />
              </div>
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} disabled={formLoading}>
              <UserPlus size={18} /> <span>{formLoading ? 'Provisioning...' : 'Provision User Account'}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
