import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  UploadCloud,
  LayoutGrid,
  List,
  FolderOpen,
} from 'lucide-react';
import type { DocumentItem, DocumentCategory, DocumentSortOption } from '../types/document.js';
import { Button } from '../components/common/Button.js';
import { DocumentFilters } from '../components/documents/DocumentFilters.js';
import { DocumentCard } from '../components/documents/DocumentCard.js';
import { DocumentListItem } from '../components/documents/DocumentListItem.js';
import { EmptyState } from '../components/common/EmptyState.js';

export const DocumentsPage: React.FC = () => {
  const [documents] = useState<DocumentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<DocumentSortOption>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Document Library
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            View, search, organize, and manage your family documents
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
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

          <Link to="/upload">
            <Button variant="primary" size="sm" leftIcon={<UploadCloud className="w-4 h-4" />}>
              Upload Document
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <DocumentFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {/* Documents Display or Empty State */}
      {documents.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="w-8 h-8 text-slate-400" />}
          title="No documents in your vault yet"
          description={
            searchQuery || selectedCategory !== 'all'
              ? 'No documents matched your current search filters.'
              : 'Your secure family vault is empty. Upload your first document to keep it safe, organized, and tracked.'
          }
          action={
            <Link to="/upload">
              <Button variant="primary" size="sm" leftIcon={<UploadCloud className="w-4 h-4" />}>
                Upload Document Now
              </Button>
            </Link>
          }
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {documents.map((doc) => (
            <DocumentCard key={doc.id} document={doc} />
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
                {documents.map((doc) => (
                  <DocumentListItem key={doc.id} document={doc} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
