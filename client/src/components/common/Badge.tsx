import React from 'react';
import type { DocumentCategory } from '../../types/document.js';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}) => {
  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  const variantStyles = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    neutral: 'bg-slate-100 text-slate-800 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

export const CategoryBadge: React.FC<{ category: DocumentCategory; size?: 'sm' | 'md' }> = ({
  category,
  size = 'sm',
}) => {
  const categoryConfig: Record<DocumentCategory, { label: string; variant: BadgeProps['variant'] }> = {
    identity: { label: 'Identity', variant: 'info' },
    insurance: { label: 'Insurance', variant: 'success' },
    property: { label: 'Property', variant: 'warning' },
    financial: { label: 'Financial', variant: 'neutral' },
    medical: { label: 'Medical', variant: 'danger' },
    education: { label: 'Education', variant: 'info' },
    legal: { label: 'Legal', variant: 'neutral' },
    other: { label: 'Other', variant: 'default' },
  };

  const config = categoryConfig[category] || { label: category, variant: 'default' };

  return (
    <Badge variant={config.variant} size={size}>
      {config.label}
    </Badge>
  );
};
