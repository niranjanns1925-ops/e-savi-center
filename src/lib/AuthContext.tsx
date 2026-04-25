import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

interface AuthContextType {
  user: User | null;
  role: 'admin' | 'user' | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'admin' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userDocRef = doc(db, 'users', u.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          setRole(userDoc.data().role);
        } else {
          // New user
          const defaultRole = u.email === 'niranjanns1925@gmail.com' ? 'admin' : 'user';
          await setDoc(userDocRef, {
            email: u.email,
            displayName: u.displayName,
            photoURL: u.photoURL,
            role: defaultRole
          });
          setRole(defaultRole);
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const signIn = async () => {
    try {
      const inIframe = window !== window.top;
      if (inIframe) {
        alert("Google Sign-In is blocked inside this preview's iframe due to browser security restrictions.\n\nPLEASE CLICK THE 'OPEN IN NEW TAB' ICON (↗️) AT THE TOP RIGHT OF THIS PREVIEW, then click Sign in again.");
        return;
      }
      
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Sign in error:", error);
      if (error.code === 'auth/unauthorized-domain') {
        alert("Firebase is blocking this login because the domain is not authorized.\n\nPlease go to:\nFirebase Console > Authentication > Settings > Authorized Domains\n\nAnd add the following domains:\n1. " + window.location.hostname + "\n2. e-savi-center.vercel.app");
      } else if (error.code === 'auth/popup-blocked' || error.message?.includes('Pending promise was never set')) {
        alert("Sign-in is being blocked by your browser's security settings for iframes.\n\nPLEASE CLICK THE 'OPEN IN NEW TAB' ICON (↗️) AT THE TOP RIGHT OF THIS PREVIEW TO SIGN IN SUCCESSFULLY.");
      } else if (error.code === 'auth/internal-error') {
        alert("Firebase internal auth error.\n\n1. Go to Firebase Console > Authentication > Settings (or Project Settings) > General.\n2. Ensure you have selected a 'Support email'.\n3. Ensure 'Google' is properly enabled in Sign-in methods.\n\nIf that's done and you still see this, click the 'Open in new tab' icon ↗️ at the top right.");
      } else if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
        alert("Failed to sign in: " + error.message);
      }
    }
  };

  const logOut = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signIn, logOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
