import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { FileText, Calendar, Download, Trash2, ArrowLeft, Shield, FileCheck } from 'lucide-react';
import { Button } from '../components/common/Button.js';
import { Card, CardTitle, CardDescription } from '../components/common/Card.js';
import { CategoryBadge } from '../components/common/Badge.js';
import { LoadingState } from '../components/common/LoadingState.js';
import { ErrorState } from '../components/common/ErrorState.js';
import { deleteDocument, getDocument, getDocumentDownloadUrl } from '../services/documentApi.js';
import { ApiException } from '../types/api.js';
import type { DocumentItem } from '../types/document.js';

interface DetailState {
  id: string;
  document?: DocumentItem;
  error?: string;
}

export const DocumentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detailState, setDetailState] = useState<DetailState>({ id: '' });
  const [actionError, setActionError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    void getDocument(id).then(
      (document) => {
        if (active) setDetailState({ id, document });
      },
      (err: unknown) => {
        if (active) {
          setDetailState({
            id,
            error: err instanceof ApiException ? err.message : 'Unable to load this document.',
          });
        }
      }
    );
    return () => {
      active = false;
    };
  }, [id]);

  const handleDownload = async () => {
    if (!id) return;
    const downloadWindow = window.open('about:blank', '_blank');
    setIsDownloading(true);
    setActionError(null);
    try {
      const url = await getDocumentDownloadUrl(id);
      if (downloadWindow) {
        downloadWindow.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch (err: unknown) {
      downloadWindow?.close();
      setActionError(err instanceof ApiException ? err.message : 'Unable to download this document.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !window.confirm('Delete this document permanently?')) return;
    setIsDeleting(true);
    setActionError(null);
    try {
      await deleteDocument(id);
      navigate('/documents', { replace: true });
    } catch (err: unknown) {
      setActionError(err instanceof ApiException ? err.message : 'Unable to delete this document.');
      setIsDeleting(false);
    }
  };

  const document = detailState.id === id ? detailState.document : undefined;
  const loading = !detailState.error && !document;

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
          <p className="text-xs text-slate-500">Private document</p>
        </div>
      </div>

      {detailState.id === id && detailState.error ? (
        <ErrorState message={detailState.error} onRetry={() => {
          setDetailState({ id: '' });
          if (id) {
            void getDocument(id).then(
              (result) => setDetailState({ id, document: result }),
              (err: unknown) => setDetailState({
                id,
                error: err instanceof ApiException ? err.message : 'Unable to load this document.',
              })
            );
          }
        }} />
      ) : loading ? (
        <LoadingState message="Loading document..." />
      ) : document ? (
        <>
          {actionError && <ErrorState message={actionError} />}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-5">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <CategoryBadge category={document.category} />
                        <span className="text-[11px] text-slate-400">{document.mimeType}</span>
                      </div>
                      <h2 className="text-lg font-bold text-slate-900 break-words">{document.title}</h2>
                      <p className="text-xs text-slate-500 mt-0.5 break-all">{document.fileName}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    isLoading={isDownloading}
                    onClick={() => void handleDownload()}
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                  >
                    Download
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-[11px] text-slate-400 font-medium">File Size</span>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5">
                      {(document.fileSize / (1024 * 1024)).toFixed(2)} MiB
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-[11px] text-slate-400 font-medium">Issue Date</span>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5">
                      {document.issueDate?.slice(0, 10) || 'Not specified'}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-[11px] text-slate-400 font-medium">Expiry Date</span>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {document.expiryDate?.slice(0, 10) || 'Not specified'}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-[11px] text-slate-400 font-medium">Storage Security</span>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-emerald-600" />
                      Private storage
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-[11px] text-slate-400 font-medium">Ownership</span>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-slate-400" />
                      Personal Vault
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Description & Notes
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                    {document.description || 'No description provided for this document.'}
                  </p>
                </div>
                {document.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {document.tags.map((tag) => (
                      <span key={tag} className="text-[10px] text-slate-600 bg-slate-100 px-2 py-1 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <Card className="p-5 h-fit">
              <CardTitle>Document Actions</CardTitle>
              <CardDescription>Delete this personal document from your vault</CardDescription>
              <Button
                variant="danger"
                size="sm"
                className="w-full mt-4 justify-start text-xs"
                isLoading={isDeleting}
                onClick={() => void handleDelete()}
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                Delete Document
              </Button>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
};
