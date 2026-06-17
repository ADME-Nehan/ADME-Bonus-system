'use client';

import {
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Shield,
  Sparkles,
  User,
  WalletCards,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/context/AuthContext';
import { UserRole } from '../lib/type';

export function AppShell({
  role,
  children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { profile, logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <div className="finance-shell text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-blue-400/25 bg-blue-500/10 shadow-lg shadow-blue-500/10">
              <WalletCards className="h-6 w-6 text-blue-300" />
            </div>

            <div>
              <h1 className="finance-title text-xl font-black tracking-tight text-slate-50">
                ADME Bonus Finance
              </h1>

              <p className="mt-0.5 text-xs font-medium text-slate-400">
                {role === 'admin'
                  ? 'Admin Financial Control Center'
                  : 'User Bonus Dashboard'}{' '}
                · {profile?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <RoleBadge role={role} />

            <button
              onClick={() => router.replace(role === 'admin' ? '/admin' : '/user')}
              className="hidden items-center gap-2 rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-sm font-black text-blue-200 hover:bg-blue-500/20 md:flex"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-black text-red-200 hover:bg-red-500/20"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 rounded-3xl border border-slate-700/40 bg-slate-900/45 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-blue-200">
                <Sparkles className="h-3.5 w-3.5" />
                Financial Management System
              </div>

              <h2 className="finance-gradient-text text-3xl font-black tracking-tight md:text-4xl">
                Bonus Payment Dashboard
              </h2>

              <p className="mt-2 max-w-2xl text-sm text-slate-400">
                Track project revenue, milestone completion, task bonuses, and
                3-month installment payments in one financial dashboard.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-700/60 bg-slate-950/60 px-5 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                Active Role
              </p>
              <p className="mt-1 text-xl font-black uppercase text-slate-100">
                {role}
              </p>
            </div>
          </div>
        </div>

        {children}
      </main>
    </div>
  );
}

export function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${
        role === 'admin'
          ? 'border-purple-400/30 bg-purple-500/15 text-purple-200'
          : 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200'
      }`}
    >
      {role === 'admin' ? (
        <Shield className="h-3.5 w-3.5" />
      ) : (
        <User className="h-3.5 w-3.5" />
      )}
      {role}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const className =
    status === 'paid'
      ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200'
      : status === 'approved'
        ? 'border-blue-400/30 bg-blue-500/15 text-blue-200'
        : 'border-amber-400/30 bg-amber-500/15 text-amber-200';

  return (
    <span
      className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${className}`}
    >
      {status}
    </span>
  );
}

export function SectionTitle({
  icon,
  title,
  subtitle,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 className="flex items-center gap-3 text-xl font-black tracking-tight text-slate-50">
          <span className="grid h-10 w-10 place-items-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-blue-300">
            {icon || <ReceiptText className="h-5 w-5" />}
          </span>
          {title}
        </h2>

        {subtitle && (
          <p className="mt-2 text-sm font-medium text-slate-400">{subtitle}</p>
        )}
      </div>
    </div>
  );
}