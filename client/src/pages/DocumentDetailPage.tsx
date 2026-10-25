import React from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FileText,
  Calendar,
  Download,
  Share2,
  Archive,
  Trash2,
  ArrowLeft,
  Shield,
  FileCheck,
} from 'lucide-react';
import { Button } from '../components/common/Button.js';
import { Card, CardTitle, CardDescription } from '../components/common/Card.js';
import { CategoryBadge } from '../components/common/Badge.js';
import { EmptyState } from '../components/common/EmptyState.js';

export const DocumentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  // In Phase 2, without backend documents yet, show clean state
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/documents"
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
          aria-label="Back to documents"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Document Details
          </h1>
          <p className="text-xs text-slate-500">ID: {id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document Preview & Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CategoryBadge category="identity" />
                    <span className="text-[11px] text-slate-400">PDF Document</span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">Document #{id}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">document-{id}.pdf</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />}>
                  Download
                </Button>
                <Button variant="outline" size="sm" leftIcon={<Share2 className="w-3.5 h-3.5" />}>
                  Share
                </Button>
              </div>
            </div>

            {/* Document Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-[11px] text-slate-400 font-medium">Issue Date</span>
                <p className="text-xs font-semibold text-slate-800 mt-0.5">Not specified</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-[11px] text-slate-400 font-medium">Expiry Date</span>
                <p className="text-xs font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Not specified
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-[11px] text-slate-400 font-medium">Storage Security</span>
                <p className="text-xs font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  Encrypted S3 Object Storage
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-[11px] text-slate-400 font-medium">Ownership</span>
                <p className="text-xs font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-slate-400" />
                  Personal Vault (Private)
                </p>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Description & Notes
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                No description provided for this document record.
              </p>
            </div>
          </Card>

          {/* Secure Document Preview Placeholder */}
          <Card className="p-6">
            <CardTitle>Document Preview</CardTitle>
            <CardDescription>Rendered via authorized backend signed URL</CardDescription>

            <div className="mt-4">
              <EmptyState
                icon={<FileText className="w-8 h-8 text-slate-400" />}
                title="Secure Preview Mode"
                description="In Phase 5, authorized PDF and image previews will be securely streamed directly into this viewer."
              />
            </div>
          </Card>
        </div>

        {/* Sidebar Actions & Activity */}
        <div className="space-y-6">
          <Card className="p-5">
            <CardTitle>Document Actions</CardTitle>
            <CardDescription>Manage lifecycle and permissions</CardDescription>

            <div className="mt-4 space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs"
                leftIcon={<Share2 className="w-4 h-4 text-slate-500" />}
              >
                Share with Family Member
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs"
                leftIcon={<Archive className="w-4 h-4 text-slate-500" />}
              >
                Archive Document
              </Button>
              <Button
                variant="danger"
                size="sm"
                className="w-full justify-start text-xs"
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                Delete Document
              </Button>
            </div>
          </Card>

          <Card className="p-5">
            <CardTitle>Access & Sharing</CardTitle>
            <CardDescription>Who has permission to view this document</CardDescription>

            <div className="mt-3 text-xs text-slate-600 space-y-2">
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <span className="font-medium text-slate-800">You (Owner)</span>
                <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold">
                  Full Access
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                This document is strictly private to your account and has not been shared with the family workspace.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
