import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ShieldAlert, Sparkles, User, Mail, MessageSquare } from 'lucide-react';

export default function Login() {
  const { login, loginMock } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const isDev = !import.meta.env.PROD;
  const [loginMethod, setLoginMethod] = useState(isDev ? 'demo' : 'google');

  // Demo user states
  const [demoName, setDemoName] = useState('Rahul Verma');
  const [demoEmail, setDemoEmail] = useState('rahul.verma@iitkgp.ac.in');

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setError('');
      await login(credentialResponse.credential, whatsapp || null);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed. Make sure you use your @*.iitkgp.ac.in email.');
    }
  };

  const handleDemoSubmit = async (e) => {
    e.preventDefault();
    if (!demoName.trim() || !demoEmail.trim() || !whatsapp.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    if (!demoEmail.endsWith('.iitkgp.ac.in')) {
      setError('Email must end with .iitkgp.ac.in (e.g. name@iitkgp.ac.in)');
      return;
    }

    if (whatsapp.length < 10) {
      setError('WhatsApp number must be at least 10 digits.');
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

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-slate-800/40 border border-slate-700/50 p-8 rounded-3xl shadow-2xl shadow-black/40 backdrop-blur-xl relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-gradient-to-tr from-blue-600/20 to-emerald-600/20 rounded-2xl border border-blue-500/30 mb-4 shadow-lg">
            <Sparkles className="w-8 h-8 text-blue-400 animate-pulse" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight bg-gradient-to-r from-blue-100 to-slate-100 bg-clip-text">
            KGP Find
          </h1>
          <p className="text-slate-400 text-sm mt-1">Lost & Found Hub for IIT Kharagpur</p>
        </div>

        {/* Tab selection — Developer Demo only shown in local dev */}
        <div className="flex bg-slate-900/60 p-1 rounded-xl mb-6 border border-slate-700/40">
          {isDev && (
            <button
              type="button"
              onClick={() => { setLoginMethod('demo'); setError(''); }}
              className={`flex-1 py-2.5 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 ${
                loginMethod === 'demo'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Developer Demo
            </button>
          )}
          <button
            type="button"
            onClick={() => { setLoginMethod('google'); setError(''); }}
            className={`flex-1 py-2.5 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 ${
              loginMethod === 'google'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Google Sign-In
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-200 leading-relaxed">{error}</p>
          </div>
        )}

        {loginMethod === 'google' ? (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                WhatsApp Number <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <MessageSquare className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-900/50 border border-slate-700/80 rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all text-sm font-medium"
                />
              </div>
              <p className="text-xxs text-slate-500 mt-2 leading-normal">
                Required so KGPians can contact you directly about matches.
              </p>
            </div>

            <div className="flex justify-center pt-2 min-h-[50px]">
              {whatsapp.length >= 10 ? (
                <div className="w-full flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError('Google Sign-In was unsuccessful. Try again.')}
                    useOneTap
                    theme="filled_black"
                    shape="pill"
                    text="signin_with"
                    width="100%"
                  />
                </div>
              ) : (
                <div className="text-xs font-semibold text-slate-500 bg-slate-900/40 px-6 py-3 rounded-full border border-slate-800 text-center w-full">
                  Enter your WhatsApp number to unlock Google Sign-In
                </div>
              )}
            </div>
            
            <p className="text-xxs text-center text-slate-500">
              Only authentic <strong className="text-slate-400">@*.iitkgp.ac.in</strong> email addresses are allowed access.
            </p>
          </div>
        ) : (
          <form onSubmit={handleDemoSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="Rahul Verma"
                  value={demoName}
                  onChange={(e) => setDemoName(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700/80 rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all text-sm font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Mock IIT KGP Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="rahul.verma@iitkgp.ac.in"
                  value={demoEmail}
                  onChange={(e) => setDemoEmail(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700/80 rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all text-sm font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                WhatsApp Number
              </label>
              <div className="relative">
                <MessageSquare className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                <input
                  type="tel"
                  required
                  placeholder="9876543210"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-900/50 border border-slate-700/80 rounded-xl pl-11 pr-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all text-sm font-medium"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                Access Demo Account
              </button>
            </div>

            <div className="flex gap-2 items-center justify-center p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl mt-3">
              <ShieldAlert className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="text-xxs text-slate-400">
                Mock login allows creating items & seeing matches without Google configuration.
              </span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

