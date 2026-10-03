import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Lock, Mail, ArrowRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const Login = () => {
  const [email, setEmail] = useState('dispatcher@waypoint.lk');
  const [password, setPassword] = useState('Waypoint2026!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { login, getRoleRedirect } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await login(email, password);
      navigate(getRoleRedirect(user.role));
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const setRoleDemo = (roleEmail) => {
    setEmail(roleEmail);
    setPassword('Waypoint2026!');
  };

  return (
    <div style={{ width: '100%', maxWidth: '440px' }}>
      <div className="wf-card" style={{ padding: '2.5rem 2rem', boxShadow: 'var(--shadow-glass)' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '12px',
            backgroundColor: 'var(--primary-green)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
            boxShadow: '0 4px 12px rgba(2, 94, 76, 0.3)'
          }}>
            <Truck size={28} color="#B9E1C9" />
          </div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, margin: '0 0 0.25rem' }}>WaypointFlow</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Intelligent Delivery Operations Orchestration
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#FEE2E2',
            color: '#991B1B',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            marginBottom: '1.25rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                required
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@waypoint.lk"
              />
              <Mail size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                required
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <Lock size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', marginTop: '1rem', padding: '0.8rem' }}
            disabled={loading}
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Workspace'}</span>
            <ArrowRight size={18} />
          </button>
        </form>

        {/* Quick Demo Switcher */}
        <div style={{
          marginTop: '2rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid var(--border)',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Quick Demo Accounts
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button type="button" onClick={() => setRoleDemo('admin@waypoint.lk')} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.4rem 0.5rem' }}>
              Admin
            </button>
            <button type="button" onClick={() => setRoleDemo('dispatcher@waypoint.lk')} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.4rem 0.5rem' }}>
              Dispatcher
            </button>
            <button type="button" onClick={() => setRoleDemo('store.manager@waypoint.lk')} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.4rem 0.5rem' }}>
              Store Manager
            </button>
            <button type="button" onClick={() => setRoleDemo('loader@waypoint.lk')} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.4rem 0.5rem' }}>
              Loader
            </button>
            <button type="button" onClick={() => setRoleDemo('driver@waypoint.lk')} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.4rem 0.5rem', gridColumn: '1 / -1' }}>
              Fleet Driver
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
