import React, { useState } from 'react';
import { sendEmailVerification } from 'firebase/auth';
import { Mail, RefreshCw, LogOut, Loader2, CheckCircle2 } from 'lucide-react';

interface VerifyEmailPageProps {
  user: any;
  onVerified: () => void;
  onLogout: () => void;
}

const VerifyEmailPage: React.FC<VerifyEmailPageProps> = ({ user, onVerified, onLogout }) => {
  const [isReloading, setIsReloading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const handleVerifiedCheck = async () => {
    if (isReloading) return;
    setIsReloading(true);
    setMessage(null);
    try {
      await user.reload();
      if (user.emailVerified) {
        onVerified();
      } else {
        setMessage({
          text: "Your email is not verified yet. Open the verification link we sent to your inbox, then try again.",
          type: 'error'
        });
      }
    } catch (err: any) {
      setMessage({ text: "Something went wrong. Please try again.", type: 'error' });
    } finally {
      setIsReloading(false);
    }
  };

  const handleResend = async () => {
    if (isResending || cooldown > 0) return;
    setIsResending(true);
    setMessage(null);
    try {
      await sendEmailVerification(user);
      setMessage({ text: "Verification email sent.", type: 'success' });
      setCooldown(60);
      
      const interval = setInterval(() => {
        setCooldown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    } catch (err: any) {
      if (err.code === 'auth/too-many-requests') {
        setMessage({ text: "Too many attempts. Please wait and try again.", type: 'error' });
      } else {
        setMessage({ text: "Could not resend email. Please try again later.", type: 'error' });
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
      <div className="max-w-md w-full glass p-10 rounded-[2.5rem] border-white/10 shadow-2xl flex flex-col items-center text-center space-y-8 animate-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-indigo-600/20 rounded-full flex items-center justify-center border border-indigo-500/30">
          <Mail size={32} className="text-indigo-400" />
        </div>
        
        <div className="space-y-3">
          <h1 className="text-3xl font-black tracking-tight text-white">Verify your email</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            We sent a verification link to:<br/>
            <strong className="text-indigo-400">{user.email}</strong>
          </p>
          <p className="text-slate-400 text-sm leading-relaxed">
            Open the link in your inbox to activate your SkillSwap account.
          </p>
        </div>

        {message && (
          <div className={`px-4 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {message.type === 'success' && <CheckCircle2 size={16} />}
            {message.text}
          </div>
        )}

        <div className="w-full space-y-4">
          <button 
            onClick={handleVerifiedCheck} 
            disabled={isReloading}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isReloading ? <Loader2 size={18} className="animate-spin" /> : null}
            I've Verified My Email
          </button>
          
          <button 
            onClick={handleResend}
            disabled={isResending || cooldown > 0}
            className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-2xl font-black text-sm transition-all border border-slate-800 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isResending ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Verification Email'}
          </button>
          
          <button 
            onClick={onLogout}
            className="w-full py-4 text-slate-500 hover:text-slate-300 font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>

        <p className="text-xs text-slate-600 font-medium pt-4 border-t border-slate-800 w-full">
          Didn't receive it? Check your spam or junk folder.
        </p>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
