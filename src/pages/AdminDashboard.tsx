import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db, sendNotification } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, CheckCircle, XCircle, FileText, ChevronRight, MessageSquare, AlertCircle, Inbox, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';

interface Service {
  id: string;
  title: string;
  description: string;
  requiredDocuments: string[];
  price: number;
  isActive: boolean;
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

  // Filter out rejected requests
  const filteredRequests = requests.filter(r => r.status !== 'rejected');

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
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Request Queue</h2>
          <p className="text-slate-500 font-medium tracking-wide uppercase text-[10px] mt-1">Real-time Citizen Submissions</p>
        </div>
        <button
          onClick={downloadCSV}
          className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-black transition-all shadow-xl"
        >
          Download All Data
        </button>
      </header>

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
                      <a 
                        href="#" 
                        onClick={async (e) => { 
                          e.preventDefault(); 
                          try {
                            const fileUrl = info?.url || info?.content;
                            if (!fileUrl) {
                              throw new Error("No URL found for file.");
                            }
                            const blob = await fetch(fileUrl).then(r => r.blob());
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = info?.name || 'download';
                            link.click();
                            URL.revokeObjectURL(url);
                          } catch (err) {
                             console.error("Download failed", err);
                             alert("Download failed");
                          }
                        }}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all hover:bg-black"
                      >
                        Download File
                      </a>
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
    </div>
  );
}

function AdminServices({ services, setShowAddService }: { services: Service[], setShowAddService: (v: boolean) => void }) {
  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Active Services</h2>
          <p className="text-slate-500 font-medium tracking-wide uppercase text-[10px] mt-1">Manage Citizen Offerings</p>
        </div>
        <button
          onClick={() => setShowAddService(true)}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
        >
          <Plus className="w-5 h-5" /> New Service
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {services.map(s => (
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
                    onClick={() => deleteDoc(doc(db, 'services', s.id))}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
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
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Fee</span>
                  <span className="text-xl font-black text-slate-900 tracking-tight">₹{s.price}</span>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-lg ${s.isActive ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>
                  {s.isActive ? 'Active' : 'Closed'}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
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
  const [newService, setNewService] = useState<Omit<Service, 'id'>>({
    title: '',
    description: '',
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

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newService.title || !newService.description) return;
    await addDoc(collection(db, 'services'), {
      ...newService,
      createdAt: serverTimestamp()
    });
    setNewService({ title: '', description: '', requiredDocuments: [], price: 0, isActive: true });
    setShowAddService(false);
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
        <Route path="/services" element={<AdminServices services={services} setShowAddService={setShowAddService} />} />
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
                  <Plus className="w-6 h-6" />
                </div>
                <h4 className="text-3xl font-black tracking-tight text-slate-900">Configure Service</h4>
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
                    Publish Service
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddService(false)}
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
