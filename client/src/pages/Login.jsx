import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ShieldAlert, Sparkles, User, Mail, MessageSquare, LogIn, UserPlus } from 'lucide-react';

// Google's official brand color button
function GoogleButton({ onClick, text = 'Continue with Google', disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-800 font-semibold py-3 px-4 rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {/* Google SVG logo */}
      <svg width="20" height="20" viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        <path fill="none" d="M0 0h48v48H0z"/>
      </svg>
      {text}
    </button>
  );
}

export default function Login() {
  const { login, loginMock } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const isDev = !import.meta.env.PROD;

  const [tab, setTab] = useState('signin');
  const [demoName, setDemoName] = useState('Rahul Verma');
  const [demoEmail, setDemoEmail] = useState('rahul.verma@iitkgp.ac.in');

  const handleWhatsappChange = (val) => {
    let clean = val.replace(/\D/g, '');
    if (clean.length > 10) {
      if (clean.startsWith('91')) clean = clean.slice(2);
      else if (clean.startsWith('0')) clean = clean.slice(1);
    }
    clean = clean.slice(0, 10);
    setWhatsapp(clean);
  };

  const isValidWhatsapp = (num) => {
    return /^[6-9]\d{9}$/.test(num);
  };

  const googleSignIn = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setSigningIn(true);
        setError('');
        await login(null, whatsapp || null, tokenResponse.access_token);
        navigate('/');
      } catch (err) {
        if (err.message && err.message.includes('Create Account')) {
          setTab('signup');
          setError('👋 Looks like you\'re new here! Please enter your valid 10-digit WhatsApp number and sign up below.');
        } else {
          setError(err.message || 'Sign-in failed. Use your @kgpian.iitkgp.ac.in email.');
        }
        setSigningIn(false);
      }
    },
    onError: (err) => {
      console.error('Google OAuth error:', err);
      setError('Google Sign-In was cancelled or failed. Please try again.');
      setSigningIn(false);
    },
    flow: 'implicit',
  });

  const handleDemoSubmit = async (e) => {
    e.preventDefault();
    if (!demoName.trim() || !demoEmail.trim() || !whatsapp.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (!demoEmail.endsWith('@kgpian.iitkgp.ac.in') && demoEmail !== 'kgp.lost.found@gmail.com') {
      setError('Email must be @kgpian.iitkgp.ac.in or admin email');
      return;
    }
    if (!isValidWhatsapp(whatsapp)) {
      setError('WhatsApp number must be exactly 10 digits starting with 6, 7, 8, or 9.');
      return;
    }
    try {
      setError('');
      await loginMock(demoName, demoEmail, whatsapp);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Demo Sign-In failed.');
    }
  };

  const switchTab = (t) => { setTab(t); setError(''); setWhatsapp(''); };

  const inputClass = "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 transition-all text-sm font-medium";

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-[#0d1424]/80 border border-white/[0.06] p-8 rounded-3xl shadow-2xl backdrop-blur-xl relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-gradient-to-tr from-blue-600/20 to-emerald-600/20 rounded-3xl border border-blue-500/30 mb-4 shadow-lg">
            <Sparkles className="w-8 h-8 text-blue-400 animate-pulse" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight font-heading">KGP Find</h1>
          <p className="text-slate-400 text-sm mt-1">Lost & Found Hub for IIT Kharagpur</p>
        </div>

        {/* Tab Bar */}
        <div className="flex bg-white/[0.03] p-1 rounded-xl mb-6 border border-white/[0.06] gap-1">
          <button type="button" onClick={() => switchTab('signin')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer ${tab === 'signin' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-white'}`}>
            <LogIn className="w-3.5 h-3.5" /> Sign In
          </button>
          <button type="button" onClick={() => switchTab('signup')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer ${tab === 'signup' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-white'}`}>
            <UserPlus className="w-3.5 h-3.5" /> Create Account
          </button>
          {isDev && (
            <button type="button" onClick={() => switchTab('demo')}
              className={`flex-1 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer ${tab === 'demo' ? 'bg-slate-600 text-white shadow-md' : 'text-slate-500 hover:text-white'}`}>
              Dev
            </button>
          )}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-5 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300 leading-relaxed font-medium">{error}</p>
          </div>
        )}

        {/* SIGN IN TAB */}
        {tab === 'signin' && (
          <div className="space-y-5">
            <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
              <p className="text-xs text-white font-semibold mb-0.5">Welcome back!</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">Sign in with your IIT KGP Google account to access your reports and notifications.</p>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                WhatsApp <span className="text-slate-600 font-normal normal-case">(optional — updates your contact)</span>
              </label>
              <div className="relative">
                <MessageSquare className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type="tel" placeholder="e.g. 9876543210" value={whatsapp}
                  onChange={(e) => handleWhatsappChange(e.target.value)}
                  className={inputClass} />
              </div>
            </div>

            <GoogleButton
              onClick={() => {
                if (whatsapp && !isValidWhatsapp(whatsapp)) {
                  setError('Invalid WhatsApp number. Must be exactly 10 digits starting with 6-9.');
                  return;
                }
                setSigningIn(true);
                googleSignIn();
              }}
              text={signingIn ? 'Signing in…' : 'Continue with Google'}
              disabled={signingIn}
            />
            <p className="text-[10px] text-center text-slate-500">
              Only <strong className="text-slate-400">@kgpian.iitkgp.ac.in</strong> emails are allowed.
            </p>
          </div>
        )}

        {/* CREATE ACCOUNT TAB */}
        {tab === 'signup' && (
          <div className="space-y-5">
            <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
              <p className="text-xs text-white font-semibold mb-0.5">New here? Welcome!</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">Create your account with your IIT KGP Google account. WhatsApp is required so others can contact you about matches.</p>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                WhatsApp Number <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <MessageSquare className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type="tel" placeholder="e.g. 9876543210" value={whatsapp}
                  onChange={(e) => handleWhatsappChange(e.target.value)}
                  className={inputClass.replace('focus:border-blue-500/40', 'focus:border-emerald-500/40').replace('focus:ring-blue-500/20', 'focus:ring-emerald-500/20')} />
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5">Required so matches can reach you directly.</p>
            </div>

            {isValidWhatsapp(whatsapp) ? (
              <GoogleButton
                onClick={() => { setSigningIn(true); googleSignIn(); }}
                text={signingIn ? 'Creating account…' : 'Sign up with Google'}
                disabled={signingIn}
              />
            ) : (
              <div className="w-full text-xs font-semibold text-slate-400 bg-white/[0.02] px-6 py-3 rounded-xl border border-white/[0.06] text-center">
                Enter your 10-digit WhatsApp number first
              </div>
            )}
            <p className="text-[10px] text-center text-slate-500">
              Only <strong className="text-slate-400">@kgpian.iitkgp.ac.in</strong> emails are allowed.
            </p>
          </div>
        )}

        {/* DEVELOPER DEMO TAB */}
        {isDev && tab === 'demo' && (
          <form onSubmit={handleDemoSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type="text" required placeholder="Rahul Verma" value={demoName} onChange={(e) => setDemoName(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Mock IIT KGP Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type="email" required placeholder="rahul.verma@iitkgp.ac.in" value={demoEmail} onChange={(e) => setDemoEmail(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">WhatsApp Number</label>
              <div className="relative">
                <MessageSquare className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type="tel" required placeholder="9876543210" value={whatsapp} onChange={(e) => handleWhatsappChange(e.target.value)} className={inputClass} />
              </div>
            </div>
            <button type="submit" className="w-full py-3 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer">
              Access Demo Account
            </button>
            <div className="flex gap-2 items-center p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl">
              <ShieldAlert className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="text-[10px] text-slate-400">Dev-only bypass. Hidden in production.</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
