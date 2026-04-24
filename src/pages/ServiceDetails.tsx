import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, sendNotification, storage } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG as QRCode } from 'qrcode.react'; 
import { Check, ArrowLeft, Loader2, ShieldCheck, ChevronRight, FileText, Smartphone, Upload, X, AlertCircle, IndianRupee, CheckCircle } from 'lucide-react';

export default function ServiceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'docs' | 'payment' | 'validation' | 'complete'>('docs');
  const [formData, setFormData] = useState<Record<string, File[]>>({});
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [validationError, setValidationError] = useState('');
  const [receipt, setReceipt] = useState<any>(null);
  const [isDragging, setIsDragging] = useState<string | null>(null);

  useEffect(() => {
    const fetchService = async () => {
      if (!id) return;
      const snap = await getDoc(doc(db, 'services', id));
      if (snap.exists()) {
        const data = snap.data();
        if (data.isActive === false) {
          navigate(`/service/${snap.id}`);
          return;
        }
        setService({ id: snap.id, ...data });
        // Initialize form data for required docs
        const initialDocs: Record<string, File[]> = {};
        data.requiredDocuments.forEach((d: string) => initialDocs[d] = []);
        setFormData(initialDocs);
      }
      setLoading(false);
    };
    fetchService();
  }, [id]);

  const validateFiles = (files: File[]): string | null => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    const maxSize = 5 * 1024 * 1024;

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        return `File type "${file.type}" not supported. Use PDF, JPG, or PNG.`;
      }
      if (file.size > maxSize) {
        return `File "${file.name}" is too large. Maximum size is 5MB.`;
      }
    }
    return null;
  };

  const handleFilesAdded = (docName: string, newFiles: FileList | null) => {
    if (!newFiles || newFiles.length === 0) return;
    
    const addedFiles = Array.from(newFiles);
    const error = validateFiles(addedFiles);
    
    if (error) {
      setFileErrors(prev => ({ ...prev, [docName]: error }));
      return;
    }

    setFileErrors(prev => ({ ...prev, [docName]: '' }));
    setFormData(prev => ({
      ...prev,
      [docName]: [...(prev[docName] || []), ...addedFiles]
    }));
  };

  const removeFile = (docName: string, index: number) => {
    setFormData(prev => ({
      ...prev,
      [docName]: prev[docName].filter((_, i) => i !== index)
    }));
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate all required categories have at least one file
    const missing = Object.entries(formData).some(([name, files]) => (files as File[]).length === 0);
    if (missing) {
      alert("Please upload at least one document for each required category.");
      return;
    }
    setStep('payment');
  };

  const handlePaymentConfirm = () => {
    setStep('validation');
  };

  const validateTransaction = async () => {
    setValidationError('');
    // Mock robust validation: Check if it's strictly 12 digits
    const utrRegex = /^[0-9]{12}$/;
    if (!transactionId.trim() || !utrRegex.test(transactionId.trim())) {
      setValidationError('Invalid Transaction ID. Please enter the valid 12-digit numeric UTR number.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (!service || !user) return;

      // Verify via backend API (Razorpay proxy)
      const response = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: transactionId.trim() })
      });
      const verification = await response.json();
      
      if (!verification.success) {
        throw new Error(verification.message);
      }

      const documentRefs: Record<string, any> = {};
      for (const [key, files] of Object.entries(formData)) {
        documentRefs[key] = await Promise.all((files as File[]).map(async f => {
          const storageRef = ref(storage, `esc/docs/${user.uid}/${Date.now()}_${f.name}`);
          const snapshot = await uploadBytes(storageRef, f);
          const downloadURL = await getDownloadURL(snapshot.ref);
          return {
            name: f.name,
            size: f.size,
            type: f.type,
            url: downloadURL, // Store URL instead of content!
            status: 'verified'
          };
        }));
      }

      const requestPayload = {
        userId: user.uid,
        userEmail: user.email,
        serviceId: service.id,
        serviceTitle: service.title,
        documents: documentRefs,
        status: 'pending',
        paymentStatus: 'completed',
        transactionId: transactionId,
        amountPaid: service.price,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      console.log("Request Payload:", requestPayload);
      await addDoc(collection(db, 'requests'), requestPayload);

      setReceipt({
        serviceName: service.title,
        amount: service.price,
        transactionId: transactionId,
        date: new Date().toLocaleString()
      });

      await sendNotification('admin', 'New Service Request', `${user.email} has applied for ${service.title}. Access the request queue to review documents.`, 'info');
      
      setStep('complete');
    } catch (err) {
      console.error("DEBUG: Firebase Error:", err);
      // Log the full error to help identify which field failed validation
      if (err instanceof Error) {
        console.error("Error Message:", err.message);
      }
      let errorMessage = "Failed to finalize application. Please try again.";
      if (err instanceof Error && err.message.includes('permission')) {
          errorMessage = "Permission Denied: You do not have sufficient permissions. Please verify your internet connection and authentication status.";
      }
      setValidationError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
      <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Initializing Secure Tunnels...</p>
    </div>
  );

  if (!service) return (
    <div className="text-center py-20">
      <h2 className="text-2xl font-bold text-slate-800">Resource Not Available</h2>
      <button onClick={() => navigate('/user')} className="mt-4 text-indigo-600 underline font-bold">Return to Console</button>
    </div>
  );

  // Progress Bar Steps Definition
  const upiId = "anish0934s@oksbi"; // Google Pay Merchant ID
  const upiUrl = `upi://pay?pa=${upiId}&pn=Lakshmi%20E-Sevai%20Maiyam&am=${service?.price || 0}&cu=INR&tn=ServiceFee_${service?.id}`;

  const steps = [
    { id: 'docs', label: 'Docs', icon: Upload },
    { id: 'payment', label: 'Payment', icon: IndianRupee },
    { id: 'validation', label: 'Verify', icon: ShieldCheck },
    { id: 'complete', label: 'Receipt', icon: CheckCircle }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === step);

  const onDragOver = (e: React.DragEvent, docName: string) => {
    e.preventDefault();
    setIsDragging(docName);
  };

  const onDragLeave = () => {
    setIsDragging(null);
  };

  const onDrop = (e: React.DragEvent, docName: string) => {
    e.preventDefault();
    setIsDragging(null);
    handleFilesAdded(docName, e.dataTransfer.files);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Dynamic Progress Bar */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-100 ring-1 ring-slate-100 mb-8 overflow-x-auto">
        <div className="flex justify-between items-center relative min-w-[500px]">
          {/* Background Line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 -translate-y-1/2 z-0 mx-10 hidden sm:block" />
          
          {/* Active Progress Line */}
          <motion.div 
            className="absolute top-1/2 left-0 h-0.5 bg-indigo-600 -translate-y-1/2 z-0 mx-10 hidden sm:block origin-left"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: currentStepIndex / (steps.length - 1) }}
            transition={{ duration: 0.5, ease: "circOut" }}
            style={{ width: 'calc(100% - 80px)' }}
          />

          {steps.map((s, i) => (
            <div key={s.id} className="relative z-10 flex flex-col items-center gap-3">
              <div 
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border-2 ${
                  i <= currentStepIndex 
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                    : 'bg-white border-slate-100 text-slate-300'
                }`}
              >
                <s.icon className={`w-5 h-5 ${i === currentStepIndex ? 'animate-pulse' : ''}`} />
              </div>
              <div className="flex flex-col items-center">
                <span className={`text-[10px] font-black uppercase tracking-widest ${i <= currentStepIndex ? 'text-slate-900' : 'text-slate-400'}`}>
                  {s.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <header className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-slate-900 transition-all shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">{service.title}</h2>
          <p className="text-slate-500 font-medium tracking-wide uppercase text-[10px] mt-1">Application Hub</p>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {step === 'docs' && (
          <motion.div 
            key="docs"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-xl shadow-slate-100 ring-1 ring-slate-100">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">1</div>
                  <h3 className="text-xl font-bold text-slate-800 tracking-tight">Required Documentation</h3>
                </div>
                
                <form onSubmit={handleNext} className="space-y-10">
                  {service.requiredDocuments.map((docName: string) => (
                    <div key={docName} className="space-y-4">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest px-2">
                        {docName} <span className="text-red-500">*</span>
                      </label>
                      
                      <div 
                        onDragOver={(e) => onDragOver(e, docName)}
                        onDragLeave={onDragLeave}
                        onDrop={(e) => onDrop(e, docName)}
                        className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-[2.5rem] transition-all cursor-pointer group ${
                          isDragging === docName 
                            ? 'border-indigo-600 bg-indigo-50/50 scale-[1.02]' 
                            : 'border-slate-200 bg-slate-50/50 hover:border-indigo-400 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="file"
                          multiple
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={(e) => handleFilesAdded(docName, e.target.files)}
                        />
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-all shadow-sm mb-4">
                          <Upload className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-bold text-slate-900 mb-1">Drag & drop or click to upload</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">PDF, JPG or PNG (Max 5MB each)</p>
                      </div>

                      {fileErrors[docName] && (
                        <p className="text-xs text-red-500 font-medium px-4 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {fileErrors[docName]}
                        </p>
                      )}

                      {formData[docName]?.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                          {formData[docName].map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-2xl shadow-sm group">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                                   <FileText className="w-4 h-4" />
                                </div>
                                <div className="overflow-hidden">
                                  <p className="text-xs font-bold text-slate-800 truncate">{file.name}</p>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                    {(file.size / 1024).toFixed(1)} KB
                                  </p>
                                </div>
                              </div>
                              <button 
                                type="button"
                                onClick={() => removeFile(docName, idx)}
                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="pt-6">
                    <button
                      type="submit"
                      className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-bold text-lg shadow-2xl shadow-indigo-100 hover:bg-slate-900 transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                      Process Documents <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-xl h-fit">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 text-indigo-400">Citizen Handbook</h4>
                <ul className="space-y-6">
                  <li className="flex gap-4">
                    <div className="w-6 h-6 bg-white/5 rounded-lg flex items-center justify-center text-indigo-400 shrink-0">1</div>
                    <p className="text-sm text-slate-300 font-medium leading-relaxed">Upload clear, scanned copies of original documents for faster verification.</p>
                  </li>
                  <li className="flex gap-4">
                    <div className="w-6 h-6 bg-white/5 rounded-lg flex items-center justify-center text-indigo-400 shrink-0">2</div>
                    <p className="text-sm text-slate-300 font-medium leading-relaxed">Multiple files allowed for each category (e.g., front and back of Aadhaar).</p>
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'payment' && (
          <motion.div 
            key="payment"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center"
          >
            <div className="bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-2xl text-center max-w-md w-full relative overflow-hidden ring-1 ring-slate-100">
              <div className="absolute top-0 inset-x-0 h-2 bg-indigo-600" />
              
              <div className="flex items-center justify-center gap-2 mb-10 text-indigo-600">
                <ShieldCheck className="w-6 h-6" />
                <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase tracking-widest">Safe Gateway</h2>
              </div>
              
              <div className="bg-slate-50 rounded-2xl p-5 mb-10 border border-dashed border-slate-300">
                <p className="text-xs font-bold text-indigo-600 mb-1">{service.title}</p>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Transaction Authorization Pending</p>
              </div>

              <div className="flex flex-col items-center mb-10">
                <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-6 shadow-inner mb-6">
                  <QRCode value={upiUrl} size={180} />
                </div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-4">Scan using any UPI App</p>
                <p className="text-3xl font-black text-slate-900 tracking-tight">₹{service.price.toFixed(2)}</p>
              </div>

              <button
                onClick={handlePaymentConfirm}
                className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-bold text-lg shadow-2xl shadow-indigo-100 hover:bg-slate-900 transition-all flex items-center justify-center gap-3 active:scale-95 group"
              >
                I have paid ₹{service.price} <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
              
              <button
                onClick={() => setStep('docs')}
                className="mt-8 text-slate-400 font-bold hover:text-slate-900 transition-colors text-xs uppercase tracking-[0.2em]"
              >
                Go Back
              </button>
            </div>
          </motion.div>
        )}

        {step === 'validation' && (
          <motion.div 
            key="validation"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center"
          >
            <div className="bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-2xl text-center max-w-md w-full relative overflow-hidden ring-1 ring-slate-100">
              <div className="absolute top-0 inset-x-0 h-2 bg-indigo-600" />
              
              <div className="flex flex-col items-center gap-4 mb-10">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-50">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Final Verification</h2>
                <p className="text-sm text-slate-500 font-medium">Please enter your 12-digit UTR or Transaction ID shown in your payment app.</p>
              </div>

              <div className="space-y-6 text-left">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Transaction Ref ID</label>
                  <input 
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="Enter 12-digit ID"
                    className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all font-bold tracking-widest text-center"
                  />
                  {validationError && (
                    <p className="text-xs text-red-500 font-bold flex items-center gap-1 mt-2">
                      <AlertCircle className="w-3.5 h-3.5" /> {validationError}
                    </p>
                  )}
                </div>

                <button
                  onClick={validateTransaction}
                  disabled={isSubmitting}
                  className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-bold text-lg shadow-2xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95"
                >
                  {isSubmitting ? (
                    <>Verifying Transaction... <Loader2 className="w-6 h-6 animate-spin" /></>
                  ) : (
                    <>Finalize Application <Check className="w-6 h-6" /></>
                  )}
                </button>

                <button
                  onClick={() => setStep('payment')}
                  disabled={isSubmitting}
                  className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors text-[10px] uppercase tracking-widest"
                >
                  Return to QR Code
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'complete' && receipt && (
          <motion.div 
            key="complete"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center"
          >
            <div className="bg-white p-12 rounded-[4rem] border border-slate-200 shadow-2xl max-w-lg w-full relative overflow-hidden text-center">
              <div className="absolute top-0 inset-x-0 h-4 bg-green-500" />
              
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-green-100 border-4 border-white">
                <ShieldCheck className="w-10 h-10" />
              </div>

              <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tighter">Application Submitted!</h2>
              <p className="text-slate-500 font-medium mb-10">Your reference node has been broadcasted to the admin queue.</p>

              <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 text-left space-y-6 shadow-inner mb-10">
                <div className="flex justify-between items-center border-b border-white pb-4">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Transaction Receipt</h3>
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">L</div>
                </div>
                
                <div className="grid grid-cols-2 gap-y-4 text-xs font-bold">
                  <div className="text-slate-400 uppercase tracking-widest">Service</div>
                  <div className="text-slate-800 text-right">{receipt.serviceName}</div>
                  
                  <div className="text-slate-400 uppercase tracking-widest">Amount Paid</div>
                  <div className="text-indigo-600 text-right">₹{receipt.amount.toFixed(2)}</div>
                  
                  <div className="text-slate-400 uppercase tracking-widest">Reference ID</div>
                  <div className="text-slate-800 text-right font-mono tracking-tighter">{receipt.transactionId}</div>
                  
                  <div className="text-slate-400 uppercase tracking-widest">Date & Time</div>
                  <div className="text-slate-800 text-right">{receipt.date}</div>
                </div>

                <div className="pt-4 border-t border-white text-center">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-4">Official Payment Confirmation</p>
                  <div className="flex justify-center gap-2">
                     <div className="w-6 h-6 bg-white rounded flex items-center justify-center text-indigo-600 border border-slate-100">✔</div>
                     <div className="w-6 h-6 bg-white rounded flex items-center justify-center text-indigo-600 border border-slate-100">✔</div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate('/user/requests')}
                className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-bold text-lg shadow-2xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-3"
              >
                View Live Tracker <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

