import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { X, ExternalLink, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, authMode, setAuthMode } = useAuth();
  const isLogin = authMode === 'login';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [firebaseErrorType, setFirebaseErrorType] = useState<'app-check' | 'internal' | null>(null);

  const handleError = (err: any) => {
    const errorString = err.message || err.toString();
    if (errorString.includes('App Check') || errorString.includes('app-check')) {
      setFirebaseErrorType('app-check');
      setError('App Check blocks this preview.');
    } else if (errorString.includes('Internal Error') || errorString.includes('internal-error')) {
      setFirebaseErrorType('internal');
      setError('Firebase Identity Providers are not fully enabled.');
    } else {
      setFirebaseErrorType(null);
      setError(errorString);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFirebaseErrorType(null);
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
      onClose();
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setFirebaseErrorType(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-xl z-50 overflow-hidden"
          >
            <div className="p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">
                  {isLogin ? 'Welcome Back' : 'Create Account'}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 -mr-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {firebaseErrorType === 'app-check' && (
                <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl space-y-3">
                  <div className="flex items-start gap-2 text-orange-800 font-bold">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <h3>Firebase App Check is Blocking Login</h3>
                  </div>
                  <div className="text-sm text-orange-900 space-y-2">
                    <p>App Check is enforced in your Firebase project, which blocks AI Studio preview environments.</p>
                    <p className="font-semibold">How to fix:</p>
                    <ol className="list-decimal pl-4 space-y-1">
                      <li>Go to your <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="underline text-orange-700 flex items-center gap-1 inline-flex">Firebase Console <ExternalLink className="w-3 h-3" /></a></li>
                      <li>Select your project.</li>
                      <li>In the left sidebar, click <strong>Build</strong> &gt; <strong>App Check</strong>.</li>
                      <li>Go to the <strong>APIs</strong> tab.</li>
                      <li>Find <strong>Identity Platform</strong> (or Authentication).</li>
                      <li>Click it and choose <strong>Unenforce</strong>.</li>
                    </ol>
                  </div>
                </div>
              )}

              {firebaseErrorType === 'internal' && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl space-y-3">
                  <div className="flex items-start gap-2 text-red-800 font-bold">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <h3>Authentication Configuration Error</h3>
                  </div>
                  <div className="text-sm text-red-900 space-y-2">
                    <p>Since you have already configured Firebase correctly, this error is happening because <strong>browsers block Google Sign-In inside iframes</strong>.</p>
                    <div className="bg-white p-3 rounded-md border border-red-200 shadow-sm mt-3">
                      <p className="font-bold text-red-700 mb-1">How to fix it right now:</p>
                      <p className="text-red-900">Look at the top right of this preview window. Click the <strong>Open in new tab</strong> icon (it looks like a square with an arrow pointing out). Then try signing in again in the new tab.</p>
                    </div>
                  </div>
                </div>
              )}

              {!firebaseErrorType && error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-70 disabled:active:scale-100"
                >
                  {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
                </button>
              </form>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-slate-500">Or continue with</span>
                </div>
              </div>

              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-2 px-4 border-2 border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-all"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  <path d="M1 1h22v22H1z" fill="none" />
                </svg>
                Google
              </button>

              <div className="mt-6 text-center text-sm text-slate-500">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button
                  onClick={() => setAuthMode(isLogin ? 'register' : 'login')}
                  className="font-bold text-indigo-600 hover:text-indigo-700 underline"
                  type="button"
                >
                  {isLogin ? 'Sign up' : 'Log in'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
