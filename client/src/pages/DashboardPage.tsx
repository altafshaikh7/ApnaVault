import React, { useEffect, useState } from 'react';
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
  FileText,
  HardDrive,
} from 'lucide-react';
import { Button } from '../components/common/Button.js';
import { Card, CardTitle, CardDescription } from '../components/common/Card.js';
import { EmptyState } from '../components/common/EmptyState.js';
import { CategoryBadge } from '../components/common/Badge.js';
import { LoadingState } from '../components/common/LoadingState.js';
import { ErrorState } from '../components/common/ErrorState.js';
import { getDocumentStats } from '../services/documentApi.js';
import type { DocumentStats } from '../types/document.js';
import { ApiException } from '../types/api.js';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = () => {
    setIsLoading(true);
    setError(null);
    getDocumentStats()
      .then((data) => {
        setStats(data);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiException ? err.message : 'Unable to load dashboard statistics.');
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadStats();
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDaysRemaining = (expiryDate?: string): { text: string; isUrgent: boolean } => {
    if (!expiryDate) return { text: 'No date', isUrgent: false };
    const expiry = new Date(expiryDate).getTime();
    const now = Date.now();
    const diff = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { text: `Expired ${Math.abs(diff)}d ago`, isUrgent: true };
    if (diff === 0) return { text: 'Expires today', isUrgent: true };
    return { text: `${diff} days left`, isUrgent: diff <= 30 };
  };

  const storageUsedMB = stats ? (stats.storageUsedBytes / (1024 * 1024)).toFixed(1) : '0';
  const storageQuotaMB = stats ? (stats.storageQuotaBytes / (1024 * 1024)).toFixed(0) : '1024';
  const storagePercent = stats && stats.storageQuotaBytes > 0
    ? Math.min(100, Math.round((stats.storageUsedBytes / stats.storageQuotaBytes) * 100))
    : 0;

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

      {error ? (
        <ErrorState message={error} onRetry={loadStats} />
      ) : (
        <>
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
              <div className="text-2xl font-bold text-slate-900">
                {isLoading ? '...' : (stats?.totalDocuments ?? 0)}
              </div>
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
              <div className="text-2xl font-bold text-slate-900">
                {isLoading ? '...' : (stats?.expiringSoon ?? 0)}
              </div>
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
              <div className="text-2xl font-bold text-slate-900">
                {isLoading ? '...' : (stats?.activeReminders ?? 0)}
              </div>
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
              <div className="text-2xl font-bold text-slate-900">
                {isLoading ? '...' : (stats?.familyMembersCount ?? 1)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Workspace members</p>
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

              {isLoading ? (
                <LoadingState message="Loading recent documents..." />
              ) : stats?.recentDocuments && stats.recentDocuments.length > 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs divide-y divide-slate-100">
                  {stats.recentDocuments.map((doc) => (
                    <Link
                      key={doc.id}
                      to={`/documents/${doc.id}`}
                      className="p-4 flex items-center justify-between hover:bg-slate-50/70 transition-colors block group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 group-hover:bg-slate-200 transition-colors">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs font-semibold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
                            {doc.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                            <span>{formatFileSize(doc.fileSize)}</span>
                            <span>•</span>
                            <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        <CategoryBadge category={doc.category} />
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
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
              )}
            </div>

            {/* Right Column: Upcoming Expirations & Storage Quota */}
            <div className="space-y-6">
              <Card className="p-5">
                <CardTitle>Upcoming Expirations</CardTitle>
                <CardDescription>Documents requiring renewal or review</CardDescription>

                <div className="mt-4">
                  {isLoading ? (
                    <LoadingState message="Checking renewal dates..." />
                  ) : stats?.upcomingExpirations && stats.upcomingExpirations.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {stats.upcomingExpirations.map((doc) => {
                        const remaining = getDaysRemaining(doc.expiryDate);
                        return (
                          <Link
                            key={doc.id}
                            to={`/documents/${doc.id}`}
                            className="py-3 flex items-center justify-between hover:bg-slate-50/70 rounded-lg px-2 -mx-2 transition-colors block"
                          >
                            <div className="min-w-0 pr-2">
                              <h4 className="text-xs font-medium text-slate-900 truncate">
                                {doc.title}
                              </h4>
                              <p className="text-[11px] text-slate-400">
                                {doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : 'N/A'}
                              </p>
                            </div>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                                remaining.isUrgent
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {remaining.text}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState
                      icon={<Clock className="w-5 h-5 text-slate-400" />}
                      title="No upcoming renewals"
                      description="When you add insurance policies or passports with expiry dates, alerts will appear here."
                    />
                  )}
                </div>
              </Card>

              {/* Storage Quota Card */}
              <Card className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                      <HardDrive className="w-4 h-4" />
                    </div>
                    <CardTitle>Storage Vault</CardTitle>
                  </div>
                  <span className="text-xs font-semibold text-slate-700">
                    {storagePercent}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 mb-2 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${storagePercent}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  {storageUsedMB} MB used of {storageQuotaMB} MB encrypted storage
                </p>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
