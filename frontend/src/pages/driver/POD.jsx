import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { driverApi } from '../../api/driver.api';
import { syncQueue } from '../../offline/syncQueue';
import { Card } from '../../components/common/Card';
import { ArrowLeft, CheckCircle2, Camera, PenTool, RotateCcw } from 'lucide-react';
import { useOffline } from '../../hooks/useOffline';

export const DriverPOD = () => {
  const { deliveryId } = useParams();
  const navigate = useNavigate();
  const { isOffline } = useOffline();

  const [receiverName, setReceiverName] = useState('Store Manager');
  const [receivedQuantity, setReceivedQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [photos, setPhotos] = useState([]);

  // Canvas for Digital Signature
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#022F26';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
  }, []);

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const scaleX = canvas.width / (rect.width || 1);
    const scaleY = canvas.height / (rect.height || 1);
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const canvas = canvasRef.current;
    const signatureDataUrl = hasSignature ? canvas.toDataURL('image/png') : null;

    try {
      if (navigator.onLine) {
        // Online Submission
        const formData = new FormData();
        formData.append('receiverName', receiverName);
        formData.append('receivedQuantity', receivedQuantity);
        if (signatureDataUrl) formData.append('signatureUrl', signatureDataUrl);

        for (const p of photos) {
          formData.append('photos', p);
        }

        await driverApi.submitPod(deliveryId, formData);
      } else {
        // Offline Submission -> Enqueue into IndexedDB
        await syncQueue.enqueue('POD_SUBMITTED', deliveryId, {
          receiverName,
          receivedQuantity,
          signatureUrl: signatureDataUrl,
          offlineTimestamp: new Date().toISOString()
        });
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <button
        onClick={() => navigate(-1)}
        className="btn-secondary"
        style={{ marginBottom: '1.25rem', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
      >
        <ArrowLeft size={16} />
        <span>Back to Stops</span>
      </button>

      <Card title="Proof of Delivery (Digital Signoff)">
        {success ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <CheckCircle2 size={54} color="var(--primary-green)" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem' }}>Delivery Completed & Signed</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              {isOffline
                ? 'Stored locally in offline sync queue. Will automatically sync when network is restored.'
                : 'Proof of delivery submitted to central logistics registry.'}
            </p>
            <button className="btn-primary driver-action-btn" onClick={() => navigate('/driver/route')}>
              Return to Route
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ backgroundColor: '#FEE2E2', color: '#991B1B', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Store Receiver Name</label>
              <input
                type="text"
                required
                className="form-input"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Delivered Units</label>
              <input
                type="number"
                min="1"
                required
                className="form-input"
                value={receivedQuantity}
                onChange={(e) => setReceivedQuantity(Number(e.target.value))}
              />
            </div>

            {/* Signature Canvas */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label className="form-label" style={{ margin: 0 }}>Receiver Signature</label>
                <button
                  type="button"
                  onClick={clearCanvas}
                  style={{ fontSize: '0.75rem', color: '#DC2626', fontWeight: 600 }}
                >
                  Clear Signature
                </button>
              </div>

              <div style={{
                border: '2px dashed var(--border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#FAFAFA',
                overflow: 'hidden'
              }}>
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={180}
                  style={{ width: '100%', height: '180px', touchAction: 'none', cursor: 'crosshair' }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Ask store receiver to sign above using finger or stylus.
              </span>
            </div>

            {/* Photos */}
            <div className="form-group">
              <label className="form-label">Delivery Photo Evidence</label>
              <input
                type="file"
                multiple
                accept="image/*"
                className="form-input"
                onChange={(e) => setPhotos(Array.from(e.target.files))}
              />
            </div>

            <button
              type="submit"
              className="btn-primary driver-action-btn"
              disabled={submitting}
              style={{ marginTop: '1.25rem' }}
            >
              <CheckCircle2 size={20} />
              <span>{submitting ? 'Recording POD...' : 'Confirm Delivery Signoff'}</span>
            </button>
          </form>
        )}
      </Card>
    </div>
  );
};
