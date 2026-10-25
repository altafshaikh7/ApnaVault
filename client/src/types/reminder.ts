export interface Reminder {
  id: string;
  documentId: string;
  documentTitle: string;
  dueDate: string;
  daysBefore: number;
  status: 'active' | 'dismissed' | 'completed';
  notes?: string;
  createdAt: string;
}
