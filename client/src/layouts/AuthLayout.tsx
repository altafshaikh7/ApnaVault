import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock } from 'lucide-react';

export const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2.5 text-slate-900 font-bold text-2xl tracking-tight">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <span>ApnaVault</span>
        </Link>
        <p className="mt-2 text-xs text-slate-500 font-medium">
          Your Family. Every Important Document. One Safe Place.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-xs border border-slate-200/80 rounded-2xl sm:px-10">
          {children}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <Lock className="w-3.5 h-3.5" />
          <span>Bank-grade 256-bit AES encryption & Indian privacy compliance</span>
        </div>
      </div>
    </div>
  );
};
