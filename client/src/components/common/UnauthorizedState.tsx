import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './Button.js';

export interface UnauthorizedStateProps {
  title?: string;
  message?: string;
}

export const UnauthorizedState: React.FC<UnauthorizedStateProps> = ({
  title = 'Access Restricted',
  message = 'You do not have permission to view this resource, or your session has expired.',
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-xl border border-slate-200">
      <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
        <ShieldAlert className="w-7 h-7" />
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-1.5">{title}</h3>
      <p className="text-xs text-slate-500 max-w-sm mb-6 leading-relaxed">{message}</p>
      <div className="flex items-center gap-3">
        <Link to="/login">
          <Button variant="primary" size="sm">
            Sign In
          </Button>
        </Link>
        <Link to="/">
          <Button variant="outline" size="sm">
            Go to Home
          </Button>
        </Link>
      </div>
    </div>
  );
};
