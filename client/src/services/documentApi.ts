import { apiClient } from './apiClient.js';
import type { ApiResponse } from '../types/api.js';
import type {
  DocumentItem,
  DocumentStats,
  DocumentPreview,
  FolderItem,
} from '../types/document.js';

interface DocumentResponse {
  document: DocumentItem;
}

interface DocumentsResponse {
  documents: DocumentItem[];
}

interface DownloadResponse {
  url: string;
  expiresIn: number;
}

export interface DocumentUploadInput {
  file: File;
  title: string;
  category: string;
  description: string;
  tags: string[];
  issueDate: string;
  expiryDate: string;
  folderId?: string | null;
}

export interface ListDocumentsParams {
  search?: string;
  category?: string;
  folderId?: string | null;
  sortBy?: string;
  isArchived?: boolean;
}

export async function listDocuments(params?: ListDocumentsParams): Promise<DocumentItem[]> {
  const queryParams: Record<string, string | boolean | undefined> = {};
  if (params?.search) queryParams.search = params.search;
  if (params?.category && params.category !== 'all') queryParams.category = params.category;
  if (params?.folderId !== undefined) queryParams.folderId = params.folderId || 'root';
  if (params?.sortBy) queryParams.sortBy = params.sortBy;
  if (params?.isArchived !== undefined) queryParams.isArchived = params.isArchived;

  const response = await apiClient.get<ApiResponse<DocumentsResponse>>('/documents', {
    params: queryParams,
  });
  return response.data.documents;
}

export async function getDocumentStats(): Promise<DocumentStats> {
  const response = await apiClient.get<ApiResponse<DocumentStats>>('/documents/stats');
  return response.data;
}

export async function getDocumentPreview(id: string): Promise<DocumentPreview> {
  const response = await apiClient.get<ApiResponse<DocumentPreview>>(
    `/documents/${encodeURIComponent(id)}/preview`
  );
  return response.data;
}

export async function moveDocument(id: string, folderId: string | null): Promise<DocumentItem> {
  const response = await apiClient.patch<ApiResponse<DocumentResponse>>(
    `/documents/${encodeURIComponent(id)}/move`,
    { folderId }
  );
  return response.data.document;
}

export async function getDocument(id: string): Promise<DocumentItem> {
  const response = await apiClient.get<ApiResponse<DocumentResponse>>(
    `/documents/${encodeURIComponent(id)}`
  );
  return response.data.document;
}

export async function uploadDocument(input: DocumentUploadInput): Promise<DocumentItem> {
  const formData = new FormData();
  formData.set('file', input.file);
  formData.set('title', input.title);
  formData.set('category', input.category);
  formData.set('description', input.description);
  formData.set('tags', JSON.stringify(input.tags));
  if (input.issueDate) formData.set('issueDate', input.issueDate);
  if (input.expiryDate) formData.set('expiryDate', input.expiryDate);
  if (input.folderId) formData.set('folderId', input.folderId);

  const response = await apiClient.post<ApiResponse<DocumentResponse>>('/documents', formData);
  return response.data.document;
}

export async function getDocumentDownloadUrl(id: string): Promise<string> {
  const response = await apiClient.get<ApiResponse<DownloadResponse>>(
    `/documents/${encodeURIComponent(id)}/download`
  );
  return response.data.url;
}

export async function deleteDocument(id: string): Promise<void> {
  await apiClient.delete<ApiResponse<null>>(`/documents/${encodeURIComponent(id)}`);
}

// ─── Folder API ─────────────────────────────────────────────────────────────

interface FoldersResponse {
  folders: FolderItem[];
}

interface FolderResponse {
  folder: FolderItem;
}

export async function listFolders(parentId?: string | null): Promise<FolderItem[]> {
  const params: Record<string, string | undefined> = {};
  if (parentId !== undefined) params.parentId = parentId || 'root';

  const response = await apiClient.get<ApiResponse<FoldersResponse>>('/folders', { params });
  return response.data.folders;
}

export async function createFolder(name: string, parentId?: string | null): Promise<FolderItem> {
  const response = await apiClient.post<ApiResponse<FolderResponse>>('/folders', {
    name,
    parentId: parentId || null,
  });
  return response.data.folder;
}

export async function renameFolder(id: string, name: string): Promise<FolderItem> {
  const response = await apiClient.patch<ApiResponse<FolderResponse>>(
    `/folders/${encodeURIComponent(id)}`,
    { name }
  );
  return response.data.folder;
}

export async function deleteFolder(id: string): Promise<void> {
  await apiClient.delete<ApiResponse<null>>(`/folders/${encodeURIComponent(id)}`);
}
