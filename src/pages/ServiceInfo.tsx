import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion } from 'motion/react';
import { ArrowLeft, CheckCircle, Info, Shield, Clock, IndianRupee, FileText } from 'lucide-react';

export default function ServiceInfo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchService = async () => {
      if (!id) return;
      const snap = await getDoc(doc(db, 'services', id));
      if (snap.exists()) setService({ id: snap.id, ...snap.data() });
      setLoading(false);
    };
    fetchService();
  }, [id]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading Service Profile...</p>
    </div>
  );

  if (!service) return (
    <div className="text-center py-20">
      <h2 className="text-2xl font-bold text-slate-800">Resource Offline</h2>
      <button onClick={() => navigate('/user')} className="mt-4 text-indigo-600 underline">Return to Marketplace</button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition-all group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to All Services
      </button>

      <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-2xl shadow-slate-100 ring-1 ring-slate-100">
        <div className="h-32 bg-indigo-600 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Info className="w-48 h-48" />
          </div>
          <div className="absolute bottom-0 left-0 p-8">
             <div className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-[10px] font-black uppercase tracking-widest">
                Service Identity: {service.id.slice(0, 8)}
             </div>
          </div>
        </div>

        <div className="p-10 space-y-8 text-center sm:text-left">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4">{service.title}</h2>
            <p className="text-lg text-slate-500 leading-relaxed max-w-2xl">{service.description}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                <IndianRupee className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Fee</p>
                <p className="text-xl font-black text-slate-900 tracking-tight">₹{service.price}</p>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Timeline</p>
                <p className="text-xl font-black text-slate-900 tracking-tight">3-5 Days</p>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Access</p>
                <p className="text-xl font-black text-slate-900 tracking-tight">Verified</p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-8">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" /> Pre-requisite Documents
            </h4>
            <div className="flex flex-wrap gap-3">
              {service.requiredDocuments.map((rd: string, i: number) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm group hover:border-indigo-600 transition-all">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-bold text-slate-700">{rd}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-10 flex flex-col sm:flex-row gap-4">
            {service.isActive ? (
              <Link
                to={`/service/apply/${service.id}`}
                className="flex-1 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-xl text-center shadow-2xl shadow-slate-200 hover:bg-indigo-600 transition-all active:scale-95"
              >
                Start Application
              </Link>
            ) : (
              <button
                disabled
                className="flex-1 py-5 bg-slate-100 text-slate-400 rounded-[2rem] font-black text-xl text-center cursor-not-allowed border border-slate-200"
              >
                Service Unavailable
              </button>
            )}
            <button 
              className="px-8 py-5 bg-slate-100 text-slate-600 rounded-[2rem] font-bold hover:bg-slate-200 transition-all"
              onClick={() => navigate(-1)}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
