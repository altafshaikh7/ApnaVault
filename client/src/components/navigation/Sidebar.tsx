import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Files,
  UploadCloud,
  Search,
  Users,
  BellRing,
  Bell,
  Settings,
  Shield,
  LogOut,
} from 'lucide-react';

interface SidebarProps {
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/documents', label: 'Documents', icon: Files },
    { to: '/upload', label: 'Upload', icon: UploadCloud },
    { to: '/search', label: 'Search', icon: Search },
    { to: '/family', label: 'Family Workspace', icon: Users },
    { to: '/reminders', label: 'Reminders', icon: BellRing },
    { to: '/notifications', label: 'Notifications', icon: Bell },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800">
      {/* Brand */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800/80">
        <Link to="/dashboard" className="flex items-center gap-2.5 text-white font-bold tracking-tight text-lg">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <span>ApnaVault</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider uppercase text-slate-400">
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 text-xs font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer / Account section */}
      <div className="p-4 border-t border-slate-800/80">
        <div className="bg-slate-800/60 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-slate-400">Personal Vault</span>
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" title="Active"></span>
          </div>
          <div className="text-xs font-semibold text-slate-200 truncate">Household Account</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Encrypted & Private</p>
        </div>

        <Link
          to="/login"
          className="mt-3 flex items-center justify-center gap-2 w-full py-2 px-3 text-xs text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800/50 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </Link>
      </div>
    </aside>
  );
};
