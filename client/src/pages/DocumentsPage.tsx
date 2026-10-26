import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { UploadCloud, LayoutGrid, List, FolderOpen } from 'lucide-react';
import type { DocumentItem, DocumentCategory, DocumentSortOption } from '../types/document.js';
import { Button } from '../components/common/Button.js';
import { DocumentFilters } from '../components/documents/DocumentFilters.js';
import { DocumentCard } from '../components/documents/DocumentCard.js';
import { DocumentListItem } from '../components/documents/DocumentListItem.js';
import { EmptyState } from '../components/common/EmptyState.js';
import { LoadingState } from '../components/common/LoadingState.js';
import { ErrorState } from '../components/common/ErrorState.js';
import { deleteDocument, listDocuments } from '../services/documentApi.js';
import { ApiException } from '../types/api.js';

export const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<DocumentSortOption>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void listDocuments().then(
      (result) => {
        if (active) {
          setDocuments(result);
          setIsLoading(false);
        }
      },
      (err: unknown) => {
        if (active) {
          setError(err instanceof ApiException ? err.message : 'Unable to load documents.');
          setIsLoading(false);
        }
      }
    );
    return () => {
      active = false;
    };
  }, []);

  const retryLoadDocuments = () => {
    setIsLoading(true);
    setError(null);
    void listDocuments().then(
      setDocuments,
      (err: unknown) => setError(err instanceof ApiException ? err.message : 'Unable to load documents.')
    ).finally(() => setIsLoading(false));
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Document Library
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            View, search, organize, and manage your personal documents
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-white border border-slate-200 rounded-lg p-0.5 flex items-center">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'grid' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Grid View"
              aria-label="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'list' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="List View"
              aria-label="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <Link to="/upload">
            <Button variant="primary" size="sm" leftIcon={<UploadCloud className="w-4 h-4" />}>
              Upload Document
            </Button>
          </Link>
        </div>
      </div>

      <DocumentFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {error ? (
        <ErrorState message={error} onRetry={retryLoadDocuments} />
      ) : isLoading ? (
        <LoadingState message="Loading your documents..." />
      ) : filteredDocuments.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="w-8 h-8 text-slate-400" />}
          title="No documents found"
          description={
            documents.length > 0
              ? 'No documents matched your current search filters.'
              : 'Your secure vault is empty. Upload your first document to keep it safe and organized.'
          }
          action={
            <Link to="/upload">
              <Button variant="primary" size="sm" leftIcon={<UploadCloud className="w-4 h-4" />}>
                Upload Document
              </Button>
            </Link>
          }
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDocuments.map((document) => (
            <DocumentCard key={document.id} document={document} onDelete={handleDelete} />
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
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
