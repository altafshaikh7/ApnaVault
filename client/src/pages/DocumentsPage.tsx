import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  UploadCloud,
  LayoutGrid,
  List,
  FolderOpen,
  FolderPlus,
  Folder as FolderIcon,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import type {
  DocumentItem,
  DocumentCategory,
  DocumentSortOption,
  FolderItem,
} from '../types/document.js';
import { Button } from '../components/common/Button.js';
import { Modal } from '../components/common/Modal.js';
import { Input } from '../components/common/Input.js';
import { DocumentFilters } from '../components/documents/DocumentFilters.js';
import { DocumentCard } from '../components/documents/DocumentCard.js';
import { DocumentListItem } from '../components/documents/DocumentListItem.js';
import { DocumentPreviewModal } from '../components/documents/DocumentPreviewModal.js';
import { EmptyState } from '../components/common/EmptyState.js';
import { LoadingState } from '../components/common/LoadingState.js';
import { ErrorState } from '../components/common/ErrorState.js';
import {
  deleteDocument,
  listDocuments,
  listFolders,
  createFolder,
  deleteFolder,
  moveDocument,
} from '../services/documentApi.js';
import { ApiException } from '../types/api.js';

interface BreadcrumbItem {
  id: string | null;
  name: string;
}

export const DocumentsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const folderParam = searchParams.get('folderId') || null;

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(folderParam);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: null, name: 'All Documents' },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<DocumentSortOption>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Folder creation modal state
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [folderActionError, setFolderActionError] = useState<string | null>(null);

  // Move document modal state
  const [movingDoc, setMovingDoc] = useState<DocumentItem | null>(null);
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [allWorkspaceFolders, setAllWorkspaceFolders] = useState<FolderItem[]>([]);

  // Preview modal state
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);

  // Fetch documents and folders whenever currentFolderId changes
  const loadData = async (folderId: string | null) => {
    setIsLoading(true);
    setError(null);
    try {
      const [docs, fldrs] = await Promise.all([
        listDocuments({ folderId: folderId || 'root' }),
        listFolders(folderId || 'root'),
      ]);
      setDocuments(docs);
      setFolders(fldrs);
    } catch (err: unknown) {
      setError(err instanceof ApiException ? err.message : 'Unable to load library contents.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(currentFolderId);
  }, [currentFolderId]);

  // Handle opening a folder
  const handleOpenFolder = (folder: FolderItem) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setSearchParams({ folderId: folder.id });
  };

  // Handle clicking a breadcrumb item
  const handleBreadcrumbClick = (item: BreadcrumbItem, index: number) => {
    setCurrentFolderId(item.id);
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
    if (item.id) {
      setSearchParams({ folderId: item.id });
    } else {
      setSearchParams({});
    }
  };

  // Handle creating a new folder
  const handleCreateFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) return;

    setIsCreatingFolder(true);
    setFolderActionError(null);
    try {
      const created = await createFolder(trimmed, currentFolderId);
      setFolders((prev) => [...prev, created]);
      setNewFolderName('');
      setIsFolderModalOpen(false);
    } catch (err: unknown) {
      setFolderActionError(err instanceof ApiException ? err.message : 'Failed to create folder.');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  // Handle deleting a folder
  const handleDeleteFolder = async (folder: FolderItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      !window.confirm(
        `Delete folder "${folder.name}"? Documents inside will be moved to the parent directory.`
      )
    )
      return;

    try {
      await deleteFolder(folder.id);
      setFolders((prev) => prev.filter((f) => f.id !== folder.id));
      // Reload documents as any displaced documents might appear here
      const docs = await listDocuments({ folderId: currentFolderId || 'root' });
      setDocuments(docs);
    } catch (err: unknown) {
      setError(err instanceof ApiException ? err.message : 'Failed to delete folder.');
    }
  };

  // Open move modal
  const handleOpenMoveModal = async (doc: DocumentItem) => {
    setMovingDoc(doc);
    setTargetFolderId(doc.folderId || null);
    try {
      const allFolders = await listFolders();
      setAllWorkspaceFolders(allFolders);
    } catch {
      setAllWorkspaceFolders(folders);
    }
  };

  // Submit move
  const handleConfirmMove = async () => {
    if (!movingDoc) return;
    setIsMoving(true);
    try {
      await moveDocument(movingDoc.id, targetFolderId);
      setMovingDoc(null);
      await loadData(currentFolderId);
    } catch (err: unknown) {
      alert(err instanceof ApiException ? err.message : 'Failed to move document.');
    } finally {
      setIsMoving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this document permanently?')) return;
    try {
      await deleteDocument(id);
      setDocuments((current) => current.filter((document) => document.id !== id));
    } catch (err: unknown) {
      setError(err instanceof ApiException ? err.message : 'Unable to delete document.');
    }
  };

  const filteredDocuments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const matching = documents.filter((document) => {
      const matchesCategory = selectedCategory === 'all' || document.category === selectedCategory;
      const matchesQuery = !query || [
        document.title,
        document.fileName,
        document.description ?? '',
        ...document.tags,
      ].some((value) => value.toLowerCase().includes(query));
      return matchesCategory && matchesQuery;
    });

    return matching.sort((first, second) => {
      if (sortBy === 'name_asc') return first.title.localeCompare(second.title);
      if (sortBy === 'name_desc') return second.title.localeCompare(first.title);
      if (sortBy === 'expiry_asc') {
        return (first.expiryDate ?? '9999').localeCompare(second.expiryDate ?? '9999');
      }
      return second.createdAt.localeCompare(first.createdAt);
    });
  }, [documents, searchQuery, selectedCategory, sortBy]);

  const currentFolder = breadcrumbs[breadcrumbs.length - 1];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Document Library
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Organize personal & household files with structured folders and instant search
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFolderActionError(null);
              setNewFolderName('');
              setIsFolderModalOpen(true);
            }}
            leftIcon={<FolderPlus className="w-4 h-4 text-emerald-600" />}
          >
            Create Folder
          </Button>

          <div className="bg-white border border-slate-200 rounded-lg p-0.5 flex items-center">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Grid View"
              aria-label="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="List View"
              aria-label="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <Link to={currentFolderId ? `/upload?folderId=${currentFolderId}` : '/upload'}>
            <Button variant="primary" size="sm" leftIcon={<UploadCloud className="w-4 h-4" />}>
              Upload Document
            </Button>
          </Link>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <nav aria-label="Folder Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200/80 px-3.5 py-2 rounded-xl overflow-x-auto">
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;
          return (
            <React.Fragment key={item.id || 'root'}>
              {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
              <button
                type="button"
                onClick={() => handleBreadcrumbClick(item, index)}
                className={`font-medium transition-colors whitespace-nowrap ${
                  isLast
                    ? 'text-slate-900 font-bold pointer-events-none'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {item.name}
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      {/* Folders Section */}
      {folders.length > 0 && (
        <div className="space-y-2.5">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Folders</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {folders.map((folder) => (
              <div
                key={folder.id}
                onClick={() => handleOpenFolder(folder)}
                className="group relative bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-xs rounded-xl p-3.5 cursor-pointer transition-all flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <FolderIcon className="w-4 h-4" />
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteFolder(folder, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 rounded transition-opacity"
                    title="Delete folder"
                    aria-label={`Delete folder ${folder.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-slate-900 truncate group-hover:text-emerald-700">
                    {folder.name}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {folder.documentCount} document{folder.documentCount === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document Filters */}
      <DocumentFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {error ? (
        <ErrorState message={error} onRetry={() => loadData(currentFolderId)} />
      ) : isLoading ? (
        <LoadingState message="Loading your documents..." />
      ) : filteredDocuments.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="w-8 h-8 text-slate-400" />}
          title={
            searchQuery
              ? 'No matching documents'
              : folders.length > 0
              ? 'No documents in this folder'
              : 'Your vault is empty'
          }
          description={
            searchQuery
              ? 'No documents matched your current filter criteria.'
              : currentFolderId
              ? 'Upload documents into this folder to keep your records neatly organized.'
              : 'Start by uploading identity records, insurance policies, or property papers.'
          }
          action={
            <Link to={currentFolderId ? `/upload?folderId=${currentFolderId}` : '/upload'}>
              <Button variant="primary" size="sm" leftIcon={<UploadCloud className="w-4 h-4" />}>
                Upload Document
              </Button>
            </Link>
          }
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDocuments.map((document) => (
            <DocumentCard
              key={document.id}
              document={document}
              onPreview={(doc) => setPreviewDoc(doc)}
              onMove={(doc) => handleOpenMoveModal(doc)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Document</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 hidden md:table-cell">File Size</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Expiry</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((document) => (
                  <DocumentListItem
                    key={document.id}
                    document={document}
                    onPreview={(doc) => setPreviewDoc(doc)}
                    onMove={(doc) => handleOpenMoveModal(doc)}
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Move Document Modal */}
      <Modal
        isOpen={Boolean(movingDoc)}
        onClose={() => setMovingDoc(null)}
        title="Move Document to Folder"
        description={`Select a destination folder for "${movingDoc?.title}"`}
        footer={
          <div className="flex items-center justify-end gap-2.5">
            <Button variant="outline" size="sm" onClick={() => setMovingDoc(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmMove}
              isLoading={isMoving}
            >
              Move Here
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Destination Folder
            </label>
            <select
              value={targetFolderId || ''}
              onChange={(e) => setTargetFolderId(e.target.value || null)}
              className="block w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">📁 Root / No Folder</option>
              {allWorkspaceFolders.map((f) => (
                <option key={f.id} value={f.id}>
                  📁 {f.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* Create Folder Modal */}
      <Modal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        title="Create New Folder"
        description={
          currentFolderId
            ? `Create a subfolder inside "${currentFolder.name}"`
            : 'Create a root folder to categorize your vault records'
        }
        footer={
          <div className="flex items-center justify-end gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFolderModalOpen(false)}
              disabled={isCreatingFolder}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateFolderSubmit}
              isLoading={isCreatingFolder}
              disabled={!newFolderName.trim()}
            >
              Create Folder
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateFolderSubmit} className="space-y-4">
          {folderActionError && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
              {folderActionError}
            </div>
          )}
          <Input
            label="Folder Name"
            placeholder="e.g. Health Insurance, House Tax, Property Deeds"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            autoFocus
            required
          />
        </form>
      </Modal>

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        documentId={previewDoc?.id || null}
        documentTitle={previewDoc?.title || ''}
      />
    </div>
  );
};
