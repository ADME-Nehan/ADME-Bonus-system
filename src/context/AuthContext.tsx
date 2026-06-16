'use client';

import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { auth, db } from '@/lib/firebase';
import { UserProfile, UserRole } from '@/lib/types';

const ADMIN_EMAILS = ['tech@adme.group', 'admin.adme@gmail.com'];

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getRoleForEmail(email?: string | null): UserRole {
  if (email && ADMIN_EMAILS.includes(email.toLowerCase())) {
    return 'admin';
  }

  return 'user';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function buildProfile(user: User) {
    const userRef = doc(db, 'users', user.uid);
    const userSnapshot = await getDoc(userRef);

    const safeRole = getRoleForEmail(user.email);

    if (!userSnapshot.exists()) {
      const newProfile = {
        name: user.displayName || user.email || 'User',
        email: user.email || '',
        role: safeRole,
        isManager: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(userRef, newProfile);

      return {
        id: user.uid,
        name: newProfile.name,
        email: newProfile.email,
        role: newProfile.role,
        isManager: false,
      };
    }

    const existing = userSnapshot.data() as Omit<UserProfile, 'id'>;

    if (safeRole === 'admin' && existing.role !== 'admin') {
      await setDoc(
        userRef,
        {
          role: 'admin',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      return {
        id: user.uid,
        ...existing,
        role: 'admin' as const,
      };
    }

    return {
      id: user.uid,
      ...existing,
    };
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        setLoading(true);

        if (!currentUser) {
          setFirebaseUser(null);
          setProfile(null);
          return;
        }

        const userProfile = await buildProfile(currentUser);

        setFirebaseUser(currentUser);
        setProfile(userProfile);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function register(name: string, email: string, password: string) {
    const credential = await createUserWithEmailAndPassword(auth, email, password);

    await updateProfile(credential.user, {
      displayName: name,
    });

    const role = getRoleForEmail(email);

    await setDoc(doc(db, 'users', credential.user.uid), {
      name,
      email,
      role,
      isManager: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  async function logout() {
    await signOut(auth);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      firebaseUser,
      profile,
      role: profile?.role || null,
      loading,
      login,
      register,
      logout,
    }),
    [firebaseUser, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}