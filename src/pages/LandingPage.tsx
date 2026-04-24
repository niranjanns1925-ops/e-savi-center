import { motion } from 'motion/react';
import { useAuth } from '../lib/AuthContext';
import { FileText, CreditCard, Bell, ShieldCheck } from 'lucide-react';

export default function LandingPage() {
  const { signIn } = useAuth();

  const features = [
    { icon: <FileText className="w-6 h-6" />, title: 'Simple Documentation', desc: 'Easily upload required documents for various government services.' },
    { icon: <CreditCard className="w-6 h-6" />, title: 'Secure Payment', desc: 'Integrated QR payment for quick and verifiable transactions.' },
    { icon: <Bell className="w-6 h-6" />, title: 'Live Updates', desc: 'Get real-time notifications on your service request status.' },
    { icon: <ShieldCheck className="w-6 h-6" />, title: 'Encrypted & Secure', desc: 'Your data is protected with end-to-end security protocols.' },
  ];

  return (
    <div className="flex flex-col items-center text-center py-20 px-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-4xl"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold uppercase tracking-widest mb-8">
          <ShieldCheck className="w-3.5 h-3.5" /> Trusted by 1M+ Citizens
        </div>
        <h1 className="text-6xl font-extrabold text-slate-900 mb-8 tracking-tight leading-[1.1]">
          Seamless Digital Services for <span className="text-indigo-600">Modern India</span>
        </h1>
        <p className="text-xl text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed">
          Access all essential government services from a single dashboard. Secure, lightning-fast, and citizen-first.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-24">
          <button
            onClick={signIn}
            className="w-full sm:w-auto px-10 py-5 bg-indigo-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all"
          >
            Launch Dashboard
          </button>
          <button className="w-full sm:w-auto px-10 py-5 bg-white text-slate-700 border border-slate-200 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-all shadow-sm active:scale-95">
            How it works
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl">
        {features.map((f, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-8 bg-white rounded-[2rem] shadow-sm border border-slate-100 text-left hover:border-indigo-300 hover:shadow-lg transition-all group"
          >
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-inner">
              {f.icon}
            </div>
            <h3 className="font-bold text-xl mb-3 text-slate-800">{f.title}</h3>
            <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
