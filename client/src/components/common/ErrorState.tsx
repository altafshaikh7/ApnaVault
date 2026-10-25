import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button.js';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center bg-rose-50/50 rounded-xl border border-rose-200/80 ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-rose-100/70 text-rose-600 flex items-center justify-center mb-3.5">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-semibold text-rose-900 mb-1">{title}</h4>
      <p className="text-xs text-rose-700/90 max-w-sm mb-5 leading-relaxed">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
          Try Again
        </Button>
      )}
    </div>
  );
};
