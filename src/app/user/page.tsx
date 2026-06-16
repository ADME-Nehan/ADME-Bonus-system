'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/context/AuthContext';
import { UserApp } from '@/features/user/UserApp';

export default function UserPage() {
  const router = useRouter();
  const { loading, firebaseUser, role } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!firebaseUser) {
      router.replace('/login');
      return;
    }

    if (role === 'admin') {
      router.replace('/admin');
    }
  }, [loading, firebaseUser, role, router]);

  if (loading || !firebaseUser || role !== 'user') {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 text-slate-500">
        Loading user...
      </main>
    );
  }

  return (
    <AppShell role="user">
      <UserApp />
    </AppShell>
  );
}