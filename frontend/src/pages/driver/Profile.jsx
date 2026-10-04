import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { driverApi } from '../../api/driver.api';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  User, ShieldCheck, AlertCircle, Phone, Truck, Calendar,
  KeyRound, CheckCircle2, AlertTriangle, ArrowLeft, Save, ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const DriverProfile = () => {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [notice, setNotice] = useState(null);

  // Edit fields
  const [phone, setPhone] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseCategory, setLicenseCategory] = useState('HEAVY_COMMERCIAL');
  const [licenseExpiryDate, setLicenseExpiryDate] = useState('');

  // Password change state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await driverApi.getProfile();
      const d = res.data;
      setProfileData(d);
      if (d.profile) {
        setPhone(d.profile.phone || '');
        setEmergencyContact(d.profile.emergencyContact || '');
        setLicenseNumber(d.profile.licenseNumber || '');
        setLicenseCategory(d.profile.licenseCategory || 'HEAVY_COMMERCIAL');
        if (d.profile.licenseExpiryDate) {
          setLicenseExpiryDate(new Date(d.profile.licenseExpiryDate).toISOString().slice(0, 10));
        }
      }
    } catch (e) {
      console.error('Failed to load profile:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      await driverApi.updateProfile({
        phone,
        emergencyContact,
        licenseNumber,
        licenseCategory,
        licenseExpiryDate: licenseExpiryDate || null
      });
      await loadProfile();
      setNotice({ type: 'success', text: 'Driver profile & contact details updated.' });
      setTimeout(() => setNotice(null), 4000);
    } catch (e) {
      setNotice({ type: 'error', text: e.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('New password and confirm password do not match');
      return;
    }
    setPasswordSaving(true);
    try {
      await driverApi.changePassword({ currentPassword, newPassword });
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setNotice({ type: 'success', text: 'Password changed successfully.' });
      setTimeout(() => setNotice(null), 4000);
    } catch (e) {
      alert(e.message || 'Failed to change password');
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading driver credentials & profile..." />;

  const p = profileData?.profile || authUser;
  const compliance = profileData?.compliance || { licenseStatus: 'VALID' };
  const metrics = profileData?.metrics || {};

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={() => navigate('/driver/route')}
          className="btn-secondary"
          style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Route</span>
        </button>

        <button
          onClick={() => setShowPasswordModal(true)}
          style={{
            padding: '0.4rem 0.75rem',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            backgroundColor: '#FFFFFF',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}
        >
          <KeyRound size={15} />
          <span>Change Password</span>
        </button>
      </div>

      {notice && (
        <div style={{
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          fontSize: '0.85rem',
          fontWeight: 600,
          backgroundColor: notice.type === 'success' ? '#ECFDF5' : '#FEF2F2',
          color: notice.type === 'success' ? '#065F46' : '#991B1B',
          border: `1px solid ${notice.type === 'success' ? '#A7F3D0' : '#FECACA'}`
        }}>
          {notice.text}
        </div>
      )}

      {/* Driver Identity Card */}
      <Card style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: '#025E4C',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1.4rem'
          }}>
            {p?.name?.charAt(0) || 'D'}
          </div>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>{p?.name}</h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{p?.email}</div>
            <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700, marginTop: '2px' }}>
              Base Depot: {p?.depot || 'Peliyagoda Central Operations'}
            </div>
          </div>
        </div>

        {/* Operational Lifetime Metrics */}
        <div style={{
          backgroundColor: '#F8FAFC',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.5rem',
          textAlign: 'center',
          fontSize: '0.8rem'
        }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Assigned Runs</span>
            <div style={{ fontWeight: 800, fontSize: '1.15rem' }}>{metrics.totalTrips || 0}</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Stops Completed</span>
            <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--primary-green)' }}>
              {metrics.completedDeliveries || 0}
            </div>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>POD Success Rate</span>
            <div style={{ fontWeight: 800, fontSize: '1.15rem' }}>{metrics.deliverySuccessRate || 100}%</div>
          </div>
        </div>
      </Card>

      {/* License Compliance Status */}
      <Card title="Commercial Driver License (CDL) Status">
        <div style={{
          backgroundColor: compliance.licenseStatus === 'EXPIRED' ? '#FEF2F2' : compliance.licenseStatus === 'EXPIRING_SOON' ? '#FFFBEB' : '#ECFDF5',
          border: `1px solid ${compliance.licenseStatus === 'EXPIRED' ? '#FECACA' : compliance.licenseStatus === 'EXPIRING_SOON' ? '#FDE68A' : '#A7F3D0'}`,
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          {compliance.licenseStatus === 'EXPIRED' ? (
            <ShieldAlert size={28} color="#DC2626" />
          ) : compliance.licenseStatus === 'EXPIRING_SOON' ? (
            <AlertTriangle size={28} color="#D97706" />
          ) : (
            <ShieldCheck size={28} color="#059669" />
          )}
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: compliance.licenseStatus === 'EXPIRED' ? '#991B1B' : compliance.licenseStatus === 'EXPIRING_SOON' ? '#92400E' : '#065F46' }}>
              {compliance.licenseStatus === 'EXPIRED'
                ? 'License Expired — Immediate Renewal Required'
                : compliance.licenseStatus === 'EXPIRING_SOON'
                ? `License Expiring Soon (${compliance.daysToExpiry} days remaining)`
                : compliance.licenseStatus === 'MISSING'
                ? 'License Record Incomplete'
                : 'Commercial Driver License Valid & Certified'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Sri Lanka Department of Motor Traffic (DMT) Heavy Vehicle standard.
            </div>
          </div>
        </div>

        {/* Assigned Vehicle Summary */}
        {p?.assignedVehicle && (
          <div style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem',
            marginBottom: '1.25rem',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Truck size={22} color="var(--primary-green)" />
              <div>
                <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{p.assignedVehicle.vehicleId}</span>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {p.assignedVehicle.type?.toUpperCase()} • {p.assignedVehicle.temp?.toUpperCase()} • Cap: {p.assignedVehicle.weightCapKg}kg
                </div>
              </div>
            </div>
            <Badge status={p.assignedVehicle.status || 'AVAILABLE'} />
          </div>
        )}

        {/* Update Contact & License Info */}
        <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              Driver License Number *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. B-9834212"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1.5px solid var(--border)',
                fontSize: '0.875rem'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                License Class
              </label>
              <select
                value={licenseCategory}
                onChange={(e) => setLicenseCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1.5px solid var(--border)',
                  fontSize: '0.875rem'
                }}
              >
                <option value="HEAVY_COMMERCIAL">Heavy Commercial (Class C)</option>
                <option value="LIGHT_VEHICLE">Light Delivery Van (Class B)</option>
                <option value="ARTICULATED">Articulated Heavy Prime (Class CE)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                License Expiry Date
              </label>
              <input
                type="date"
                value={licenseExpiryDate}
                onChange={(e) => setLicenseExpiryDate(e.target.value)}
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
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                Driver Mobile Phone
              </label>
              <input
                type="tel"
                placeholder="+94 77 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
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
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                Emergency Contact
              </label>
              <input
                type="tel"
                placeholder="Family / Next of Kin"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
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

          <button
            type="submit"
            className="btn-primary driver-action-btn"
            style={{ marginTop: '0.5rem', backgroundColor: '#025E4C' }}
            disabled={saving}
          >
            <Save size={18} />
            <span>{saving ? 'Saving Details...' : 'Save Profile & License'}</span>
          </button>
        </form>
      </Card>

      {/* Change Password Modal */}
      {showPasswordModal && (
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
            maxWidth: '420px',
            padding: '1.5rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Change Password</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Enter your current password and create a new secure 8+ character password.
            </p>

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.2rem' }}>Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.2rem' }}>New Password (min 8 chars)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.2rem' }}>Confirm New Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1 }}
                  disabled={passwordSaving}
                >
                  {passwordSaving ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
