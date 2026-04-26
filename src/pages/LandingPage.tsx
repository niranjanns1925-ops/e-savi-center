import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../lib/AuthContext';
import { FileText, CreditCard, Bell, ShieldCheck, Mail, ArrowRight, Phone, MessageSquare } from 'lucide-react';
import { Logo } from '../components/Logo';
import { ConfirmationResult } from 'firebase/auth';

export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [authMode, setAuthMode] = useState<'google' | 'email' | 'phone'>('google');
  
  const { signIn, sendMagicLink, setupRecaptcha, signInPhone } = useAuth();

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    try {
      setIsSending(true);
      await sendMagicLink(email);
      setEmail('');
    } finally {
      setIsSending(false);
    }
  };

  const handlePhoneSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    try {
      setIsSending(true);
      const appVerifier = setupRecaptcha('recaptcha-container');
      const result = await signInPhone(phone, appVerifier);
      setConfirmationResult(result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !confirmationResult) return;
    try {
      setIsSending(true);
      await confirmationResult.confirm(otp);
    } catch (error) {
      alert("Invalid verification code. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

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
        className="max-w-4xl flex flex-col items-center"
      >
        <div className="mb-6 flex justify-center">
            <Logo className="w-32 h-32 drop-shadow-xl" />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold uppercase tracking-widest mb-8">
          <ShieldCheck className="w-3.5 h-3.5" /> Trusted by 1M+ Citizens
        </div>
        <h1 className="text-6xl font-extrabold text-slate-900 mb-8 tracking-tight leading-[1.1]">
          Seamless Digital Services for <span className="text-indigo-600">Modern India</span>
        </h1>
        <p className="text-xl text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed">
          Access all essential government services from a single dashboard. Secure, lightning-fast, and citizen-first.
        </p>
        <div className="flex flex-col gap-6 justify-center items-center mb-16 w-full max-w-lg mx-auto">
          <div className="flex bg-slate-100 p-1 rounded-xl w-full">
            <button 
              onClick={() => { setAuthMode('google'); setConfirmationResult(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${authMode === 'google' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Social
            </button>
            <button 
              onClick={() => { setAuthMode('email'); setConfirmationResult(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${authMode === 'email' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Magic Link
            </button>
            <button 
              onClick={() => { setAuthMode('phone'); setConfirmationResult(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${authMode === 'phone' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Phone
            </button>
          </div>

          {authMode === 'google' && (
            <button
              onClick={signIn}
              className="w-full px-8 py-5 bg-white text-slate-900 border-2 border-slate-200 rounded-2xl font-bold text-base shadow-sm hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              Continue with Google
            </button>
          )}

          {authMode === 'email' && (
            <form onSubmit={handleMagicLink} className="w-full relative group animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-14 pr-32 py-5 bg-white border-2 border-slate-200 rounded-[1.25rem] font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none transition-all shadow-sm"
                  required
                />
                <button
                  type="submit"
                  disabled={isSending}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 h-10 px-4 bg-indigo-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all"
                >
                  {isSending ? 'Sending...' : 'Send Link'}
                </button>
              </div>
            </form>
          )}

          {authMode === 'phone' && (
            <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
              {!confirmationResult ? (
                <form onSubmit={handlePhoneSignIn} className="w-full relative group">
                  <div className="relative">
                    <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                      type="tel" 
                      placeholder="+1 234 567 8900" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-14 pr-32 py-5 bg-white border-2 border-slate-200 rounded-[1.25rem] font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none transition-all shadow-sm"
                      required
                    />
                    <button
                      type="submit"
                      disabled={isSending}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 h-10 px-4 bg-indigo-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all"
                    >
                      {isSending ? 'Sending...' : 'Send OTP'}
                    </button>
                  </div>
                  <div id="recaptcha-container" className="mt-2"></div>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="w-full relative group">
                  <div className="relative">
                    <MessageSquare className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                      type="text" 
                      placeholder="6-digit code" 
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="w-full pl-14 pr-32 py-5 bg-white border-2 border-slate-200 rounded-[1.25rem] font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none transition-all shadow-sm"
                      maxLength={6}
                      required
                    />
                    <button
                      type="submit"
                      disabled={isSending}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 h-10 px-4 bg-indigo-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all"
                    >
                      {isSending ? 'Verifying...' : 'Verify'}
                    </button>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setConfirmationResult(null)}
                    className="mt-4 text-[10px] uppercase tracking-widest font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    ← Change phone number
                  </button>
                </form>
              )}
            </div>
          )}

          <p className="text-[10px] text-slate-400 font-medium text-center">
            {authMode === 'google' && "Fastest way to get started using your Google Account."}
            {authMode === 'email' && "No password required. We'll send a magic link to your inbox."}
            {authMode === 'phone' && "Standard SMS rates may apply for the verification code."}
          </p>
        </div>

        <motion.div
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ delay: 0.2, duration: 0.8 }}
           className="w-full max-w-5xl mx-auto rounded-[2.5rem] overflow-hidden shadow-2xl mb-24 border border-slate-200 relative group"
        >
          <img 
            src="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=1200" 
            alt="Digital Citizen Dashboard Overview" 
            className="w-full h-[400px] object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
          <div className="absolute bottom-8 left-8 text-left">
             <div className="inline-flex px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-[10px] font-bold uppercase tracking-widest mb-3">GovTech Portal</div>
             <p className="text-white font-bold text-2xl tracking-tight max-w-md">Streamlined document verification and digital workflows.</p>
          </div>
        </motion.div>
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
