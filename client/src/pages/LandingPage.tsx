import React from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  FileCheck2,
  Users,
  BellRing,
  Lock,
  ArrowRight,
  FolderLock,
  Search,
  Sparkles,
} from 'lucide-react';
import { Button } from '../components/common/Button.js';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200/80 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 text-slate-900 font-bold text-lg tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white">
              <Shield className="w-4 h-4 text-emerald-400" />
            </div>
            <span>ApnaVault</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link to="/register">
              <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Tailored for Indian Households</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight sm:leading-tight">
          Your Family. Every Important Document.{' '}
          <span className="text-emerald-700">One Safe Place.</span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          From Aadhaar cards and property registry deeds to health insurance policies and mutual fund statements.
          Organize, share, and track all your household documents securely in ApnaVault.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <Link to="/register" className="w-full sm:w-auto">
            <Button variant="primary" size="lg" className="w-full sm:w-auto" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Create Family Vault
            </Button>
          </Link>
          <Link to="/dashboard" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Explore Dashboard
            </Button>
          </Link>
        </div>

        <div className="mt-8 flex items-center justify-center gap-6 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-emerald-600" /> Private S3 Object Storage
          </span>
          <span className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-emerald-600" /> Granular Family Permissions
          </span>
        </div>
      </section>

      {/* Key Features Grid */}
      <section className="py-16 bg-white border-y border-slate-200/80 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Designed for the needs of Indian families
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Never scramble during emergency hospital admissions, insurance claims, or tax filing season.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-emerald-100/80 text-emerald-800 flex items-center justify-center mb-4">
                <FolderLock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-1.5">Categorized Storage</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Pre-configured categories for Aadhaar, PAN, Passport, Driving License, Property registry deeds, and Insurance policies.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-sky-100/80 text-sky-800 flex items-center justify-center mb-4">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-1.5">Family Workspaces</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Create a shared household workspace with roles (Owner, Admin, Member, Viewer). Keep private documents personal while sharing household assets.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-amber-100/80 text-amber-800 flex items-center justify-center mb-4">
                <BellRing className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-1.5">Expiry & Renewal Alerts</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Automated reminders at 30, 7, and 1 day before your term insurance, motor policy, or passport renewal dates.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-indigo-100/80 text-indigo-800 flex items-center justify-center mb-4">
                <Search className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-1.5">Instant Discovery</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Find any document in seconds with categorized filtering, tag lookups, and fast metadata discovery.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-rose-100/80 text-rose-800 flex items-center justify-center mb-4">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-1.5">Emergency Readiness</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Instant access to health cards, blood group records, policy numbers, and emergency contact papers when time matters most.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center mb-4">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-1.5">Privacy First</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Your private files remain inaccessible to anyone else unless explicitly granted. Strict server-side authorization on every action.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-slate-900 text-slate-400 py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>ApnaVault</span>
            <span className="text-slate-500 font-normal">| Your Family. Every Important Document. One Safe Place.</span>
          </div>
          <div>© {new Date().getFullYear()} ApnaVault. Built with security & privacy for Indian families.</div>
        </div>
      </footer>
    </div>
  );
};
