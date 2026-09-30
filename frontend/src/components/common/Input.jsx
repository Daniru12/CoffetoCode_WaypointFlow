import React from 'react';

export const Input = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  error,
  disabled = false,
  style = {}
}) => {
  return (
    <div className="form-group" style={style}>
      {label && <label className="form-label">{label}{required && ' *'}</label>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="form-input"
        style={error ? { borderColor: '#DC2626' } : {}}
      />
      {error && <span style={{ color: '#DC2626', fontSize: '0.75rem', marginTop: '0.2rem' }}>{error}</span>}
    </div>
  );
};
