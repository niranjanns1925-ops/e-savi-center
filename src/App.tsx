import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import LandingPage from './pages/LandingPage';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';
import ServiceDetails from './pages/ServiceDetails';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

import ProfilePage from './pages/ProfilePage';
import ServiceInfo from './pages/ServiceInfo';

function PrivateRoute({ children, roleRequired }: { children: React.ReactNode, roleRequired?: 'admin' | 'user' }) {
  const { user, role, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-screen font-bold text-indigo-600">Initializing Secure Session...</div>;
  if (!user) return <Navigate to="/" />;
  if (roleRequired && role !== roleRequired) return <Navigate to="/" />;

  return <>{children}</>;
}

function AppContent() {
  const { role, user } = useAuth();
  
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <div className="flex flex-1 overflow-hidden">
          {user && role && <Sidebar role={role} />}
          <main className="flex-1 overflow-y-auto px-4 py-8 lg:px-8">
            <div className="container mx-auto">
              <Routes>
                <Route path="/" element={role ? (role === 'admin' ? <Navigate to="/admin" /> : <Navigate to="/user" />) : <LandingPage />} />
                
                <Route path="/admin/*" element={
                  <PrivateRoute roleRequired="admin">
                    <AdminDashboard />
                  </PrivateRoute>
                } />
                
                <Route path="/user/*" element={
                  <PrivateRoute roleRequired="user">
                    <UserDashboard />
                  </PrivateRoute>
                } />
                
                <Route path="/profile" element={
                  <PrivateRoute>
                    <ProfilePage />
                  </PrivateRoute>
                } />
                
                <Route path="/service/:id" element={
                  <PrivateRoute roleRequired="user">
                    <ServiceInfo />
                  </PrivateRoute>
                } />

                <Route path="/service/apply/:id" element={
                  <PrivateRoute roleRequired="user">
                    <ServiceDetails />
                  </PrivateRoute>
                } />
              </Routes>
            </div>
          </main>
        </div>
        <footer className="h-8 bg-slate-900 text-slate-400 px-6 flex items-center justify-between text-[10px] font-medium shrink-0">
          <div className="flex items-center gap-4 uppercase tracking-wider">
            <span className="flex items-center gap-1.5 font-bold">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> 
              System Secure
            </span>
            <span className="opacity-60">AES-256 Encrypted</span>
            <span className="opacity-60">FIPS 140-2 Compliant</span>
          </div>
          <div className="uppercase tracking-widest opacity-80">&copy; 2026 Lakshmi E-Sevai Maiyam. Citizen Portal v2.4.0</div>
        </footer>
      </div>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
