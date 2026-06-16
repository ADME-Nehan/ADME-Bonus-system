'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const router = useRouter();
  const { loading, role, firebaseUser } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!firebaseUser) {
      router.replace('/login');
      return;
    }

    router.replace(role === 'admin' ? '/admin' : '/user');
  }, [loading, firebaseUser, role, router]);

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 text-slate-500">
      Loading...
    </main>
  );
}