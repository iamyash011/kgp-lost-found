import { useState } from 'react';
import { X, Shield, Send, Loader2, CheckCircle2, Fingerprint } from 'lucide-react';
import { api } from '../services/api';

export default function ClaimModal({ item, onClose, onSuccess }) {
  const [identifyingInfo, setIdentifyingInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const isLost = item.type === 'LOST';

  const handleSubmit = async () => {
    if (identifyingInfo.trim().length < 10) {
      setError('Please provide at least 10 characters of identifying details.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.submitClaim(item.id, identifyingInfo.trim());
      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to submit claim.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-[#0f1729] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'modalIn 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
                <Fingerprint className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {isLost ? 'I Found This Item' : 'This Might Be Mine'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Verify your claim</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Item reference */}
          <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/5">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider ${
              isLost
                ? 'bg-red-500/20 text-red-300'
                : 'bg-emerald-500/20 text-emerald-300'
            }`}>
              {item.type}
            </span>
            <span className="text-sm font-semibold text-slate-200 truncate">{item.title}</span>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {success ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-16 h-16 mx-auto bg-emerald-500/15 border border-emerald-500/20 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h4 className="text-lg font-bold text-white">Claim Submitted!</h4>
              <p className="text-sm text-slate-400 max-w-xs mx-auto">
                The {isLost ? 'person who lost this' : 'finder'} will review your claim and respond. You'll get a notification.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  {isLost
                    ? 'How do you know this is the item you found?'
                    : 'Prove this item is yours'
                  }
                </label>
                <textarea
                  value={identifyingInfo}
                  onChange={(e) => setIdentifyingInfo(e.target.value)}
                  rows={4}
                  maxLength={500}
                  placeholder={isLost
                    ? 'Describe where & when you found it, any unique features you noticed...'
                    : 'Describe unique marks, contents, serial number, lock screen, approximate purchase date, what was inside...'
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 transition-all resize-none leading-relaxed"
                />
                <div className="flex justify-between items-center mt-1.5">
                  <span className="text-[10px] text-slate-600">Minimum 10 characters</span>
                  <span className={`text-[10px] font-medium ${identifyingInfo.length >= 10 ? 'text-emerald-400' : 'text-slate-600'}`}>
                    {identifyingInfo.length}/500
                  </span>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <p className="text-xs text-red-300 font-medium">{error}</p>
                </div>
              )}

              <div className="flex items-start gap-2 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                <Shield className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Your contact details remain hidden until the other party accepts your claim. This protects both parties.
                </p>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading || identifyingInfo.trim().length < 10}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                ) : (
                  <><Send className="w-4 h-4" /> Submit Claim</>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>
    </div>
  );
}
