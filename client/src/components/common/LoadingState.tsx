import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
      <Loader2 className="w-8 h-8 text-slate-800 animate-spin mb-3" />
      <p className="text-xs font-medium text-slate-500">{message}</p>
    </div>
  );
};
