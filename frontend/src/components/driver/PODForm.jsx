import React, { useState, useRef, useEffect } from 'react';
import { Card } from '../common/Card';
import { Camera, Check, RotateCcw, PenTool, ShieldCheck } from 'lucide-react';

export const PODForm = ({
  delivery,
  onSubmit,
  onCancel,
  loading = false
}) => {
  const [receiverName, setReceiverName] = useState('');
  const [receiverDesignation, setReceiverDesignation] = useState('');
  const [deliveredQty, setDeliveredQty] = useState(delivery?.order?.totalQuantity || delivery?.quantity || 1);
  const [conditionNotes, setConditionNotes] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#022F26';
    }
  }, []);

  const handleStartDraw = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleDraw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const handleStopDraw = () => {
    setIsDrawing(false);
  };

  const handleClearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const signatureData = canvas ? canvas.toDataURL('image/png') : null;

    const podPayload = {
      receiverName,
      receiverDesignation,
      deliveredQty: Number(deliveredQty),
      conditionNotes,
      signature: signatureData,
      photo: photoPreview || photo,
      completedAt: new Date().toISOString()
    };

    onSubmit && onSubmit(podPayload);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{
        padding: '0.85rem',
        backgroundColor: '#ECFDF5',
        border: '1px solid #A7F3D0',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        color: '#065F46'
      }}>
        <ShieldCheck size={20} />
        <div>
          <strong style={{ fontSize: '0.9rem' }}>Proof of Delivery (Digital POD)</strong>
          <div style={{ fontSize: '0.78rem' }}>Signed receipt for {delivery?.outlet?.name || 'Retail Outlet'}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div>
          <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Store Receiver Name *
          </label>
          <input
            type="text"
            required
            value={receiverName}
            onChange={(e) => setReceiverName(e.target.value)}
            placeholder="e.g. Kasun Fernando"
            className="form-control"
          />
        </div>

        <div>
          <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Receiver Role / Designation
          </label>
          <input
            type="text"
            value={receiverDesignation}
            onChange={(e) => setReceiverDesignation(e.target.value)}
            placeholder="e.g. Store Rep, Shift Supervisor"
            className="form-control"
          />
        </div>
      </div>

      <div>
        <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
          Delivered Units Count *
        </label>
        <input
          type="number"
          required
          min="1"
          value={deliveredQty}
          onChange={(e) => setDeliveredQty(e.target.value)}
          className="form-control"
        />
      </div>

      {/* Touch/Mouse Signature Pad */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
          <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', margin: 0 }}>
            Receiver Digital Signature *
          </label>
          <button
            type="button"
            onClick={handleClearSignature}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem'
            }}
          >
            <RotateCcw size={12} />
            <span>Clear</span>
          </button>
        </div>

        <div style={{
          border: '2px dashed var(--border)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: '#FFFFFF',
          touchAction: 'none'
        }}>
          <canvas
            ref={canvasRef}
            width={450}
            height={160}
            style={{ width: '100%', height: '160px', display: 'block', cursor: 'crosshair' }}
            onMouseDown={handleStartDraw}
            onMouseMove={handleDraw}
            onMouseUp={handleStopDraw}
            onMouseLeave={handleStopDraw}
            onTouchStart={handleStartDraw}
            onTouchMove={handleDraw}
            onTouchEnd={handleStopDraw}
          />
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          Sign using fingertip or stylus in the box above.
        </div>
      </div>

      {/* Photo Capture */}
      <div>
        <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
          Delivery Proof Photo (Cargo at dock / handover)
        </label>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoChange}
          className="form-control"
        />
        {photoPreview && (
          <div style={{ marginTop: '0.5rem' }}>
            <img
              src={photoPreview}
              alt="POD Preview"
              style={{ maxHeight: '120px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
            />
          </div>
        )}
      </div>

      <div>
        <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
          Condition Notes (Optional)
        </label>
        <textarea
          rows="2"
          value={conditionNotes}
          onChange={(e) => setConditionNotes(e.target.value)}
          placeholder="E.g., Chilled temp verified at 4°C, pallets sealed and undamaged..."
          className="form-control"
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading || !receiverName || !hasSignature}
          className="btn-primary"
          style={{ minWidth: '160px' }}
        >
          {loading ? 'Submitting...' : 'Confirm Delivery'}
        </button>
      </div>
    </form>
  );
};
