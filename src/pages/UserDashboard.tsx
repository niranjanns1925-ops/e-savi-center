import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, where, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Search, FileText, CheckCircle, XCircle, Grid, ChevronRight, Bell, Inbox, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { Link, Routes, Route } from 'react-router-dom';

interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  requiredDocuments: string[];
}

interface Request {
  id: string;
  serviceId: string;
  serviceTitle: string;
  status: 'pending' | 'accepted' | 'rejected';
  rejectionReason?: string;
  paymentStatus: 'pending' | 'completed';
  createdAt: any;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: any;
}

function UserOverview({ services }: { services: Service[] }) {
  const [search, setSearch] = useState('');
  const filteredServices = services.filter(s => s.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">E-Service Marketplace</h2>
          <p className="text-slate-500 font-medium tracking-wide uppercase text-[10px] mt-1">Official Citizen Portal Services</p>
        </div>
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search for a service..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all shadow-sm font-medium text-sm"
          />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredServices.map((s: any) => (
            <motion.div
              layout
              key={s.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`sleek-card p-6 flex flex-col group border-l-4 relative ${s.isActive ? 'border-l-transparent hover:border-l-indigo-600' : 'border-l-slate-200 grayscale opacity-70'}`}
            >
              {!s.isActive && (
                <div className="absolute top-4 right-4 bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-lg">
                  Inactive
                </div>
              )}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${s.isActive ? 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white' : 'bg-slate-100 text-slate-400'}`}>
                <Grid className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-xl text-slate-800 mb-2 truncate">{s.title}</h4>
              <p className="text-slate-500 text-sm mb-6 line-clamp-2 leading-relaxed">{s.description}</p>
              
              <div className="mt-auto pt-6 border-t border-slate-50 flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">Fee Starts from</span>
                  <span className="text-xl font-black text-slate-900 tracking-tight">₹{s.price}</span>
                </div>
                <Link
                  to={`/service/${s.id}`}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${s.isActive ? 'bg-slate-900 text-white hover:bg-indigo-600' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                >
                  View Details
                </Link>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {filteredServices.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-[2rem] border border-dashed border-slate-200">
            <Inbox className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-bold text-sm">No services matched your search</p>
          </div>
        )}
      </div>
    </div>
  );
}

function UserRequests({ requests }: { requests: Request[] }) {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Application History</h2>
        <p className="text-slate-500 font-medium tracking-wide uppercase text-[10px] mt-1">Track Your Submission Status</p>
      </header>

      <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-xl shadow-slate-100">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Service Concept</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Current Path</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {requests.map(r => (
              <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-5">
                  <div className="text-sm font-bold text-slate-900">{r.serviceTitle}</div>
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-medium italic">
                    Applied: {r.createdAt?.toDate ? format(r.createdAt.toDate(), 'PP') : 'Today'}
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    r.status === 'accepted' ? 'bg-green-100 text-green-700' :
                    r.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {r.status === 'pending' && <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />}
                    {r.status}
                  </span>
                </td>
                <td className="px-6 py-5">
                  {r.status === 'rejected' ? (
                    <div className="flex items-start gap-2 max-w-xs">
                      <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-600 font-medium line-clamp-2">{r.rejectionReason}</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                       <ShieldCheck className="w-4 h-4 text-green-500" />
                       <span className="text-xs text-slate-500 font-semibold tracking-tight">Verified by Admin</span>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-20 text-center">
                  <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No applications found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'), 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snap) => setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification))));
  }, [user]);

  const markRead = async (id: string) => {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">My Notifications</h2>
        <p className="text-slate-500 font-medium tracking-wide uppercase text-[10px] mt-1">Updates on Your Service Requests</p>
      </header>

      <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-xl shadow-slate-100">
        <div className="divide-y divide-slate-50">
          {notifications.map(n => (
            <div 
              key={n.id} 
              onClick={() => !n.read && markRead(n.id)}
              className={`p-6 flex items-start gap-4 hover:bg-slate-50/50 transition-colors cursor-pointer ${!n.read ? 'bg-indigo-50/30' : ''}`}
            >
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                n.type === 'success' ? 'bg-green-50 text-green-600' :
                n.type === 'error' ? 'bg-red-50 text-red-600' :
                'bg-indigo-50 text-indigo-600'
              }`}>
                {n.type === 'success' ? <CheckCircle className="w-5 h-5" /> : 
                 n.type === 'error' ? <XCircle className="w-5 h-5" /> : 
                 <Bell className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-bold ${n.read ? 'text-slate-600' : 'text-slate-900 underline decoration-indigo-200 underline-offset-4 font-black'}`}>
                      {n.title}
                    </h4>
                    {!n.read && <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />}
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    {n.createdAt?.toDate ? format(n.createdAt.toDate(), 'PP') : 'Just now'}
                  </span>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">{n.message}</p>
              </div>
            </div>
          ))}
          {notifications.length === 0 && (
            <div className="p-20 text-center">
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No notifications available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UserDashboard() {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);

  useEffect(() => {
    const qServices = query(collection(db, 'services'));
    const unsubServices = onSnapshot(qServices, (snap) => {
      setServices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Service)));
    });

    if (user) {
      const qRequests = query(
        collection(db, 'requests'), 
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const unsubRequests = onSnapshot(qRequests, (snap) => {
        setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as Request)));
      });
      return () => { unsubServices(); unsubRequests(); };
    }

    return () => { unsubServices(); };
  }, [user]);

  return (
    <Routes>
      <Route path="/" element={<UserOverview services={services} />} />
      <Route path="/requests" element={<UserRequests requests={requests} />} />
      <Route path="/notifications" element={<UserNotifications />} />
    </Routes>
  );
}

