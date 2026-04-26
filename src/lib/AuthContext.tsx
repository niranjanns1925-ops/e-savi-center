import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  sendSignInLinkToEmail, 
  isSignInWithEmailLink, 
  signInWithEmailLink
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

interface AuthContextType {
  user: User | null;
  role: 'admin' | 'user' | null;
  loading: boolean;
  signIn: () => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'admin' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkEmailLink = async () => {
      if (isSignInWithEmailLink(auth, window.location.href)) {
        let email = window.localStorage.getItem('emailForSignIn');
        if (!email) {
          email = window.prompt('Please provide your email for confirmation');
        }
        if (email) {
          try {
            setLoading(true);
            await signInWithEmailLink(auth, email, window.location.href);
            window.localStorage.removeItem('emailForSignIn');
            // Clean up the URL
            window.history.replaceState({}, '', window.location.pathname);
          } catch (error: any) {
            handleAuthError(error);
          } finally {
            setLoading(false);
          }
        }
      }
    };

    checkEmailLink();

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

  const handleAuthError = (error: any) => {
    console.error("Firebase Sign-In Details:", {
      code: error.code,
      message: error.message,
      hostname: window.location.hostname,
      stack: error.stack
    });

    if (error.code === 'auth/unauthorized-domain') {
      alert(`🚫 DOMAIN NOT AUTHORIZED\n\nThis domain (${window.location.hostname}) is not in your Firebase 'Authorized Domains' list.\n\nFix it:\n1. Open Firebase Console\n2. Go to Authentication > Settings > Authorized Domains\n3. Click 'Add Domain' and enter: ${window.location.hostname}`);
    } else if (error.code === 'auth/popup-blocked' || error.message?.includes('Pending promise was never set')) {
      alert("🚫 POPUP BLOCKED\n\nYour browser or the preview environment blocked the sign-in window.\n\nPLEASE OPEN THIS APP IN A NEW TAB (click ↗️ at top right) to sign in.");
    } else if (error.code === 'auth/internal-error') {
      alert("🔧 FIREBASE CONFIGURATION MISSING\n\nThis 'internal-error' almost always means your Firebase project is missing a 'Support Email'.\n\nFix it:\n1. Open Firebase Console\n2. Go to Project Settings (Gear icon ⚙️)\n3. In 'General' tab, find 'Support email' and select your email address.\n4. Click Save and try again.");
    } else if (error.code === 'auth/operation-not-allowed') {
      alert("🚫 AUTH PROVIDER NOT ENABLED\n\nThis login method is not enabled in your Firebase project.\n\nFix it:\n1. Open Firebase Console\n2. Go to Authentication > Sign-in method\n3. Enable the provider you just used (Google or Email).");
    } else if (error.code === 'auth/app-check-token-is-invalid' || error.code === 'auth/firebase-app-check-token-is-invalid') {
      alert("🚫 APP CHECK ERROR\n\nFirebase App Check is blocking this request. If you enabled App Check in the Firebase Console, you must ensure 'Authentication' is not enforced yet, or that this domain is registered.\n\nTemporary Fix:\n1. Go to Firebase Console > App Check > Enforcement\n2. Set 'Authentication' to 'Unenforced'.");
    } else if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
      alert(`❌ SIGN-IN ERROR\n\nCode: ${error.code}\nMessage: ${error.message}\n\nPlease try opening in a new tab if you haven't already.`);
    }
  };

  const signIn = async () => {
    try {
      const inIframe = window !== window.top;
      if (inIframe) {
        alert("⚠️ LOGIN RESTRICTED IN PREVIEW IFRAME\n\nSign-In is blocked by browsers when inside an iframe for security.\n\n1. Look at the top-right corner of this preview window.\n2. Click the 'Open in new tab' icon (↗️).\n3. In the new tab, click 'Launch Dashboard' to sign in successfully.");
        return;
      }
      
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      handleAuthError(error);
    }
  };


  const sendMagicLink = async (email: string) => {
    try {
      const actionCodeSettings = {
        url: window.location.origin,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      alert(`✨ Magic link sent to ${email}!\n\nPlease check your inbox and click the link to sign in.`);
    } catch (error: any) {
      handleAuthError(error);
    }
  };

  const logOut = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signIn, sendMagicLink, logOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
