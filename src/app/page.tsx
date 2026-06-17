'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WalletCards } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login, googleLogin, register, firebaseUser, role, loading } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('admin.adme@gmail.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && firebaseUser) {
      router.replace(role === 'admin' ? '/admin' : '/user');
    }
  }, [loading, firebaseUser, role, router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError('');

      if (mode === 'register') {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
    } catch (err) {
      console.error(err);
      setError('Login/register failed. Check email, password, and Firebase setup.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    try {
      setSubmitting(true);
      setError('');
      await googleLogin();
    } catch (err) {
      console.error(err);
      setError('Google login failed. Enable Google provider and check authorized domain.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="finance-shell grid min-h-screen place-items-center px-4 py-10">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-3xl border border-slate-700/50 bg-slate-900/80 p-8 shadow-2xl shadow-black/30 backdrop-blur-2xl"
      >
        <div className="mb-6 flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl border border-blue-400/25 bg-blue-500/10 text-blue-300 shadow-lg shadow-blue-500/10">
            <WalletCards className="h-7 w-7" />
          </div>

          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-50">
              {mode === 'login' ? 'Login' : 'Create Account'}
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              ADME financial bonus dashboard
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-bold text-red-200">
            {error}
          </div>
        )}

        <button
          type="button"
          disabled={submitting}
          onClick={handleGoogleLogin}
          className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-slate-700 bg-slate-950/50 font-black text-slate-100 hover:border-blue-400/40 hover:bg-blue-500/10 disabled:opacity-60"
        >
          <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-sm font-black text-slate-900">
            G
          </span>
          Continue with Google
        </button>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-700" />
          <span className="text-xs font-black uppercase tracking-widest text-slate-500">
            or
          </span>
          <div className="h-px flex-1 bg-slate-700" />
        </div>

        {mode === 'register' && (
          <div className="mt-5">
            <label className="text-xs font-black uppercase text-slate-500">
              Name
            </label>

            <input
              className="mt-2 h-12 w-full rounded-2xl border border-slate-700 px-4 outline-none"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
        )}

        <div className="mt-5">
          <label className="text-xs font-black uppercase text-slate-500">
            Email
          </label>

          <input
            type="email"
            className="mt-2 h-12 w-full rounded-2xl border border-slate-700 px-4 outline-none"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className="mt-5">
          <label className="text-xs font-black uppercase text-slate-500">
            Password
          </label>

          <input
            type="password"
            className="mt-2 h-12 w-full rounded-2xl border border-slate-700 px-4 outline-none"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
          />
        </div>

        <button
          disabled={submitting}
          className="mt-6 h-12 w-full rounded-2xl bg-blue-600 font-black text-white disabled:opacity-60"
        >
          {submitting
            ? 'Please wait...'
            : mode === 'login'
              ? 'Login'
              : 'Register'}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="mt-5 w-full text-center text-sm font-bold text-blue-300"
        >
          {mode === 'login'
            ? 'Need account? Register'
            : 'Already have account? Login'}
        </button>
      </form>
    </main>
  );
}