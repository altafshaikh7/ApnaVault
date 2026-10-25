import React, { useState } from 'react';
import {
  User,
  Shield,
  Bell,
  HardDrive,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../components/common/Button.js';
import { Card, CardTitle, CardDescription } from '../components/common/Card.js';
import { Input } from '../components/common/Input.js';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'storage'>('profile');
  const [name, setName] = useState('Household Admin');
  const [email] = useState('admin@household.local');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [timezone, setTimezone] = useState('Asia/Kolkata (IST)');
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Settings
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your account profile, security credentials, and vault preferences
        </p>
      </div>

      {savedNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Preferences updated successfully.</span>
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium transition-colors shrink-0 ${
            activeTab === 'profile'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium transition-colors shrink-0 ${
            activeTab === 'security'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Security & Sessions</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium transition-colors shrink-0 ${
            activeTab === 'notifications'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notifications</span>
        </button>

        <button
          onClick={() => setActiveTab('storage')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium transition-colors shrink-0 ${
            activeTab === 'storage'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>Storage & Data</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSave} className="space-y-6">
          <Card className="p-6 space-y-4">
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your contact details for notifications and recovery</CardDescription>

            <Input
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Patel"
            />

            <Input
              label="Email Address"
              value={email}
              disabled
              helperText="Email cannot be changed directly. Contact support for email updates."
            />

            <Input
              label="Mobile Number (Optional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              helperText="Used for SMS urgent renewal alerts in future updates"
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Preferred Timezone
              </label>
              <div className="relative">
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 py-2 px-3 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="Asia/Kolkata (IST)">Asia/Kolkata (IST - Indian Standard Time)</option>
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                </select>
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" variant="primary" size="md" leftIcon={<Save className="w-4 h-4" />}>
              Save Changes
            </Button>
          </div>
        </form>
      )}

      {activeTab === 'security' && (
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Ensure your password is long and unique</CardDescription>

            <Input
              label="Current Password"
              type="password"
              placeholder="••••••••••••"
            />
            <Input
              label="New Password"
              type="password"
              placeholder="At least 8 characters"
            />
            <Input
              label="Confirm New Password"
              type="password"
              placeholder="Repeat new password"
            />

            <div className="pt-2">
              <Button variant="primary" size="sm">
                Update Password
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <CardTitle>Active Browser Sessions</CardTitle>
            <CardDescription>Devices currently signed in to your vault</CardDescription>

            <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
              <div>
                <div className="font-semibold text-slate-900 flex items-center gap-2">
                  <span>Current Browser Session</span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                    This Device
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Signed in just now</div>
              </div>
              <Button variant="outline" size="sm">
                Sign Out Others
              </Button>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'notifications' && (
        <Card className="p-6 space-y-5">
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Choose how you want to be notified about document expirations</CardDescription>

          <div className="space-y-4 divide-y divide-slate-100 text-xs">
            <div className="pt-3 flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-slate-900">30-Day Advance Expiry Alert</h4>
                <p className="text-slate-500">Receive an email 30 days before document or policy expires</p>
              </div>
              <input type="checkbox" defaultChecked className="rounded text-slate-900 focus:ring-slate-900 h-4 w-4" />
            </div>

            <div className="pt-3 flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-slate-900">7-Day Final Notice</h4>
                <p className="text-slate-500">Urgent alert 1 week before expiry date</p>
              </div>
              <input type="checkbox" defaultChecked className="rounded text-slate-900 focus:ring-slate-900 h-4 w-4" />
            </div>

            <div className="pt-3 flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-slate-900">Family Workspace Activity</h4>
                <p className="text-slate-500">Notify when family members share a new document or accept invites</p>
              </div>
              <input type="checkbox" defaultChecked className="rounded text-slate-900 focus:ring-slate-900 h-4 w-4" />
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'storage' && (
        <div className="space-y-6">
          <Card className="p-6">
            <CardTitle>Vault Storage Usage</CardTitle>
            <CardDescription>Current storage used in your private S3 object store</CardDescription>

            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-800">
                <span>0 MB Used</span>
                <span>5,000 MB (5 GB) Quota</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-emerald-600 h-full rounded-full" style={{ width: '0%' }} />
              </div>
              <p className="text-[11px] text-slate-400">
                0% of your free household storage quota used.
              </p>
            </div>
          </Card>

          <Card className="p-6">
            <CardTitle>Data Export</CardTitle>
            <CardDescription>Download a complete metadata index of all your household files</CardDescription>

            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <Button variant="outline" size="sm">
                Export Metadata (CSV)
              </Button>
              <Button variant="outline" size="sm">
                Printable Emergency Checklist (HTML)
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
