import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { AuthLayout } from '../layouts/AuthLayout.js';
import { Input } from '../components/common/Input.js';
import { Button } from '../components/common/Button.js';
import { apiClient } from '../services/apiClient.js';
import { ApiException } from '../types/api.js';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tokenFromUrl = searchParams.get('token') || '';

  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Password reset token is missing. Please use the link provided in your email.');
      return;
    }

    if (!isPasswordValid) {
      setError('Password does not meet all security policy requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await apiClient.post('/auth/reset-password', {
        token,
        password,
      });
      setResetSuccess(true);
    } catch (err: unknown) {
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError('Failed to reset password. The link may have expired or already been used.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Set New Password</h2>
        <p className="text-xs text-slate-500 mt-1">Choose a secure, unique password for your vault</p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {resetSuccess ? (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Password Reset Complete</span>
            </div>
            <p className="text-emerald-700 leading-relaxed">
              Your password has been securely updated and all prior active sessions were revoked. You can now sign in with your new password.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            className="w-full"
            onClick={() => navigate('/login')}
          >
            Sign In with New Password
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {!tokenFromUrl && (
            <Input
              label="Reset Token"
              type="text"
              required
              placeholder="Paste the reset token from your email"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          )}

          <div>
            <Input
              label="New Password"
              type="password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
            />

            {password.length > 0 && (
              <div className="mt-2 p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-[11px] space-y-1">
                <div className="font-semibold text-slate-600 mb-1">Requirements:</div>
                <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700' : 'text-slate-400'}`}>
                  <CheckCircle2 className="w-3 h-3" /> At least 8 characters
                </div>
                <div className={`flex items-center gap-1.5 ${hasUppercase ? 'text-emerald-700' : 'text-slate-400'}`}>
                  <CheckCircle2 className="w-3 h-3" /> One uppercase letter
                </div>
                <div className={`flex items-center gap-1.5 ${hasLowercase ? 'text-emerald-700' : 'text-slate-400'}`}>
                  <CheckCircle2 className="w-3 h-3" /> One lowercase letter
                </div>
                <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-700' : 'text-slate-400'}`}>
                  <CheckCircle2 className="w-3 h-3" /> One number
                </div>
                <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-700' : 'text-slate-400'}`}>
                  <CheckCircle2 className="w-3 h-3" /> One special character
                </div>
              </div>
            )}
          </div>

          <Input
            label="Confirm New Password"
            type="password"
            required
            placeholder="Repeat new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
          />

          <Button type="submit" variant="primary" size="md" className="w-full mt-2" isLoading={isLoading}>
            Update Password
          </Button>

          <div className="mt-4 pt-4 border-t border-slate-100 text-center text-xs">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-medium">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
};
