'use client';

import {
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Shield,
  User,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/lib/types';

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
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900">
              ADME Bonus Payment System
            </h1>
            <p className="text-sm text-slate-500">
              {role === 'admin' ? 'Admin Panel' : 'User Panel'} · {profile?.email}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.replace(role === 'admin' ? '/admin' : '/user')}
              className="flex items-center gap-2 rounded-2xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-2 text-sm font-bold text-red-600"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">{children}</div>
    </div>
  );
}

export function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
        role === 'admin'
          ? 'bg-purple-100 text-purple-700'
          : 'bg-emerald-100 text-emerald-700'
      }`}
    >
      {role === 'admin' ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
      {role}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const className =
    status === 'paid'
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
      : status === 'approved'
        ? 'bg-blue-100 text-blue-700 border-blue-200'
        : 'bg-amber-100 text-amber-700 border-amber-200';

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
        <h2 className="flex items-center gap-2 text-2xl font-black text-slate-900">
          {icon || <ReceiptText className="h-5 w-5 text-blue-600" />}
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
    </div>
  );
}