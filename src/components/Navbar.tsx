import { LogOut, User as UserIcon, Shield } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { motion } from 'motion/react';
import { Logo } from './Logo';

export default function Navbar() {
  const { user, role, logOut, signIn, register } = useAuth();

  return (
    <nav className="h-16 bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="container mx-auto px-6 h-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo className="w-10 h-10" />
          <h1 className="text-xl font-bold tracking-tight text-slate-800 hidden sm:block">
            Lakshmi <span className="text-indigo-600">E-Sevai</span> Maiyam
          </h1>
          <h1 className="text-xl font-bold tracking-tight text-slate-800 sm:hidden">
            L-ESM
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end leading-tight hidden text-right sm:flex">
                  <span className="text-sm font-semibold text-slate-800">{user.displayName || 'User'}</span>
                  <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{user.email}</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-indigo-50 flex items-center justify-center overflow-hidden">
                  <img 
                    src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} 
                    alt="avatar" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <button
                onClick={logOut}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={signIn}
                className="px-6 py-2 text-slate-600 font-bold text-sm hover:text-slate-900 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={register}
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
              >
                Register
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
