import React, { useState, useEffect } from 'react';
import { simulationApi } from '../../api/simulation.api';
import { Clock, RotateCcw, FastForward, CheckCircle, ChevronDown, ChevronUp, Sun, Moon } from 'lucide-react';

export const SimulationTimeBar = () => {
  const [clockData, setClockData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openControls, setOpenControls] = useState(false);
  const [customTime, setCustomTime] = useState('');

  useEffect(() => {
    fetchClock();
    const interval = setInterval(fetchClock, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchClock = async () => {
    try {
      const res = await simulationApi.getSimulationTime();
      setClockData(res.data);
    } catch {
      // ignore
    }
  };

  const handleSetTime = async (timeStr) => {
    setLoading(true);
    try {
      const res = await simulationApi.setSimulationTime(timeStr);
      setClockData(res.data);
    } catch (err) {
      console.error('Failed to set simulation time', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      const res = await simulationApi.resetSimulationTime();
      setClockData(res.data);
    } catch (err) {
      console.error('Failed to reset simulation time', err);
    } finally {
      setLoading(false);
    }
  };

  if (!clockData) return null;

  const isCutoffPassed = clockData.isCutoffPassed;

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpenControls(!openControls)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.3rem 0.75rem',
          borderRadius: 'var(--radius-full)',
          backgroundColor: isCutoffPassed ? '#FEF2F2' : '#F0FDF4',
          border: `1px solid ${isCutoffPassed ? '#FECACA' : '#BBF7D0'}`,
          color: isCutoffPassed ? '#991B1B' : '#166534',
          fontSize: '0.75rem',
          fontWeight: 700,
          cursor: 'pointer'
        }}
        title="Colombo Operational Simulation Clock (Click to test 16:00 cutoff)"
      >
        <Clock size={13} color={isCutoffPassed ? '#DC2626' : '#16A34A'} />
        <span>{clockData.colomboTime}</span>
        <span style={{
          fontSize: '0.65rem',
          padding: '0.1rem 0.4rem',
          borderRadius: '999px',
          backgroundColor: isCutoffPassed ? '#FEE2E2' : '#DCFCE7',
          color: isCutoffPassed ? '#B91C1C' : '#15803D'
        }}>
          {isCutoffPassed ? 'Post-Cutoff' : 'Pre-Cutoff'}
        </span>
        {clockData.isSimulated && (
          <span style={{ fontSize: '0.65rem', color: '#D97706', fontWeight: 800 }}>[SIM]</span>
        )}
        {openControls ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {openControls && (
        <div style={{
          position: 'absolute',
          top: '115%',
          right: 0,
          backgroundColor: '#FFF',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          zIndex: 999,
          width: '280px',
          fontSize: '0.8rem'
        }}>
          <div style={{ fontWeight: 800, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Clock size={14} color="var(--primary)" />
            <span>Colombo Cutoff Simulator</span>
          </div>

          <p style={{ margin: '0 0 0.75rem 0', color: 'var(--text-secondary)', fontSize: '0.72rem', lineHeight: 1.3 }}>
            Orders placed after <strong>16:00 Colombo cutoff</strong> roll over to subsequent cycle. Fast-forward clock to test.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSetTime('14:00')}
              style={{
                padding: '0.4rem 0.5rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid #BBF7D0',
                backgroundColor: '#F0FDF4',
                color: '#166534',
                fontWeight: 700,
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem'
              }}
            >
              <Sun size={13} color="#166534" />
              <span>14:00 (Pre)</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleSetTime('16:30')}
              style={{
                padding: '0.4rem 0.5rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid #FECACA',
                backgroundColor: '#FEF2F2',
                color: '#991B1B',
                fontWeight: 700,
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem'
              }}
            >
              <Moon size={13} color="#991B1B" />
              <span>16:30 (Post)</span>
            </button>
          </div>

          {/* Custom Time */}
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <input
              type="time"
              className="form-input"
              style={{ padding: '0.3rem', fontSize: '0.75rem' }}
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
            />
            <button
              type="button"
              disabled={loading || !customTime}
              onClick={() => handleSetTime(customTime)}
              className="btn-secondary"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
            >
              Set
            </button>
          </div>

          {clockData.isSimulated && (
            <button
              type="button"
              disabled={loading}
              onClick={handleReset}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.4rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: '#F8FAFC',
                color: 'var(--text-secondary)',
                fontSize: '0.75rem',
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={12} /> Reset to Live System Clock
            </button>
          )}
        </div>
      )}
    </div>
  );
};
