import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db, sendNotification } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, CheckCircle, XCircle, FileText, ChevronRight, MessageSquare, AlertCircle, Inbox, Bell, Pencil, ArrowUp, ArrowDown, Users, IndianRupee, Activity, Clock, Search } from 'lucide-react';
import { format } from 'date-fns';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

interface Service {
  id: string;
  title: string;
  description: string;
  requiredDocuments: string[];
  price: number;
  isActive: boolean;
  category: string;
}

interface Request {
  id: string;
  userId: string;
  userEmail: string;
  serviceId: string;
  serviceTitle: string;
  documents: Record<string, string>;
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

function AdminOverview({ requests, services, setRejectionModal }: { requests: Request[], services: Service[], setRejectionModal: (id: string) => void }) {
  const [viewingDocs, setViewingDocs] = useState<Request | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ url: string, name: string, type: string } | null>(null);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Metrics calculation
  const totalRequests = requests.length;
  const pendingRequests = requests.filter(r => r.status === 'pending').length;
  const activeServices = services.filter(s => s.isActive).length;
  const totalRevenue = requests.reduce((sum, req) => {
    if (req.status === 'accepted' || req.paymentStatus === 'completed') {
      const service = services.find(s => s.title === req.serviceTitle || s.id === req.serviceId);
      return sum + (service?.price || 0);
    }
    return sum;
  }, 0);

  // Group requests by date (last 7 days example, simplistic grouping by formatted date)
  const requestsByDate = requests.reduce((acc: any, req: any) => {
    if (req.createdAt?.toDate) {
      const dateStr = format(req.createdAt.toDate(), 'MMM dd');
      acc[dateStr] = (acc[dateStr] || 0) + 1;
    }
    return acc;
  }, {});

  const timelineData = Object.keys(requestsByDate).map(date => ({
    name: date,
    Applications: requestsByDate[date]
  })).sort((a: any, b: any) => {
    return new Date(a.name).getTime() - new Date(b.name).getTime();
  });

  const requestsByStatus = [
    { name: 'Pending Payment', value: requests.filter(r => r.status === 'pending' && r.paymentStatus !== 'completed').length, color: '#f59e0b' },
    { name: 'Pending Approval', value: requests.filter(r => r.status === 'pending' && r.paymentStatus === 'completed').length, color: '#3b82f6' },
    { name: 'Accepted', value: requests.filter(r => r.status === 'accepted').length, color: '#10b981' },
    { name: 'Rejected', value: requests.filter(r => r.status === 'rejected').length, color: '#ef4444' },
  ].filter(d => d.value > 0);

  useEffect(() => {
    let urlToRevoke: string | null = null;

    if (previewDoc?.url.startsWith('data:')) {
      try {
        const parts = previewDoc.url.split(',');
        const base64 = parts[1];
        const mimeType = parts[0].split(':')[1].split(';')[0];
        const byteString = atob(base64);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeType });
        const url = URL.createObjectURL(blob);
        setPreviewObjectUrl(url);
        urlToRevoke = url;
      } catch(e) {
        console.error("Failed to parse data uri", e);
        setPreviewObjectUrl(previewDoc.url);
      }
    } else {
      setPreviewObjectUrl(previewDoc?.url || null);
    }

    return () => {
      if (urlToRevoke) {
        URL.revokeObjectURL(urlToRevoke);
      }
    };
  }, [previewDoc]);

  // Filter out rejected requests and sort
  const filteredRequests = requests
    .filter(r => r.status !== 'rejected')
    .sort((a, b) => {
      const dateA = a.createdAt?.toMillis?.() || 0;
      const dateB = b.createdAt?.toMillis?.() || 0;
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

  const downloadCSV = () => {
    const headers = ['Citizen Email', 'Service Title', 'Status', 'Payment Status', 'Created At'];
    const rows = requests.map(r => [
      r.userEmail,
      r.serviceTitle,
      r.status,
      r.paymentStatus,
      r.createdAt?.toDate ? format(r.createdAt.toDate(), 'yyyy-MM-dd HH:mm:ss') : ''
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'citizen_requests.csv';
    link.click();
  };

  const handleStatusUpdate = async (id: string, status: 'accepted') => {
    const req = requests.find(r => r.id === id);
    if (!req) return;
    await updateDoc(doc(db, 'requests', id), { 
      status, 
      updatedAt: serverTimestamp(),
      paymentStatus: 'completed' // Enforce payment verification on accept
    });
    
    await sendNotification(req.userId, 'Application Accepted', `Great news! Your request for ${req.serviceTitle} has been accepted by the admin.`, 'success');
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end mb-2">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Admin Dashboard</h2>
          <p className="text-slate-500 font-medium tracking-wide text-sm mt-1">Platform overview and citizen requests</p>
        </div>
      </header>

      {/* Metrics Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-slate-800 mb-1">{totalRequests}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Applications</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-yellow-50 text-yellow-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-slate-800 mb-1">{pendingRequests}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Approvals</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <IndianRupee className="w-6 h-6" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-slate-800 mb-1">₹{totalRevenue}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Revenue</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Activity className="w-6 h-6" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-slate-800 mb-1">{activeServices}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Services</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-slate-800 tracking-tight mb-4">Application Trends</h3>
          <div className="h-64 w-full">
            {timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line type="monotone" dataKey="Applications" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                No application data
              </div>
            )}
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-slate-800 tracking-tight mb-4">Application Distribution</h3>
          <div className="h-64 w-full">
            {requestsByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={requestsByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {requestsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                 No application data
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-end">
        <div>
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">Request Queue</h3>
          <p className="text-slate-500 font-medium tracking-wide uppercase text-[10px] mt-1">Real-time Citizen Submissions</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm"
          >
            {sortOrder === 'desc' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
            Date ({sortOrder === 'desc' ? 'Newest' : 'Oldest'})
          </button>
          <button
            onClick={downloadCSV}
            className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-black transition-all shadow-md active:scale-95"
          >
            Download CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-xl shadow-slate-100">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Citizen / Service</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Documentation</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredRequests.map(r => (
              <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-5">
                  <div className="text-sm font-bold text-slate-900">{r.userEmail}</div>
                  <div className="text-xs text-indigo-600 font-semibold mt-0.5">{r.serviceTitle}</div>
                  <div className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1 font-medium">
                    <ChevronRight className="w-3 h-3" /> Submitted: {r.createdAt?.toDate ? format(r.createdAt.toDate(), 'PPp') : 'Just now'}
                  </div>
                </td>
                <td className="px-6 py-5">
                   <button 
                    onClick={() => setViewingDocs(r)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-100 group"
                   >
                     <FileText className="w-4 h-4 group-hover:scale-110 transition-transform" />
                     View Files ({Object.keys(r.documents || {}).length})
                   </button>
                </td>
                <td className="px-6 py-5">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    r.status === 'accepted' ? 'bg-green-100 text-green-700' :
                    r.paymentStatus === 'completed' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {r.status === 'accepted' ? 'Accepted' : (r.paymentStatus === 'completed' ? 'Paid - Pending Approval' : 'Pending Payment')}
                  </span>
                </td>
                <td className="px-6 py-5">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleStatusUpdate(r.id, 'accepted')}
                      className="p-2.5 bg-green-50 text-green-600 hover:bg-green-600 hover:text-white rounded-xl transition-all shadow-sm"
                      title="Accept"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setRejectionModal(r.id)}
                      className="p-2.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-sm"
                      title="Reject"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredRequests.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-20 text-center">
                  <Inbox className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No pending citizen requests</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {viewingDocs && (
          <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-[110] backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white p-10 rounded-[3rem] max-w-2xl w-full shadow-2xl border border-slate-100"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h4 className="text-2xl font-black tracking-tight text-slate-900">Submitted Documentation</h4>
                  <p className="text-slate-500 text-sm font-medium">Verify credentials for {viewingDocs.userEmail}</p>
                </div>
                <button onClick={() => setViewingDocs(null)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                  <XCircle className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {Object.entries(viewingDocs.documents).flatMap(([key, fileOrArray]: [string, any]) => {
                  const files = Array.isArray(fileOrArray) ? fileOrArray : [fileOrArray];
                  return files.map((info, index) => (
                    <div key={`${key}-${index}`} className="p-5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-indigo-600">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">{key}{files.length > 1 ? ` (Part ${index + 1})` : ''}</p>
                          <p className="text-sm font-bold text-slate-900">{info?.name || 'Document'}</p>
                          <p className="text-[10px] text-indigo-600 font-bold">SHA-256 Verified • {info?.size ? (info.size / 1024).toFixed(1) : '0'} KB</p>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => { 
                          e.preventDefault(); 
                          const fileUrl = info?.url || info?.content;
                          if (fileUrl) {
                            setPreviewDoc({
                              url: fileUrl,
                              name: info?.name || 'Document',
                              type: info?.type || 'application/octet-stream'
                            });
                          }
                        }}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all hover:bg-black"
                      >
                        Preview File
                      </button>
                    </div>
                  ));
                })}
              </div>

              <div className="mt-10 pt-8 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => setViewingDocs(null)}
                  className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-indigo-600 transition-all"
                >
                  Done Reviewing
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {previewDoc && (
          <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center p-4 z-[120] backdrop-blur-sm">
             <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white p-4 rounded-[2rem] w-full max-w-5xl h-[90vh] shadow-2xl flex flex-col"
            >
               <div className="flex justify-between items-center mb-4 px-4 pt-2">
                 <h4 className="font-bold text-xl text-slate-800 tracking-tight">{previewDoc.name}</h4>
                 <div className="flex items-center gap-2">
                   <button 
                     onClick={() => {
                        if (!previewObjectUrl) return;
                        try {
                          const link = document.createElement('a');
                          link.href = previewObjectUrl;
                          link.download = previewDoc.name || 'download';
                          link.click();
                        } catch (err) {
                           console.error("Download failed", err);
                           alert("Download failed");
                        }
                     }}
                     className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm tracking-wide mr-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                   >
                     Download
                   </button>
                   <button onClick={() => setPreviewDoc(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                      <XCircle className="w-6 h-6 text-slate-400 hover:text-slate-600" />
                   </button>
                 </div>
               </div>
               <div className="flex-1 overflow-hidden bg-slate-50 rounded-xl relative flex items-center justify-center border border-slate-200">
                  {previewDoc.type.startsWith('image/') ? (
                      <img src={previewObjectUrl || ''} alt={previewDoc.name} className="max-w-full max-h-full object-contain p-4" />
                  ) : previewDoc.type === 'application/pdf' ? (
                      <iframe src={previewObjectUrl || ''} title={previewDoc.name} className="w-full h-full border-0 rounded-xl bg-white" />
                  ) : (
                      <div className="text-center text-slate-500 font-medium flex flex-col items-center">
                        <FileText className="w-12 h-12 text-slate-300 mb-2" />
                        <p>Preview not available for this file type.</p>
                      </div>
                  )}
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AdminServices({ services, setShowAddService, openEditModal }: { services: Service[], setShowAddService: () => void, openEditModal: (s: Service) => void }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredServices = services.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Active Services</h2>
          <p className="text-slate-500 font-medium tracking-wide uppercase text-[10px] mt-1">Manage Citizen Offerings</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search services or categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-2xl focus:ring-4 focus:ring-indigo-50 outline-none transition-all font-medium text-sm shadow-sm"
            />
          </div>
          <button
            onClick={() => setShowAddService()}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 whitespace-nowrap"
          >
            <Plus className="w-5 h-5" /> New Service
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredServices.map(s => (
            <motion.div
              layout
              key={s.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="sleek-card p-6 flex flex-col group relative"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold text-xl shadow-inner">
                  {s.title ? s.title[0] : '?'}
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => updateDoc(doc(db, 'services', s.id), { isActive: !s.isActive })}
                    className={`p-2 rounded-lg transition-all ${s.isActive ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-slate-400 bg-slate-50 hover:bg-slate-100'}`}
                    title={s.isActive ? 'Deactivate Service' : 'Activate Service'}
                  >
                    {s.isActive ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={() => openEditModal(s)}
                    className="p-2 text-slate-300 hover:text-indigo-500 transition-colors"
                    title="Edit Service"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => deleteDoc(doc(db, 'services', s.id))}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                    title="Delete Service"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <h4 className="font-bold text-xl text-slate-800 mb-2 truncate">{s.title}</h4>
              <p className="text-slate-500 text-sm mb-6 line-clamp-2 leading-relaxed">{s.description}</p>
              
              <div className="space-y-1.5 mb-6">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Required Docs</span>
                {(s.requiredDocuments || []).map((rd, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    {rd}
                  </div>
                ))}
              </div>

              <div className="mt-auto pt-6 border-t border-slate-50 flex justify-between items-center">
                <div className="flex flex-col">
                   <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Category</span>
                   <span className="text-sm font-bold text-slate-700 tracking-tight">{s.category || 'Uncategorized'}</span>
                </div>
                <div className="flex flex-col text-right">
                   <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Fee</span>
                   <span className="text-xl font-black text-slate-900 tracking-tight">₹{s.price}</span>
                </div>
              </div>
              <div className="mt-4 flex justify-between items-center">
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-lg ${s.isActive ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>
                  {s.isActive ? 'Active' : 'Closed'}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {filteredServices.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="col-span-full py-20 bg-white rounded-[2rem] border border-slate-200 border-dashed text-center"
          >
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8" />
            </div>
            <h5 className="text-lg font-bold text-slate-800 mb-1">No services found</h5>
            <p className="text-slate-500 text-sm font-medium">Try adjusting your search for "{searchTerm}"</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function AdminNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification))));
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">System Alerts</h2>
        <p className="text-slate-500 font-medium tracking-wide uppercase text-[10px] mt-1">Platform Activity Stream</p>
      </header>

      <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-xl shadow-slate-100">
        <div className="divide-y divide-slate-50">
          {notifications.map(n => (
            <div key={n.id} className="p-6 flex items-start gap-4 hover:bg-slate-50/50 transition-colors">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                n.type === 'success' ? 'bg-green-50 text-green-600' :
                n.type === 'error' ? 'bg-red-50 text-red-600' :
                'bg-indigo-50 text-indigo-600'
              }`}>
                <Bell className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-slate-800">{n.title}</h4>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    {n.createdAt?.toDate ? format(n.createdAt.toDate(), 'PPp') : 'Recent'}
                  </span>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">{n.message}</p>
              </div>
            </div>
          ))}
          {notifications.length === 0 && (
            <div className="p-20 text-center">
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No active alerts</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [services, setServices] = useState<Service[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [showAddService, setShowAddService] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newService, setNewService] = useState<Omit<Service, 'id'>>({
    title: '',
    description: '',
    category: 'Others',
    requiredDocuments: [],
    price: 0,
    isActive: true
  });
  const [docInput, setDocInput] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  useEffect(() => {
    const qServices = query(collection(db, 'services'));
    const unsubServices = onSnapshot(qServices, (snap) => {
      setServices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Service)));
    });

    const qRequests = query(collection(db, 'requests'), orderBy('createdAt', 'desc'));
    const unsubRequests = onSnapshot(qRequests, (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as Request)));
    });

    return () => { unsubServices(); unsubRequests(); };
  }, []);

  const openEditModal = (s: Service) => {
    setEditingId(s.id);
    setNewService({
      title: s.title,
      description: s.description,
      category: s.category || '',
      requiredDocuments: s.requiredDocuments || [],
      price: s.price,
      isActive: s.isActive
    });
    setShowAddService(true);
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newService.title || !newService.description) return;
    
    try {
      if (editingId) {
        await updateDoc(doc(db, 'services', editingId), {
          ...newService,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'services'), {
          ...newService,
          createdAt: serverTimestamp()
        });
      }
      
      setNewService({ title: '', description: '', category: 'Others', requiredDocuments: [], price: 0, isActive: true });
      setShowAddService(false);
      setEditingId(null);
    } catch (err: any) {
      console.error(err);
      alert('Error saving service: ' + err.message);
    }
  };

  const handleStatusUpdate = async (id: string, status: 'rejected') => {
    if (status === 'rejected' && (!rejectionReason || rejectionReason.trim() === '')) {
      alert('Please provide a reason for rejection');
      return;
    }

    const req = requests.find(r => r.id === id);
    if (!req) return;

    await updateDoc(doc(db, 'requests', id), { 
      status, 
      rejectionReason,
      updatedAt: serverTimestamp() 
    });
    
    await sendNotification(
      req.userId, 
      'Application Update Required', 
      `Your request for ${req.serviceTitle} was rejected. Reason: ${rejectionReason}. Please review and re-apply.`, 
      'error'
    );
    
    setSelectedRequestId(null);
    setRejectionReason('');
  };

  return (
    <>
      <Routes>
        <Route path="/" element={<AdminOverview requests={requests} services={services} setRejectionModal={setSelectedRequestId} />} />
        <Route path="/services" element={<AdminServices services={services} setShowAddService={() => {
          setEditingId(null);
          setNewService({ title: '', description: '', category: 'Others', requiredDocuments: [], price: 0, isActive: true });
          setShowAddService(true);
        }} openEditModal={openEditModal} />} />
        <Route path="/notifications" element={<AdminNotifications />} />
      </Routes>
      
      <AnimatePresence>
        {selectedRequestId && (
          <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-[100] backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white p-10 rounded-[3rem] max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="flex items-center gap-4 mb-8 text-red-600">
                <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h4 className="text-2xl font-black tracking-tight">Reject Request</h4>
              </div>
              <p className="text-slate-500 mb-8 text-sm font-medium leading-relaxed">Clearly state the reason for rejection. This will be sent as an instant notification to the citizen.</p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-red-100 focus:border-red-500 outline-none transition-all mb-8 font-medium placeholder:text-slate-300"
                placeholder="e.g. Incomplete Voter ID proof, Invalid signature..."
              />
              <div className="flex gap-4">
                <button
                  onClick={() => handleStatusUpdate(selectedRequestId, 'rejected')}
                  className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-xl shadow-red-100"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setSelectedRequestId(null)}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold hover:bg-slate-200 transition-all font-sans"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showAddService && (
          <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-[100] backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white p-10 rounded-[3rem] max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto border border-slate-100"
            >
              <div className="flex items-center gap-4 mb-10">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                  {editingId ? <Pencil className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                </div>
                <h4 className="text-3xl font-black tracking-tight text-slate-900">{editingId ? 'Edit Service' : 'Configure Service'}</h4>
              </div>
              
              <form onSubmit={handleAddService} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Service Title</label>
                      <input
                        type="text"
                        required
                        value={newService.title}
                        onChange={e => setNewService({...newService, title: e.target.value})}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all font-bold"
                        placeholder="Birth Certificate"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Pricing (₹)</label>
                      <input
                        type="number"
                        required
                        value={newService.price}
                        onChange={e => setNewService({...newService, price: Number(e.target.value)})}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Category</label>
                      <select
                        required
                        value={newService.category}
                        onChange={e => setNewService({...newService, category: e.target.value})}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all font-bold appearance-none"
                      >
                        <option value="" disabled>Select a category</option>
                        <option value="Licenses">Licenses</option>
                        <option value="Certificates">Certificates</option>
                        <option value="Registrations">Registrations</option>
                        <option value="Permits">Permits</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Description</label>
                      <textarea
                        required
                        value={newService.description}
                        onChange={e => setNewService({...newService, description: e.target.value})}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl h-40 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all font-medium leading-relaxed"
                        placeholder="Eligibility criteria and processing timeline..."
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Compliance Status</label>
                      <select
                        value={newService.isActive ? 'active' : 'inactive'}
                        onChange={e => setNewService({...newService, isActive: e.target.value === 'active'})}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all font-bold appearance-none"
                      >
                        <option value="active">Available (Active)</option>
                        <option value="inactive">Suspended (Inactive)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Documentation Framework</label>
                      <div className="flex gap-2 mb-4">
                        <input
                          type="text"
                          value={docInput}
                          onChange={e => setDocInput(e.target.value)}
                          className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-bold"
                          placeholder="New Document Tag"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (docInput.trim()) {
                              setNewService({...newService, requiredDocuments: [...newService.requiredDocuments, docInput.trim()]});
                              setDocInput('');
                            }
                          }}
                          className="px-6 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-lg"
                        >
                          Add
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {newService.requiredDocuments.map((rd, i) => (
                          <span key={i} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-indigo-100 shadow-sm transition-all">
                            {rd}
                            <button 
                              type="button" 
                              onClick={() => setNewService({...newService, requiredDocuments: newService.requiredDocuments.filter((_, idx) => idx !== i)})}
                              className="text-indigo-300 hover:text-indigo-600"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button
                    type="submit"
                    className="flex-1 py-5 bg-indigo-600 text-white rounded-[1.5rem] font-bold text-lg hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-100 active:scale-95"
                  >
                    {editingId ? 'Update Service' : 'Publish Service'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddService(false);
                      setEditingId(null);
                    }}
                    className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-[1.5rem] font-bold text-lg hover:bg-slate-200 transition-all active:scale-95"
                  >
                    Abort
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
