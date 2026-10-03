import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Activity, Filter, Search, Calendar,
  Clock, User, RefreshCw, FileText, ChevronRight
} from 'lucide-react';
import { adminApi } from '../../api/admin.api';

const ACTION_COLORS = {
  VEHICLE_STATUS_CHANGED: { label: 'Vehicle Maintenance State', color: '#D97706', bg: '#FFFBEB' },
  VEHICLE_ASSIGNED:       { label: 'Vehicle Assigned',         color: '#2563EB', bg: '#EFF6FF' },
  ASSIGNMENT_REJECTED:    { label: 'Assignment Rejected',      color: '#DC2626', bg: '#FEF2F2' },
  ORDER_DEFERRED:         { label: 'Order Deferred',           color: '#DC2626', bg: '#FEF2F2' },
  PLAN_PUBLISHED:         { label: 'Plan Published',           color: '#059669', bg: '#ECFDF5' },
  LOADING_SHORTFALL:      { label: 'Loading Shortfall',        color: '#D97706', bg: '#FFFBEB' },
  DELIVERY_FAILED:        { label: 'Delivery Exception',       color: '#DC2626', bg: '#FEF2F2' },
  ROUTE_REASSIGNED:       { label: 'Route Reassigned',         color: '#7C3AED', bg: '#F5F3FF' },
  RECEIPT_CONFIRMED:      { label: 'Receipt Confirmed',        color: '#059669', bg: '#ECFDF5' },
  USER_REGISTERED:        { label: 'Personnel Registered',     color: '#059669', bg: '#ECFDF5' },
  USER_UPDATED:           { label: 'Personnel Updated',        color: '#2563EB', bg: '#EFF6FF' },
  USER_STATUS_CHANGED:    { label: 'Personnel Status Changed', color: '#DC2626', bg: '#FEF2F2' },
  PASSWORD_RESET:         { label: 'Credentials Reset',        color: '#7C3AED', bg: '#F5F3FF' },
  OTHER:                  { label: 'Administrative Action',    color: '#64748B', bg: '#F1F5F9' },
};

export const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (actionFilter !== 'ALL') params.action = actionFilter;
      const res = await adminApi.getAuditLogs(params);
      setLogs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(l => {
    const term = search.toLowerCase();
    const matchesSearch =
      (l.action && l.action.toLowerCase().includes(term)) ||
      (l.entityType && l.entityType.toLowerCase().includes(term)) ||
      (l.entityId && l.entityId.toLowerCase().includes(term)) ||
      (l.reason && l.reason.toLowerCase().includes(term)) ||
      (l.user?.name && l.user.name.toLowerCase().includes(term));
    return matchesSearch;
  });

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#7C3AED15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={22} color="#7C3AED" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              System Governance & Audit Trail
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
              Immutable record of operational overrides, plan releases, and fleet status transitions.
            </p>
          </div>
        </div>

        <button
          onClick={fetchLogs}
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
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Log Feed Card */}
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
              placeholder="Search audit trail by actor, entity, or logged reason..."
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
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            style={{ padding: '0.6rem', borderRadius: '8px', border: '1.5px solid var(--border)', fontSize: '0.85rem', backgroundColor: '#fff' }}
          >
            <option value="ALL">All Recorded Actions</option>
            {Object.entries(ACTION_COLORS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        {/* Audit Timeline / Table */}
        <div style={{ padding: '1rem 1.5rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
              Loading audit event history...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
              No audit events found matching the specified parameters.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredLogs.map(log => {
                const actionConf = ACTION_COLORS[log.action] || ACTION_COLORS.OTHER;
                const timestamp = new Date(log.createdAt).toLocaleString('en-GB', {
                  timeZone: 'Asia/Colombo',
                  dateStyle: 'medium',
                  timeStyle: 'short'
                });

                return (
                  <div
                    key={log._id}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      padding: '1rem 1.25rem',
                      backgroundColor: '#FFFFFF',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '1rem',
                      flexWrap: 'wrap'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '280px' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '0.3rem 0.65rem',
                        borderRadius: '6px',
                        backgroundColor: actionConf.bg,
                        color: actionConf.color,
                        border: `1px solid ${actionConf.color}30`,
                        whiteSpace: 'nowrap'
                      }}>
                        {actionConf.label}
                      </span>

                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {log.entityType} Target: <code style={{ backgroundColor: '#F1F5F9', padding: '1px 5px', borderRadius: '4px' }}>{log.entityId}</code>
                        </div>
                        {log.reason && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            Note: {log.reason}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.8rem' }}>
                      {log.user && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#475569' }}>
                          <User size={13} color="#64748B" />
                          <span><strong>{log.user.name}</strong> ({log.user.role})</span>
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)' }}>
                        <Clock size={13} />
                        <span>{timestamp}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
