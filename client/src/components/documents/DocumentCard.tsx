import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Calendar, Tag, MoreVertical, ExternalLink } from 'lucide-react';
import type { DocumentItem } from '../../types/document.js';
import { CategoryBadge } from '../common/Badge.js';
import { Dropdown } from '../common/Dropdown.js';

export interface DocumentCardProps {
  document: DocumentItem;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  onArchive,
  onDelete,
}) => {
  const [currentTime, setCurrentTime] = useState<number | null>(null);

  useEffect(() => {
    if (!document.expiryDate) return;

    let intervalId: number | undefined;
    const timeoutId = window.setTimeout(() => {
      setCurrentTime(Date.now());
      intervalId = window.setInterval(() => setCurrentTime(Date.now()), 60_000);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [document.expiryDate]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const expiryTime = document.expiryDate ? Date.parse(document.expiryDate) : null;
  const diffDays =
    expiryTime !== null && currentTime !== null
      ? Math.ceil((expiryTime - currentTime) / (1000 * 60 * 60 * 24))
      : null;
  const isExpired = expiryTime !== null && currentTime !== null && expiryTime < currentTime;
  const isExpiringSoon = diffDays !== null && diffDays > 0 && diffDays <= 30;

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between group">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <CategoryBadge category={document.category} />

          <Dropdown
            trigger={
              <button
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors"
                aria-label="Document options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            }
            items={[
              {
                id: 'details',
                label: 'View Details',
                icon: <ExternalLink className="w-4 h-4" />,
                onClick: () => {
                  window.location.href = `/documents/${document.id}`;
                },
              },
              ...(onArchive
                ? [
                    {
                      id: 'archive',
                      label: document.isArchived ? 'Restore' : 'Archive',
                      onClick: () => onArchive(document.id),
                    },
                  ]
                : []),
              ...(onDelete
                ? [
                    'divider' as const,
                    {
                      id: 'delete',
                      label: 'Delete',
                      danger: true,
                      onClick: () => onDelete(document.id),
                    },
                  ]
                : []),
            ]}
          />
        </div>

        <Link to={`/documents/${document.id}`} className="block group-hover:text-slate-900">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shrink-0 group-hover:bg-slate-100 transition-colors">
              <FileText className="w-5 h-5 text-slate-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold text-slate-900 truncate tracking-tight">
                {document.title}
              </h4>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">{document.fileName}</p>
            </div>
          </div>
        </Link>

        {document.description && (
          <p className="text-xs text-slate-500 line-clamp-2 mt-3 leading-relaxed">
            {document.description}
          </p>
        )}

        {document.tags && document.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {document.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded"
              >
                <Tag className="w-2.5 h-2.5 text-slate-400" />
                {tag}
              </span>
            ))}
            {document.tags.length > 3 && (
              <span className="text-[10px] text-slate-400 px-1 py-0.5">
                +{document.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span>{formatFileSize(document.fileSize)}</span>

        {document.expiryDate ? (
          <span
            className={`inline-flex items-center gap-1 font-medium ${
              isExpired
                ? 'text-rose-600'
                : isExpiringSoon
                ? 'text-amber-600'
                : 'text-slate-500'
            }`}
          >
            <Calendar className="w-3 h-3" />
            {isExpired ? 'Expired' : `Expires ${document.expiryDate}`}
          </span>
        ) : (
          <span>No Expiry</span>
        )}
      </div>
    </div>
  );
};
