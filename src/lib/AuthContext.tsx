import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

interface AuthContextType {
  user: User | null;
  role: 'admin' | 'user' | null;
  loading: boolean;
  signIn: () => void; // Now just opens the modal
  register: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (e: string, p: string) => Promise<void>;
  signUpWithEmail: (e: string, p: string) => Promise<void>;
  logOut: () => Promise<void>;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authMode: 'login' | 'register';
  setAuthMode: (mode: 'login' | 'register') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'admin' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        setLoading(true);
        try {
          const userDocRef = doc(db, 'users', u.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            setRole(userDoc.data().role);
          } else {
            // New user
            const defaultRole = u.email === 'niranjanns1925@gmail.com' ? 'admin' : 'user';
            await setDoc(userDocRef, {
              email: u.email,
              displayName: u.displayName || u.email?.split('@')[0],
              photoURL: u.photoURL,
              role: defaultRole
            });
            setRole(defaultRole);
          }
        } catch (err) {
          console.error("Error setting up user record", err);
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const signIn = () => {
    setAuthMode('login');
    setIsAuthModalOpen(true);
  };

  const register = () => {
    setAuthMode('register');
    setIsAuthModalOpen(true);
  };

  const signInWithGoogle = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Sign in error:", error);
      if (error.code === 'auth/unauthorized-domain') {
        const consoleUrl = `https://console.firebase.google.com/project/lakshmi-e-savai-center/authentication/settings`;
        throw new Error(`Firebase Authentication Error: Unauthorized Domain. The domain "${window.location.hostname}" is not authorized.`);
      } else if (error.code === 'auth/firebase-app-check-token-is-invalid.' || error.code === 'auth/firebase-app-check-token-is-invalid') {
        throw new Error("Firebase Auth Error: App Check is enforced but the token is invalid. Please go to your Firebase Console -> App Check -> APIs tab, find Identity Platform (or Authentication) and 'Unenforce' it for this preview environment to work.");
      } else if (error.code === 'auth/internal-error') {
        throw new Error("Firebase Authentication Error: Internal Error. This often happens if the Google or Email/Password Sign-in provider is not enabled in Firebase Console (Authentication -> Sign-in method), or support email is missing.");
      } else if (error.message?.includes('INTERNAL ASSERTION FAILED')) {
        throw new Error("Authentication system encountered an internal state error.");
      } else if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
        throw new Error("Failed to sign in: " + error.message);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      console.error("signInWithEmail error:", error);
      if (error.code === 'auth/firebase-app-check-token-is-invalid.' || error.code === 'auth/firebase-app-check-token-is-invalid') {
        throw new Error("Firebase Auth Error: App Check is enforced but the token is invalid. Please go to your Firebase Console -> App Check -> APIs tab, find Identity Platform (or Authentication) and 'Unenforce' it for this preview environment to work.");
      } else if (error.code === 'auth/internal-error') {
        throw new Error("Firebase Authentication Error: Internal Error. This may happen due to missing Google Cloud IAM permissions, missing Support Email in Firebase project settings, or an invalid Firebase API Key.");
      }
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(cred.user, {
        displayName: email.split('@')[0]
      });
      // Record creation happens in onAuthStateChanged
    } catch (error: any) {
      console.error("signUpWithEmail error:", error);
       if (error.code === 'auth/firebase-app-check-token-is-invalid.' || error.code === 'auth/firebase-app-check-token-is-invalid') {
        throw new Error("Firebase Auth Error: App Check is enforced but the token is invalid. Please go to your Firebase Console -> App Check -> APIs tab, find Identity Platform (or Authentication) and 'Unenforce' it for this preview environment to work.");
      } else if (error.code === 'auth/internal-error') {
        throw new Error("Firebase Authentication Error: Internal Error. This may happen due to missing Google Cloud IAM permissions, missing Support Email in Firebase project settings, or an invalid Firebase API Key.");
      }
      throw error;
    }
  };

  const logOut = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ 
      user, role, loading, signIn, register, logOut, 
      signInWithGoogle, signInWithEmail, signUpWithEmail,
      isAuthModalOpen, setIsAuthModalOpen, authMode, setAuthMode
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

