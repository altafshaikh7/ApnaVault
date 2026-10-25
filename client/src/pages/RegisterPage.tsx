import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AuthLayout } from '../layouts/AuthLayout.js';
import { Input } from '../components/common/Input.js';
import { Button } from '../components/common/Button.js';
import { useAuth } from '../context/AuthContext.js';
import { ApiException } from '../types/api.js';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password policy validation indicators
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all required fields.');
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
      await register(name, email, password);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiException) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to create account. Please check your details and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Create your Family Vault</h2>
        <p className="text-xs text-slate-500 mt-1">One secure safe place for all your household records</p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Name"
          type="text"
          required
          placeholder="e.g. Priya Sharma"
          value={name}
          onChange={(e) => setName(e.target.value)}
          leftIcon={<User className="w-4 h-4" />}
        />

        <Input
          label="Email Address"
          type="email"
          required
          autoComplete="email"
          placeholder="e.g. priya.sharma@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail className="w-4 h-4" />}
        />

        <div>
          <Input
            label="Password"
            type="password"
            required
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
          />

          {password.length > 0 && (
            <div className="mt-2 p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-[11px] space-y-1">
              <div className="font-semibold text-slate-600 mb-1">Password Requirements:</div>
              <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700' : 'text-slate-400'}`}>
                <CheckCircle2 className="w-3 h-3" /> At least 8 characters
              </div>
              <div className={`flex items-center gap-1.5 ${hasUppercase ? 'text-emerald-700' : 'text-slate-400'}`}>
                <CheckCircle2 className="w-3 h-3" /> One uppercase letter (A-Z)
              </div>
              <div className={`flex items-center gap-1.5 ${hasLowercase ? 'text-emerald-700' : 'text-slate-400'}`}>
                <CheckCircle2 className="w-3 h-3" /> One lowercase letter (a-z)
              </div>
              <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-700' : 'text-slate-400'}`}>
                <CheckCircle2 className="w-3 h-3" /> One number (0-9)
              </div>
              <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-700' : 'text-slate-400'}`}>
                <CheckCircle2 className="w-3 h-3" /> One special character (!@#$%^&*)
              </div>
            </div>
          )}
        </div>

        <Input
          label="Confirm Password"
          type="password"
          required
          placeholder="Repeat your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          leftIcon={<Lock className="w-4 h-4" />}
        />

        <div className="text-[11px] text-slate-500 leading-normal">
          By creating an account, you agree to secure storage guidelines and encryption standards.
        </div>

        <Button type="submit" variant="primary" size="md" className="w-full mt-2" isLoading={isLoading}>
          Create Account
        </Button>
      </form>

      <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
        Already have a vault?{' '}
        <Link to="/login" className="font-semibold text-slate-900 hover:underline">
          Sign In
        </Link>
      </div>
    </AuthLayout>
  );
};
