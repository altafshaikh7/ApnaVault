import { apiClient } from './apiClient.js';
import type { ApiResponse } from '../types/api.js';
import type { DocumentItem } from '../types/document.js';

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
}

export async function listDocuments(): Promise<DocumentItem[]> {
  const response = await apiClient.get<ApiResponse<DocumentsResponse>>('/documents');
  return response.data.documents;
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
