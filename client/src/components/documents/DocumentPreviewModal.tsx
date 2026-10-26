import React, { useEffect, useState } from 'react';
import { Eye, Download, X, AlertCircle, FileText } from 'lucide-react';
import { Button } from '../common/Button.js';
import { getDocumentPreview, getDocumentDownloadUrl } from '../../services/documentApi.js';
import type { DocumentPreview } from '../../types/document.js';
import { ApiException } from '../../types/api.js';

export interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string | null;
  documentTitle: string;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  documentId,
  documentTitle,
}) => {
  const [preview, setPreview] = useState<DocumentPreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!isOpen || !documentId) {
      setPreview(null);
      setError(null);
      return;
    }

    let active = true;
    setIsLoading(true);
    setError(null);

    void getDocumentPreview(documentId)
      .then((data) => {
        if (active) {
          setPreview(data);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof ApiException
              ? err.message
              : 'Unable to load document preview. Please try downloading directly.'
          );
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isOpen, documentId]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (!documentId) return;
    setIsDownloading(true);
    try {
      const url = await getDocumentDownloadUrl(documentId);
      window.open(url, '_blank');
    } catch (err: unknown) {
      setError(
        err instanceof ApiException ? err.message : 'Unable to generate download link.'
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight truncate max-w-md">
                {documentTitle}
              </h3>
              {preview?.fileName && (
                <p className="text-[11px] text-slate-400">{preview.fileName}</p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto min-h-[300px] flex items-center justify-center bg-slate-50">
          {isLoading ? (
            <div className="flex flex-col items-center gap-2 text-xs text-slate-500">
              <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              <span>Generating secure document preview...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2.5 max-w-md">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          ) : !preview ? null : preview.mimeType === 'application/pdf' ? (
            <iframe
              src={preview.url}
              title={preview.fileName}
              className="w-full h-[65vh] rounded-lg border border-slate-200 bg-white"
            />
          ) : preview.mimeType.startsWith('image/') ? (
            <img
              src={preview.url}
              alt={preview.fileName}
              className="max-h-[65vh] max-w-full object-contain mx-auto rounded-lg shadow-xs border border-slate-200 bg-white"
            />
          ) : (
            <div className="text-center p-8 bg-white border border-slate-200 rounded-2xl max-w-md shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                In-browser preview is unavailable
              </h4>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                This document ({preview.mimeType}) cannot be rendered directly in the web browser. You can download the original file to view it on your device.
              </p>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Download className="w-4 h-4" />}
                isLoading={isDownloading}
                onClick={handleDownload}
              >
                Download File
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            {preview ? `Expires in ${preview.expiresIn}s • Encrypted Private Transfer` : ''}
          </span>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Download className="w-4 h-4" />}
              isLoading={isDownloading}
              onClick={handleDownload}
            >
              Download
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
