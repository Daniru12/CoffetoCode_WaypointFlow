import React from 'react';

export const Select = ({
  label,
  value,
  onChange,
  options = [],
  required = false,
  error,
  disabled = false,
  style = {}
}) => {
  return (
    <div className="form-group" style={style}>
      {label && <label className="form-label">{label}{required && ' *'}</label>}
      <select
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className="form-select"
        style={error ? { borderColor: '#DC2626' } : {}}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span style={{ color: '#DC2626', fontSize: '0.75rem', marginTop: '0.2rem' }}>{error}</span>}
    </div>
  );
};
