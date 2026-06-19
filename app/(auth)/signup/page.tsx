'use client';

/**
 * Signup page — create an account with email/password or Google OAuth.
 *
 * Validation lives in the `signUp` server action (Zod: 8+ chars, one uppercase,
 * one number); on success it shows an email-verification notice rather than
 * navigating. Field errors are wired to the inputs via `aria-describedby`/
 * `aria-invalid`, and the card animation respects `prefers-reduced-motion`.
 */

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Leaf, Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signUp, signInWithGoogle } from '@/app/auth/actions';
import { toast } from '@/stores/toast-store';

export default function SignupPage() {
  const reduceMotion = useReducedMotion();
  const [isPending, startTransition] = useTransition();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const result = await signUp({ email, password, fullName });
      if (!result.success) {
        setErrorMsg(result.error);
        toast({ title: 'Sign Up Failed', description: result.error, type: 'error' });
      } else {
        setSuccessMsg('Verification email sent! Check your inbox to confirm your account.');
        toast({
          title: 'Verification Email Sent',
          description: 'Please verify your email to get started.',
          type: 'success',
        });
        setFullName('');
        setEmail('');
        setPassword('');
      }
    });
  };

  const handleGoogleSignIn = () => {
    setErrorMsg(null);
    startTransition(async () => {
      const result = await signInWithGoogle();
      if (!result.success) {
        setErrorMsg(result.error);
        toast({ title: 'Google Sign In Failed', description: result.error, type: 'error' });
      }
    });
  };

  return (
    <main
      id="main-content"
      className="flex-1 flex items-center justify-center min-h-screen relative overflow-hidden bg-gradient-to-br from-emerald-50 via-[#f0fdf4] to-amber-50 py-12 px-4"
    >
      {/* Decorative blobs */}
      <div className="absolute top-[-15%] left-[-10%] w-[45%] h-[45%] bg-emerald-200 rounded-full blur-3xl opacity-30 pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[40%] h-[40%] bg-amber-200 rounded-full blur-3xl opacity-25 pointer-events-none" />

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.45, ease: 'easeOut' }}
        className="w-full max-w-md z-10"
      >
        {/* Brand */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-2xl font-bold font-heading text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-md p-1"
          >
            <Leaf className="h-7 w-7 text-emerald-600" />
            <span>Carbon Karma</span>
          </Link>
          <p className="mt-1.5 text-sm text-emerald-700">
            Join thousands reducing their footprint in India
          </p>
        </div>

        {/* Solid white card */}
        <div className="bg-white rounded-2xl shadow-xl border border-emerald-100 overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-emerald-50">
            <h1 className="text-2xl font-bold text-emerald-950 font-heading text-center">
              Create your account
            </h1>
            <p className="text-sm text-emerald-600 text-center mt-1">
              Sign up and earn your first 100 Karma points
            </p>
          </div>

          <div className="px-8 py-6 space-y-5">
            {/* Alerts */}
            {errorMsg && (
              <div
                role="alert"
                id="signup-error"
                className="flex items-start gap-2.5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 border border-red-200"
              >
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 border border-emerald-200">
                <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Google Button — prominent, at top */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isPending}
              className="w-full flex items-center justify-center gap-3 h-11 rounded-xl border-2 border-gray-200 bg-white text-gray-800 text-sm font-semibold hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98] transition-all shadow-sm disabled:opacity-60"
            >
              <GoogleIcon />
              Sign Up with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-emerald-100" />
              <span className="text-xs text-emerald-500 font-medium uppercase tracking-wide">
                or with email
              </span>
              <div className="flex-1 h-px bg-emerald-100" />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-emerald-900 font-medium text-sm">
                  Full Name
                </Label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-400">
                    <User className="h-4 w-4" />
                  </span>
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    required
                    aria-required="true"
                    aria-invalid={errorMsg ? true : undefined}
                    aria-describedby={errorMsg ? 'signup-error' : undefined}
                    placeholder="Arjun Sharma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10"
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-emerald-900 font-medium text-sm">
                  Email Address
                </Label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-400">
                    <Mail className="h-4 w-4" />
                  </span>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    aria-required="true"
                    aria-invalid={errorMsg ? true : undefined}
                    aria-describedby={errorMsg ? 'signup-error' : undefined}
                    placeholder="arjun@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-emerald-900 font-medium text-sm">
                  Password
                </Label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-400">
                    <Lock className="h-4 w-4" />
                  </span>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    aria-required="true"
                    aria-describedby={errorMsg ? 'password-hint signup-error' : 'password-hint'}
                    aria-invalid={errorMsg ? true : undefined}
                    placeholder="Min. 8 chars, 1 uppercase, 1 number"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    disabled={isPending}
                  />
                </div>
                <p id="password-hint" className="text-xs text-emerald-700">
                  Must be at least 8 characters with one uppercase letter and one number.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base rounded-xl"
                disabled={isPending}
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Creating Account...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Create Account <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>
          </div>

          {/* Footer */}
          <div className="px-8 py-5 bg-emerald-50/60 border-t border-emerald-100 text-center">
            <span className="text-sm text-emerald-700">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-bold text-emerald-700 hover:text-emerald-900 hover:underline transition-colors"
              >
                Sign In Instead
              </Link>
            </span>
          </div>
        </div>
      </motion.div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}
