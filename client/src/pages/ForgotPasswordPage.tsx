import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { AuthLayout } from '../layouts/AuthLayout.js';
import { Input } from '../components/common/Input.js';
import { Button } from '../components/common/Button.js';
import { apiClient } from '../services/apiClient.js';
import { ApiException } from '../types/api.js';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await apiClient.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (err: unknown) {
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError('Unable to send password reset instructions. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Forgot Password</h2>
        <p className="text-xs text-slate-500 mt-1">
          Enter your registered email address to receive password reset instructions
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {submitted ? (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Instructions Dispatched</span>
            </div>
            <p className="text-emerald-700 leading-relaxed">
              If an account is associated with <strong>{email}</strong>, you will receive an email with instructions on how to reset your password.
            </p>
          </div>

          <p className="text-[11px] text-slate-500 leading-normal">
            Didn&apos;t receive an email? Check your spam folder or ensure the email address matches your registered account.
          </p>

          <div className="pt-2">
            <Link to="/login">
              <Button variant="outline" size="md" className="w-full" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Return to Sign In
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            required
            autoComplete="email"
            placeholder="e.g. rahul.sharma@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
          />

          <Button type="submit" variant="primary" size="md" className="w-full mt-2" isLoading={isLoading}>
            Send Reset Instructions
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
