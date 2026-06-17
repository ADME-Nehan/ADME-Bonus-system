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
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/75 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 py-3 sm:px-4 md:flex-row md:items-center md:justify-between md:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-blue-400/25 bg-blue-500/10 shadow-lg shadow-blue-500/10 sm:h-12 sm:w-12">
              <WalletCards className="h-5 w-5 text-blue-300 sm:h-6 sm:w-6" />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-lg font-black tracking-tight text-slate-50 sm:text-xl">
                ADME Bonus Finance
              </h1>

              <p className="mt-0.5 max-w-[230px] truncate text-[11px] font-medium text-slate-400 sm:max-w-none sm:text-xs">
                {role === 'admin'
                  ? 'Admin Financial Control Center'
                  : 'User Bonus Dashboard'}{' '}
                · {profile?.email}
              </p>
            </div>
          </div>

          <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 md:w-auto md:justify-end md:overflow-visible md:pb-0">
            <RoleBadge role={role} />

            <button
              onClick={() => router.replace(role === 'admin' ? '/admin' : '/user')}
              className="flex shrink-0 items-center gap-2 rounded-2xl border border-blue-400/20 bg-blue-500/10 px-3 py-2 text-xs font-black text-blue-200 hover:bg-blue-500/20 sm:px-4 sm:text-sm"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </button>

            <button
              onClick={handleLogout}
              className="flex shrink-0 items-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-black text-red-200 hover:bg-red-500/20 sm:px-4 sm:text-sm"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 py-5 sm:px-4 sm:py-6 lg:px-6 lg:py-8">
        <div className="mb-6 rounded-3xl border border-slate-700/40 bg-slate-900/45 p-4 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-6 lg:mb-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">

              <h2 className="finance-gradient-text text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
                Bonus Payment Dashboard
              </h2>

              <p className="mt-2 max-w-2xl text-xs leading-6 text-slate-400 sm:text-sm">
                Track project revenue, milestone completion, task bonuses, and
                3-month installment payments in one responsive dashboard.
              </p>
            </div>

            <div className="w-full rounded-2xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 sm:w-auto sm:px-5 sm:py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                Active Role
              </p>

              <p className="mt-1 text-lg font-black uppercase text-slate-100 sm:text-xl">
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
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${
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
      className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${className}`}
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
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 className="flex items-center gap-3 text-lg font-black tracking-tight text-slate-50 sm:text-xl">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-blue-300">
            {icon || <ReceiptText className="h-5 w-5" />}
          </span>

          <span className="min-w-0">{title}</span>
        </h2>

        {subtitle && (
          <p className="mt-2 text-xs font-medium leading-5 text-slate-400 sm:text-sm">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}