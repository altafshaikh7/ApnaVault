import React, { useState } from 'react';
import {
  BellRing,
  Plus,
  Calendar,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Button } from '../components/common/Button.js';
import { Card, CardTitle, CardDescription } from '../components/common/Card.js';
import { Modal } from '../components/common/Modal.js';
import { Input } from '../components/common/Input.js';
import { EmptyState } from '../components/common/EmptyState.js';
import type { Reminder } from '../types/reminder.js';

export const RemindersPage: React.FC = () => {
  const [reminders] = useState<Reminder[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [daysBefore, setDaysBefore] = useState<number>(30);
  const [notice, setNotice] = useState<string | null>(null);

  const handleCreateReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle || !dueDate) return;

    setNotice(`Reminder set for "${docTitle}" due on ${dueDate} (${daysBefore} days before).`);
    setDocTitle('');
    setDueDate('');
    setIsModalOpen(false);
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
          onClick={() => setIsModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Reminder
        </Button>
      </div>

      {notice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
          <span>{notice}</span>
          <button
            onClick={() => setNotice(null)}
            className="text-emerald-600 hover:text-emerald-900 font-bold ml-2"
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
              ApnaVault automatically monitors documents with expiry dates and alerts you at 30 days, 7 days, and 1 day before expiration via email and in-app notifications.
            </CardDescription>
          </div>
        </div>
      </Card>

      {/* Reminders List or Empty State */}
      {reminders.length === 0 ? (
        <EmptyState
          icon={<BellRing className="w-8 h-8 text-slate-400" />}
          title="No reminders scheduled"
          description="When you upload documents with expiry dates, or manually create reminder schedules, they will appear here."
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Create First Reminder
            </Button>
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs divide-y divide-slate-100">
          {reminders.map((reminder) => (
            <div key={reminder.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-900">
                    {reminder.documentTitle}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Due: {reminder.dueDate} ({reminder.daysBefore} days notice)
                  </p>
                </div>
              </div>
              <span className="text-xs text-slate-500">{reminder.status}</span>
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
          <>
            <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateReminder}>
              Save Reminder
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateReminder} className="space-y-4">
          <Input
            label="Document / Policy Name"
            required
            placeholder="e.g. Star Health Family Floater Insurance"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
          />

          <Input
            label="Expiry / Renewal Due Date"
            type="date"
            required
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />

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

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-start gap-2 text-xs text-slate-600">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              Background reminder workers run scheduled checks and will deliver reminders in Phase 8.
            </span>
          </div>
        </form>
      </Modal>
    </div>
  );
};
