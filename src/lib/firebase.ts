import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
// import { getStorage } from 'firebase/storage';
import { getAnalytics } from "firebase/analytics";
import firebaseConfig from '../../firebase-applet-config.json';

const envConfig = {
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
  measurementId: firebaseConfig.measurementId,
};

console.log("Firebase config:", envConfig);

const app = initializeApp(envConfig);

// Initialize App Check if configured (optional)
if (typeof window !== 'undefined') {
  try {
    const debugToken = import.meta.env.VITE_APP_CHECK_DEBUG_TOKEN;
    const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

    if (debugToken) {
      (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
    }

    if (siteKey || debugToken) {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(siteKey || 'dummy-key-for-debug'),
        isTokenAutoRefreshEnabled: true
      });
      console.log("Firebase App Check initialized.");
    }
  } catch (e) {
    console.warn("App Check failed to initialize. If Authentication is enforced, sign-in may fail.", e);
  }
}

// Use initializeFirestore with experimentalForceLongPolling to improve connectivity in proxy environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

// export const storage = getStorage(app);
export const auth = getAuth(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export async function sendNotification(userId: string, title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      title,
      message,
      type,
      read: false,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
}

async function testConnection() {
  try {
    // Attempt to fetch a document from the server to verify connectivity
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firebase is initializing or offline. If this persists, check your project configuration.");
    } else {
      // It's okay if the document doesn't exist, we just want to see if we can reach the server
      console.log("Firebase availability test completed.");
    }
  }
}

// Start connection test after a short delay to allow environment to stabilize
setTimeout(testConnection, 1000);

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: { providerId: string; displayName: string; email: string; }[];
  }
}

export function handleFirestoreError(error: any, operationType: FirestoreErrorInfo['operationType'], path: string | null = null): never {
  const user = auth.currentUser;
  const errorInfo: FirestoreErrorInfo = {
    error: error.message || 'Unknown Firestore error',
    operationType,
    path,
    authInfo: {
      userId: user?.uid || 'unauthenticated',
      email: user?.email || 'unauthenticated',
      emailVerified: user?.emailVerified || false,
      isAnonymous: user?.isAnonymous || false,
      providerInfo: user?.providerData.map(p => ({
        providerId: p.providerId,
        displayName: p.displayName || '',
        email: p.email || '',
      })) || [],
    }
  };
  throw new Error(JSON.stringify(errorInfo));
}
