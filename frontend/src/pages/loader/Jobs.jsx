import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadingApi } from '../../api/loading.api';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { ClipboardList, Truck, ArrowRight, Play, CheckCircle } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';

export const LoaderJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { socket } = useSocket();

  useEffect(() => {
    loadJobs();

    if (socket) {
      socket.on('plan.published', () => loadJobs());
      socket.on('loading.completed', () => loadJobs());
    }
  }, [socket]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const res = await loadingApi.getJobsToday();
      setJobs(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (jobId) => {
    try {
      await loadingApi.startJob(jobId);
      navigate(`/loader/jobs/${jobId}`);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <LoadingSpinner text="Fetching warehouse loading bay jobs..." />;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Warehouse Loading Bay</h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Vehicle packing queues, reverse stop-order (LIFO) verification, and departure signoff
        </span>
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          title="No loading jobs queued"
          message="Once the Central Dispatcher publishes delivery plans, loading manifests will be dispatched here."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {jobs.map((job) => (
            <div
              key={job._id}
              className="wf-card touch-target-large"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: '#E8F5EE',
                  color: 'var(--primary-green)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Truck size={24} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>{job.vehicle?.vehicleId}</h3>
                    <Badge status={job.status} />
                  </div>
                  <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                    Ref: <strong>{job.loadingJobRef}</strong> • Trip: {job.trip?.tripRef} (Shift #{job.trip?.tripNumber || 1})
                  </span>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {job.items?.length || 0} consignment items • {job.vehicle?.type} ({job.vehicle?.temp})
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {job.status === 'PENDING' ? (
                  <button
                    className="btn-primary"
                    onClick={() => handleStart(job._id)}
                  >
                    <Play size={16} />
                    <span>Start Loading</span>
                  </button>
                ) : (
                  <button
                    className="btn-primary"
                    onClick={() => navigate(`/loader/jobs/${job._id}`)}
                  >
                    <ClipboardList size={16} />
                    <span>Open Checklist</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
