import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Mail, ArrowLeft, RefreshCw } from 'lucide-react';
import { AuthLayout } from '../layouts/AuthLayout.js';
import { Input } from '../components/common/Input.js';
import { Button } from '../components/common/Button.js';
import { apiClient } from '../services/apiClient.js';
import { ApiException } from '../types/api.js';
import { useAuth } from '../hooks/useAuth.js';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';
  const { refreshUser } = useAuth();

  const [token, setToken] = useState(tokenFromUrl);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resend state
  const [resendEmail, setResendEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const autoVerificationTokens = useRef(new Set<string>());
  const inFlightTokens = useRef(new Set<string>());

  const handleVerify = useCallback(async (tokenToVerify: string) => {
    if (!tokenToVerify) return;
    if (inFlightTokens.current.has(tokenToVerify)) return;

    inFlightTokens.current.add(tokenToVerify);
    setIsVerifying(true);
    setError(null);

    try {
      await apiClient.post('/auth/verify-email', { token: tokenToVerify });
      setVerifiedSuccess(true);
      await refreshUser();
    } catch (err: unknown) {
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError('Verification failed. The link may have expired or already been used.');
      }
    } finally {
      inFlightTokens.current.delete(tokenToVerify);
      setIsVerifying(false);
    }
  }, [refreshUser]);

  useEffect(() => {
    if (tokenFromUrl && !autoVerificationTokens.current.has(tokenFromUrl)) {
      autoVerificationTokens.current.add(tokenFromUrl);
      void handleVerify(tokenFromUrl);
    }
  }, [handleVerify, tokenFromUrl]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) return;

    setIsResending(true);
    setError(null);
    setResendNotice(null);

    try {
      await apiClient.post('/auth/resend-verification', { email: resendEmail });
      setResendNotice('If an unverified account exists with this email, a new verification link has been dispatched.');
    } catch (err: unknown) {
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError('Unable to resend verification. Please try again.');
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Email Verification</h2>
        <p className="text-xs text-slate-500 mt-1">Confirm your email address to secure your account</p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {resendNotice && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{resendNotice}</span>
        </div>
      )}

      {verifiedSuccess ? (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Email Verified Successfully</span>
            </div>
            <p className="text-emerald-700 leading-relaxed">
              Your email address has been verified. Your vault is fully enabled with all security and reminder features.
            </p>
          </div>

          <Link to="/dashboard">
            <Button variant="primary" size="md" className="w-full">
              Continue to Dashboard
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {!tokenFromUrl && (
            <div className="space-y-3">
              <Input
                label="Verification Token"
                placeholder="Paste the verification token from your email"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
              <Button
                variant="primary"
                size="md"
                className="w-full"
                isLoading={isVerifying}
                onClick={() => handleVerify(token)}
              >
                Verify Token
              </Button>
            </div>
          )}

          {isVerifying && (
            <div className="text-center py-4 text-xs text-slate-500">
              Verifying token... Please wait.
            </div>
          )}

          {/* Resend Verification Section */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-xs font-semibold text-slate-800 mb-2">Need a new verification link?</h3>
            <form onSubmit={handleResend} className="space-y-3">
              <Input
                placeholder="Enter your registered email address"
                type="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
              />
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="w-full"
                isLoading={isResending}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Resend Verification Email
              </Button>
            </form>
          </div>

          <div className="pt-2 text-center text-xs">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-medium">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </Link>
          </div>
        </div>
      )}
    </AuthLayout>
  );
};
