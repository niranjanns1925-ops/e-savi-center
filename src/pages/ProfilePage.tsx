import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { updateProfile } from 'firebase/auth';
import { Loader2, User, Mail, Camera } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setMessage('');
    
    try {
      await updateProfile(user, {
        displayName,
        photoURL
      });
      setMessage('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-slate-200">
      <h1 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
        <User className="w-6 h-6 text-indigo-600" />
        User Profile
      </h1>
      
      <div className="flex items-center gap-6 mb-8">
        <img 
          src={user.photoURL || 'https://ui-avatars.com/api/?name=' + (user.displayName || 'User')} 
          alt="Profile" 
          className="w-20 h-20 rounded-full border-4 border-indigo-50"
        />
        <div>
          <h2 className="text-lg font-bold text-slate-900">{user.displayName || 'No Display Name'}</h2>
          <p className="text-sm text-slate-500">{user.email}</p>
        </div>
      </div>
      
      <form onSubmit={handleUpdate} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Display Name</label>
          <input 
            type="text" 
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Photo URL</label>
          <div className="flex gap-2">
            <Camera className="w-10 h-10 p-2 bg-slate-100 rounded-xl text-slate-400" />
            <input 
              type="text" 
              value={photoURL}
              onChange={(e) => setPhotoURL(e.target.value)}
              className="flex-1 px-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="https://example.com/avatar.jpg"
            />
          </div>
        </div>
        
        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-5 h-5 animate-spin" />}
          Update Profile
        </button>
      </form>
      
      {message && (
        <p className={`mt-4 text-center font-semibold ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
