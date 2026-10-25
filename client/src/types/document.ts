export type DocumentCategory =
  | 'identity'
  | 'financial'
  | 'property'
  | 'insurance'
  | 'medical'
  | 'education'
  | 'legal'
  | 'other';

export const DOCUMENT_CATEGORIES: { id: DocumentCategory; label: string; description: string }[] = [
  { id: 'identity', label: 'Identity & Civil', description: 'Aadhaar, PAN, Passport, Voter ID, Driving License' },
  { id: 'insurance', label: 'Insurance Policies', description: 'Health, Term, Life, Motor, Travel insurance' },
  { id: 'property', label: 'Property & Assets', description: 'Sale deeds, registry papers, tax receipts, utility bills' },
  { id: 'financial', label: 'Financial & Tax', description: 'ITR filings, mutual fund statements, bank passbooks' },
  { id: 'medical', label: 'Medical & Health', description: 'Prescriptions, lab reports, discharge summaries' },
  { id: 'education', label: 'Education & Career', description: 'Degrees, diplomas, mark sheets, employment letters' },
  { id: 'legal', label: 'Legal & Family', description: 'Wills, power of attorney, agreements, marriage certificate' },
  { id: 'other', label: 'Other Documents', description: 'Miscellaneous household receipts and records' },
];

export interface DocumentItem {
  id: string;
  title: string;
  category: DocumentCategory;
  description?: string;
  tags: string[];
  fileName: string;
  fileSize: number;
  mimeType: string;
  issueDate?: string;
  expiryDate?: string;
  renewalDate?: string;
  ownerId: string;
  workspaceId?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DocumentSortOption = 'recent' | 'name_asc' | 'name_desc' | 'expiry_asc';
