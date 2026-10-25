import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import { Button } from '../components/common/Button.js';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 mb-4">
        <FileQuestion className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Page Not Found</h1>
      <p className="text-xs text-slate-500 max-w-sm mt-1.5 mb-6">
        The page you are looking for does not exist or has been moved to another section.
      </p>
      <Link to="/dashboard">
        <Button variant="primary" size="md">
          Back to Dashboard
        </Button>
      </Link>
    </div>
  );
};
