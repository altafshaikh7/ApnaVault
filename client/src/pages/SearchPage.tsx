import React, { useState } from 'react';
import { Search, SlidersHorizontal, FolderSearch } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce.js';
import { DOCUMENT_CATEGORIES, type DocumentCategory, type DocumentItem } from '../types/document.js';
import { DocumentCard } from '../components/documents/DocumentCard.js';
import { EmptyState } from '../components/common/EmptyState.js';

export const SearchPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'all'>('all');
  const [documents] = useState<DocumentItem[]>([]);

  const debouncedSearch = useDebounce(searchTerm, 300);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Search Documents
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Quickly find documents across your personal vault and family workspace
        </p>
      </div>

      {/* Main Search Input */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            autoFocus
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by document title, notes, tags, or file name..."
            className="w-full pl-11 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mr-1">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Filter Category:
          </span>
          <button
            onClick={() => setSelectedCategory('all')}
            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          {DOCUMENT_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          {debouncedSearch
            ? `Search query: "${debouncedSearch}"`
            : 'Enter a keyword above to search your vault'}
        </span>
        <span>{documents.length} results</span>
      </div>

      {/* Results List or Empty State */}
      {documents.length === 0 ? (
        <EmptyState
          icon={<FolderSearch className="w-8 h-8 text-slate-400" />}
          title={debouncedSearch ? 'No matching documents found' : 'Ready to search'}
          description={
            debouncedSearch
              ? `We couldn't find any documents matching "${debouncedSearch}". Check your spelling or try different keywords.`
              : 'Type words like "Aadhaar", "Insurance", "TDS", "Registry" or your custom tags to discover documents.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {documents.map((doc) => (
            <DocumentCard key={doc.id} document={doc} />
          ))}
        </div>
      )}
    </div>
  );
};
