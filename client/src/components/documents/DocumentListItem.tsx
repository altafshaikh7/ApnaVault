import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Calendar, MoreVertical, ExternalLink, Eye, FolderInput } from 'lucide-react';
import type { DocumentItem } from '../../types/document.js';
import { CategoryBadge } from '../common/Badge.js';
import { Dropdown } from '../common/Dropdown.js';

export interface DocumentListItemProps {
  document: DocumentItem;
  onPreview?: (doc: DocumentItem) => void;
  onMove?: (doc: DocumentItem) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const DocumentListItem: React.FC<DocumentListItemProps> = ({
  document,
  onPreview,
  onMove,
  onArchive,
  onDelete,
}) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors">
      <td className="py-3 px-4">
        <Link to={`/documents/${document.id}`} className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
            <FileText className="w-4 h-4 text-slate-600" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-900 group-hover:text-slate-700">
              {document.title}
            </div>
            <div className="text-[11px] text-slate-400">{document.fileName}</div>
          </div>
        </Link>
      </td>
      <td className="py-3 px-4">
        <CategoryBadge category={document.category} />
      </td>
      <td className="py-3 px-4 text-xs text-slate-600 hidden md:table-cell">
        {formatFileSize(document.fileSize)}
      </td>
      <td className="py-3 px-4 text-xs text-slate-600 hidden sm:table-cell">
        {document.expiryDate ? (
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            {document.expiryDate}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
      <td className="py-3 px-4 text-right">
        <div className="flex items-center justify-end gap-1">
          {onPreview && (
            <button
              onClick={() => onPreview(document)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition-colors"
              title="Preview Document"
              aria-label="Preview document"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}

          <Dropdown
            trigger={
              <button
                className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100"
                aria-label="Options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            }
            items={[
              ...(onPreview
                ? [
                    {
                      id: 'preview',
                      label: 'Preview File',
                      icon: <Eye className="w-4 h-4" />,
                      onClick: () => onPreview(document),
                    },
                  ]
                : []),
              {
                id: 'details',
                label: 'View Details',
                icon: <ExternalLink className="w-4 h-4" />,
                onClick: () => {
                  window.location.href = `/documents/${document.id}`;
                },
              },
              ...(onMove
                ? [
                    {
                      id: 'move',
                      label: 'Move to Folder',
                      icon: <FolderInput className="w-4 h-4" />,
                      onClick: () => onMove(document),
                    },
                  ]
                : []),
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
      </td>
    </tr>
  );
};
