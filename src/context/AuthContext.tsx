'use client';

import {
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
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
import { UserProfile, UserRole } from '../lib/type';

const ADMIN_EMAILS = ['tech@adme.group', 'admin.adme@gmail.com'];

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  googleLogin: () => Promise<void>;
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

async function buildProfile(user: User): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const userSnapshot = await getDoc(userRef);

  const email = user.email || '';
  const safeRole = getRoleForEmail(email);

  if (!userSnapshot.exists()) {
    const newProfile = {
      name: user.displayName || email || 'User',
      email,
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

  return {
    id: user.uid,
    ...existing,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

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
      } catch (error) {
        console.error('Auth profile error:', error);
        setFirebaseUser(currentUser);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function googleLogin() {
    const provider = new GoogleAuthProvider();

    provider.setCustomParameters({
      prompt: 'select_account',
    });

    await signInWithPopup(auth, provider);
  }

  async function register(name: string, email: string, password: string) {
    const credential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

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
      googleLogin,
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