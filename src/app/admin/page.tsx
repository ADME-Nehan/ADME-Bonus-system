'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/context/AuthContext';
import { AdminApp } from '@/features/admin/AdminApp';

export default function AdminPage() {
  const router = useRouter();
  const { loading, firebaseUser, role } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!firebaseUser) {
      router.replace('/login');
      return;
    }

    if (role !== 'admin') {
      router.replace('/user');
    }
  }, [loading, firebaseUser, role, router]);

  if (loading || !firebaseUser || role !== 'admin') {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 text-slate-500">
        Loading admin...
      </main>
    );
  }

  return (
    <AppShell role="admin">
      <AdminApp />
    </AppShell>
  );
}