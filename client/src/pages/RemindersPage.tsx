import React, { useState, useEffect } from 'react';
import {
  BellRing,
  Plus,
  Calendar,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../components/common/Button.js';
import { Card, CardTitle, CardDescription } from '../components/common/Card.js';
import { Modal } from '../components/common/Modal.js';
import { Input } from '../components/common/Input.js';
import { EmptyState } from '../components/common/EmptyState.js';
import { LoadingState } from '../components/common/LoadingState.js';
import { ErrorState } from '../components/common/ErrorState.js';
import { apiClient } from '../services/apiClient.js';
import { notifyNotificationsChanged } from '../services/notificationApi.js';
import { listDocuments } from '../services/documentApi.js';
import type { Reminder } from '../types/reminder.js';
import type { DocumentItem } from '../types/document.js';
import { ApiException } from '../types/api.js';

export const RemindersPage: React.FC = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [daysBefore, setDaysBefore] = useState<number>(30);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [remindersRes, docs] = await Promise.all([
        apiClient.get<{ success: boolean; data: { reminders: Reminder[] } }>('/reminders'),
        listDocuments(),
      ]);
      setReminders(remindersRes.data?.reminders || []);
      setDocuments(docs);
      if (docs.length > 0 && !selectedDocId) {
        setSelectedDocId(docs[0].id);
      }
    } catch (err: unknown) {
      setError(err instanceof ApiException ? err.message : 'Unable to load reminders.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocId) {
      setModalError('Please select a document for the reminder.');
      return;
    }

    setIsSaving(true);
    setModalError(null);
    try {
      await apiClient.post('/reminders', {
        documentId: selectedDocId,
        daysBefore,
        notes: notes.trim() || undefined,
      });

      const selectedDoc = documents.find((d) => d.id === selectedDocId);
      setNotice(`Reminder set for "${selectedDoc?.title || 'Document'}" (${daysBefore} days before).`);
      setNotes('');
      setIsModalOpen(false);
      notifyNotificationsChanged();
      await loadData();
    } catch (err: unknown) {
      setModalError(err instanceof ApiException ? err.message : 'Failed to schedule reminder.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDismissReminder = async (id: string) => {
    try {
      await apiClient.patch(`/reminders/${id}/dismiss`);
      setNotice('Reminder dismissed.');
      notifyNotificationsChanged();
      setReminders((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'dismissed' } : r))
      );
    } catch (err: unknown) {
      setError(err instanceof ApiException ? err.message : 'Failed to dismiss reminder.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Expiry & Renewal Reminders
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Never miss critical renewals for insurance policies, driving licenses, or passports
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setModalError(null);
            setIsModalOpen(true);
          }}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Reminder
        </Button>
      </div>

      {notice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
          <button
            onClick={() => setNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Reminder Schedule Info Card */}
      <Card className="p-6">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <CardTitle>Automated Expiry Alerts</CardTitle>
            <CardDescription className="mt-1">
              ApnaVault automatically monitors documents with expiry dates and alerts you before expiration via email and in-app notifications.
            </CardDescription>
          </div>
        </div>
      </Card>

      {/* Reminders List or Empty State */}
      {error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : isLoading ? (
        <LoadingState message="Loading scheduled reminders..." />
      ) : reminders.length === 0 ? (
        <EmptyState
          icon={<BellRing className="w-8 h-8 text-slate-400" />}
          title="No reminders scheduled"
          description="When you upload documents with expiry dates, or manually create reminder schedules, they will appear here."
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setModalError(null);
                setIsModalOpen(true);
              }}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Create First Reminder
            </Button>
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs divide-y divide-slate-100">
          {reminders.map((reminder) => (
            <div key={reminder.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-900">
                    {reminder.documentTitle}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Due: {new Date(reminder.dueDate).toLocaleDateString()} ({reminder.daysBefore} days notice)
                    {reminder.notes && ` — ${reminder.notes}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                    reminder.status === 'active'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {reminder.status}
                </span>
                {reminder.status === 'active' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-400 hover:text-slate-700 text-xs"
                    onClick={() => handleDismissReminder(reminder.id)}
                  >
                    Dismiss
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Reminder Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Renewal Reminder"
        description="Set a date to be notified ahead of document expiration"
        footer={
          <div className="flex items-center justify-end gap-2.5">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateReminder}
              isLoading={isSaving}
              disabled={documents.length === 0}
            >
              Save Reminder
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateReminder} className="space-y-4">
          {modalError && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
              {modalError}
            </div>
          )}

          {documents.length === 0 ? (
            <p className="text-xs text-slate-500">
              No documents found. Please upload a document with an expiry date first.
            </p>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Document
                </label>
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title} {d.expiryDate ? `(Expires: ${d.expiryDate.slice(0, 10)})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Notice Period
                </label>
                <select
                  value={daysBefore}
                  onChange={(e) => setDaysBefore(Number(e.target.value))}
                  className="block w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value={30}>30 days before expiry (Recommended)</option>
                  <option value={15}>15 days before expiry</option>
                  <option value={7}>7 days before expiry</option>
                  <option value={1}>1 day before expiry</option>
                </select>
              </div>

              <Input
                label="Custom Notes (Optional)"
                placeholder="e.g. Call agent Ramesh for renewal bonus"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </>
          )}
        </form>
      </Modal>
    </div>
  );
};
