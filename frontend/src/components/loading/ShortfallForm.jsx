import React, { useState } from 'react';
import { AlertTriangle, Upload, X } from 'lucide-react';

export const ShortfallForm = ({
  jobId,
  item,
  issueType = 'shortfall',
  onSubmit,
  onCancel,
  loading = false
}) => {
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [photo, setPhoto] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('itemId', item?._id || item?.id || '');
    formData.append('reason', reason);
    if (issueType === 'shortfall') {
      formData.append('missingQty', quantity);
    } else {
      formData.append('damagedQty', quantity);
    }
    if (photo) {
      formData.append('photo', photo);
    }
    onSubmit && onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{
        padding: '0.75rem',
        backgroundColor: issueType === 'shortfall' ? '#FEF3C7' : '#FEE2E2',
        borderRadius: 'var(--radius-md)',
        fontSize: '0.85rem',
        color: issueType === 'shortfall' ? '#92400E' : '#991B1B',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <AlertTriangle size={18} />
        <span>
          Reporting {issueType === 'shortfall' ? 'Shortfall (Missing Consignment)' : 'Damaged Cargo'} for{' '}
          <strong>{item?.name || item?.itemName || 'Consigned Item'}</strong>
        </span>
      </div>

      <div>
        <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
          Impacted Quantity (Units)
        </label>
        <input
          type="number"
          min="1"
          max={item?.quantity || item?.expectedQty || 999}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="form-control"
          required
        />
      </div>

      <div>
        <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
          Warehouse Notes / Reason
        </label>
        <textarea
          rows="3"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="E.g., Warehouse bin empty, packaging punctured during forklift handling..."
          className="form-control"
          required
        />
      </div>

      <div>
        <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
          Attach Photo Evidence (Optional)
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setPhoto(e.target.files[0])}
          className="form-control"
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn-primary"
          style={{ backgroundColor: issueType === 'shortfall' ? '#D97706' : '#DC2626' }}
          disabled={loading}
        >
          {loading ? 'Submitting...' : `Submit ${issueType === 'shortfall' ? 'Shortfall' : 'Damage'} Report`}
        </button>
      </div>
    </form>
  );
};
