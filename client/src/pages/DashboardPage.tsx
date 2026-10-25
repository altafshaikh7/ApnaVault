import React from 'react';
import { Link } from 'react-router-dom';
import {
  Files,
  Clock,
  BellRing,
  Users,
  Plus,
  UploadCloud,
  ArrowRight,
  ShieldCheck,
  FolderOpen,
} from 'lucide-react';
import { Button } from '../components/common/Button.js';
import { Card, CardTitle, CardDescription } from '../components/common/Card.js';
import { EmptyState } from '../components/common/EmptyState.js';

export const DashboardPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Encrypted Vault Active</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Family Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your household records, track expiry dates, and share securely.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link to="/upload">
            <Button variant="primary" size="sm" leftIcon={<UploadCloud className="w-4 h-4" />}>
              Upload Document
            </Button>
          </Link>
          <Link to="/family">
            <Button variant="outline" size="sm" leftIcon={<Users className="w-4 h-4" />}>
              Family Members
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Documents
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <Files className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">0</div>
          <p className="text-[11px] text-slate-400 mt-1">Across all categories</p>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Expiring Soon
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">0</div>
          <p className="text-[11px] text-slate-400 mt-1">Next 30 days</p>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Reminders
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
              <BellRing className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">0</div>
          <p className="text-[11px] text-slate-400 mt-1">Scheduled notifications</p>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Family Members
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">1</div>
          <p className="text-[11px] text-slate-400 mt-1">Vault Owner</p>
        </Card>
      </div>

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Documents */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Recent Documents</h2>
              <p className="text-[11px] text-slate-500">Recently uploaded household records</p>
            </div>
            <Link
              to="/documents"
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <EmptyState
            icon={<FolderOpen className="w-6 h-6 text-slate-400" />}
            title="No documents uploaded yet"
            description="Start building your secure family vault. Upload identity records, insurance policies, or property papers."
            action={
              <Link to="/upload">
                <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                  Upload First Document
                </Button>
              </Link>
            }
          />
        </div>

        {/* Right Column: Upcoming Expirations & Quick Categories */}
        <div className="space-y-6">
          <Card className="p-5">
            <CardTitle>Upcoming Expirations</CardTitle>
            <CardDescription>Documents requiring renewal or review</CardDescription>

            <div className="mt-4">
              <EmptyState
                icon={<Clock className="w-5 h-5 text-slate-400" />}
                title="No upcoming renewals"
                description="When you add insurance policies or passports with expiry dates, alerts will appear here."
              />
            </div>
          </Card>

          <Card className="p-5">
            <CardTitle>Household Checklist</CardTitle>
            <CardDescription>Essential records for every Indian family</CardDescription>

            <ul className="mt-3 divide-y divide-slate-100 text-xs">
              <li className="py-2.5 flex items-center justify-between">
                <span className="text-slate-700 font-medium">Identity (Aadhaar & PAN)</span>
                <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                  Pending
                </span>
              </li>
              <li className="py-2.5 flex items-center justify-between">
                <span className="text-slate-700 font-medium">Health & Term Insurance</span>
                <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                  Pending
                </span>
              </li>
              <li className="py-2.5 flex items-center justify-between">
                <span className="text-slate-700 font-medium">Property & Vehicle Papers</span>
                <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                  Pending
                </span>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
};
