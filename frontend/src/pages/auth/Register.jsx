import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Truck, Lock, Mail, ArrowRight, User, Building2,
  ChevronDown, ShieldCheck, Package, Navigation, Store
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const ROLES = [
  { value: 'ADMIN',         label: 'Admin',           icon: ShieldCheck, color: '#7C3AED', desc: 'Full system access' },
  { value: 'DISPATCHER',    label: 'Dispatcher',      icon: Truck,       color: '#025E4C', desc: 'Operations & planning' },
  { value: 'LOADER',        label: 'Warehouse Loader',icon: Package,     color: '#D97706', desc: 'Loading & checklist' },
  { value: 'DRIVER',        label: 'Fleet Driver',    icon: Navigation,  color: '#2563EB', desc: 'Route & deliveries' },
  { value: 'STORE_MANAGER', label: 'Store Manager',   icon: Store,       color: '#DC2626', desc: 'Orders & receipts' },
];

const inputStyle = {
  width: '100%',
  padding: '0.65rem 0.85rem 0.65rem 2.5rem',
  borderRadius: 'var(--radius-md)',
  border: '1.5px solid var(--border)',
  backgroundColor: '#F8FAFC',
  fontSize: '0.9rem',
  color: 'var(--text-primary)',
  outline: 'none',
  transition: 'border-color var(--transition-fast)',
  boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  marginBottom: '0.35rem',
};

const iconStyle = {
  position: 'absolute',
  left: '0.75rem',
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#94A3B8',
  pointerEvents: 'none',
};

export const Register = () => {
  const navigate = useNavigate();
  const { register, getRoleRedirect } = useAuth();

  const [step, setStep] = useState(1); // 1 = pick role, 2 = fill details
  const [selectedRole, setSelectedRole] = useState(null);
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    depot: '', outletId: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setError(null);
    setStep(2);
  };

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        role: selectedRole.value,
        depot: form.depot || undefined,
        outletId: form.outletId || undefined,
      };
      const user = await register(payload);
      navigate(getRoleRedirect(user.role));
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const roleObj = selectedRole;

  return (
    <div style={{ width: '100%', maxWidth: step === 1 ? '520px' : '460px', transition: 'max-width 0.3s ease' }}>
      <div className="wf-card" style={{ padding: '2.5rem 2rem', boxShadow: 'var(--shadow-glass)' }}>

        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '12px',
            backgroundColor: step === 2 && roleObj ? roleObj.color : 'var(--primary-green)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem', boxShadow: '0 4px 12px rgba(2, 94, 76, 0.25)',
            transition: 'background-color 0.3s ease',
          }}>
            {step === 2 && roleObj
              ? <roleObj.icon size={26} color="#fff" />
              : <Truck size={26} color="#B9E1C9" />}
          </div>
          <h2 style={{ fontSize: '1.55rem', fontWeight: 800, margin: '0 0 0.25rem' }}>
            {step === 1 ? 'Create Account' : `Register as ${roleObj?.label}`}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {step === 1
              ? 'Select your role to get started'
              : roleObj?.desc}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            backgroundColor: 'var(--error-bg)', color: 'var(--error-text)',
            padding: '0.7rem 1rem', borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem', marginBottom: '1.25rem',
            border: '1px solid var(--error-border)',
          }}>
            {error}
          </div>
        )}

        {/* ── STEP 1: Role Picker ── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {ROLES.map((role) => {
              const Icon = role.icon;
              return (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => handleRoleSelect(role)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '0.85rem 1rem',
                    border: '1.5px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: '#fff',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = role.color;
                    e.currentTarget.style.backgroundColor = '#F8FAFC';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.backgroundColor = '#fff';
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '10px',
                    backgroundColor: role.color + '18',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon size={20} color={role.color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {role.label}
                    </div>
                    <div style={{ fontSize: '0.77rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                      {role.desc}
                    </div>
                  </div>
                  <ArrowRight size={16} style={{ color: '#CBD5E1' }} />
                </button>
              );
            })}

            <div style={{ textAlign: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Already have an account?{' '}
                <Link to="/login" style={{ color: 'var(--primary-green)', fontWeight: 700, textDecoration: 'none' }}>
                  Sign In
                </Link>
              </span>
            </div>
          </div>
        )}

        {/* ── STEP 2: Registration Form ── */}
        {step === 2 && (
          <form onSubmit={handleSubmit}>

            {/* Full Name */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <input
                  name="name" type="text" required autoFocus
                  style={inputStyle} value={form.name}
                  onChange={handleChange} placeholder="Your full name"
                />
                <User size={15} style={iconStyle} />
              </div>
            </div>

            {/* Email */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <input
                  name="email" type="email" required
                  style={inputStyle} value={form.email}
                  onChange={handleChange} placeholder="name@waypoint.lk"
                />
                <Mail size={15} style={iconStyle} />
              </div>
            </div>

            {/* Role-specific extra fields */}
            {(selectedRole?.value === 'DISPATCHER' || selectedRole?.value === 'LOADER' || selectedRole?.value === 'DRIVER' || selectedRole?.value === 'ADMIN') && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Depot</label>
                <div style={{ position: 'relative' }}>
                  <input
                    name="depot" type="text"
                    style={inputStyle} value={form.depot}
                    onChange={handleChange} placeholder="e.g. Peliyagoda"
                  />
                  <Building2 size={15} style={iconStyle} />
                </div>
              </div>
            )}

            {selectedRole?.value === 'STORE_MANAGER' && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Outlet ID</label>
                <div style={{ position: 'relative' }}>
                  <input
                    name="outletId" type="text"
                    style={inputStyle} value={form.outletId}
                    onChange={handleChange} placeholder="e.g. OUT001"
                  />
                  <Store size={15} style={iconStyle} />
                </div>
              </div>
            )}

            {/* Password */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  name="password" type="password" required
                  style={inputStyle} value={form.password}
                  onChange={handleChange} placeholder="Min. 8 characters"
                />
                <Lock size={15} style={iconStyle} />
              </div>
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  name="confirmPassword" type="password" required
                  style={inputStyle} value={form.confirmPassword}
                  onChange={handleChange} placeholder="Repeat your password"
                />
                <Lock size={15} style={iconStyle} />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', padding: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              disabled={loading}
            >
              <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
              {!loading && <ArrowRight size={18} />}
            </button>

            {/* Back & Sign In links */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <button
                type="button"
                onClick={() => { setStep(1); setError(null); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}
              >
                ← Change Role
              </button>
              <Link to="/login" style={{ fontSize: '0.85rem', color: 'var(--primary-green)', fontWeight: 700, textDecoration: 'none' }}>
                Sign In instead
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
