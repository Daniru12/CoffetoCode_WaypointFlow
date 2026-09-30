import React from 'react';

export const Button = ({
  children,
  variant = 'primary', // 'primary', 'secondary', 'danger'
  size = 'md',
  onClick,
  disabled = false,
  type = 'button',
  style = {},
  className = '',
  icon: Icon
}) => {
  const getVariantClass = () => {
    switch (variant) {
      case 'secondary': return 'btn-secondary';
      case 'danger': return 'btn-danger';
      default: return 'btn-primary';
    }
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${getVariantClass()} ${className}`}
      style={{
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style
      }}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
};
