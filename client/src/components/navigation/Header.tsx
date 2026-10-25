import React from 'react';
import { Menu, Bell, Search, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../common/Button.js';

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const navigate = useNavigate();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global search quick button */}
        <div
          onClick={() => navigate('/search')}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:border-slate-300 transition-colors w-64"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search documents, tags...</span>
          <kbd className="ml-auto text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-400">
            /
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3">
        <Link to="/upload">
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
            <span className="hidden sm:inline">Upload</span>
          </Button>
        </Link>

        <Link
          to="/notifications"
          className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 relative transition-colors"
          aria-label="View notifications"
        >
          <Bell className="w-4 h-4" />
        </Link>

        {/* User avatar indicator */}
        <Link
          to="/settings"
          className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-semibold hover:opacity-90 transition-opacity"
          title="Account Settings"
        >
          AV
        </Link>
      </div>
    </header>
  );
};
