import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost';
  size?: 'default' | 'sm' | 'icon';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'default',
  size = 'default',
  ...props
}) => {
  const baseClasses =
    'font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2';
  const variantClasses = {
    default: 'bg-blue-500 text-white hover:bg-blue-600',
    ghost: 'text-gray-700 hover:bg-gray-100'
  };
  const sizeClasses = {
    default: 'px-4 py-2',
    sm: 'px-2 py-1 text-sm',
    icon: 'p-2'
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}>
      {children}
    </button>
  );
};
