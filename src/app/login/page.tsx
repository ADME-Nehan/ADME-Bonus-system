'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

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
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <h1 className="text-3xl font-black tracking-tight text-slate-900">
          {mode === 'login' ? 'Login' : 'Create Account'}
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          ADME task bonus and 3-month installment payment system.
        </p>

        {error && (
          <div className="mt-5 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-600">
            {error}
          </div>
        )}

        <button
          type="button"
          disabled={submitting}
          onClick={handleGoogleLogin}
          className="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white font-black text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
        >
          <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-lg font-black">
            G
          </span>
          Continue with Google
        </button>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs font-black uppercase tracking-widest text-slate-400">
            or
          </span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        {mode === 'register' && (
          <div className="mt-5">
            <label className="text-xs font-black uppercase text-slate-400">
              Name
            </label>

            <input
              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-blue-500"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
        )}

        <div className="mt-5">
          <label className="text-xs font-black uppercase text-slate-400">
            Email
          </label>

          <input
            type="email"
            className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-blue-500"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className="mt-5">
          <label className="text-xs font-black uppercase text-slate-400">
            Password
          </label>

          <input
            type="password"
            className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-blue-500"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
          />
        </div>

        <button
          disabled={submitting}
          className="mt-6 h-12 w-full rounded-2xl bg-blue-600 font-black text-white shadow-lg shadow-blue-100 disabled:opacity-60"
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
          className="mt-5 w-full text-center text-sm font-bold text-blue-600"
        >
          {mode === 'login'
            ? 'Need account? Register'
            : 'Already have account? Login'}
        </button>
      </form>
    </main>
  );
}