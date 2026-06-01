import { useState } from 'react';
import { X, Flag, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

const REASONS = [
  'Spam or fake listing',
  'Inappropriate content',
  'Harassment or threats',
  'Duplicate post',
  'Fraudulent claim',
  'Other',
];

export default function ReportModal({ targetType, targetId, targetTitle, onClose, onSuccess }) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!reason) {
      setError('Please select a reason.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.reportContent(targetType, targetId, reason, details);
      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to submit report.');
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
        className="relative w-full max-w-sm bg-[#0f1729] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'modalIn 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="p-5 pb-3 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/20 flex items-center justify-center">
              <Flag className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Report Content</h3>
              {targetTitle && (
                <p className="text-[10px] text-slate-500 truncate max-w-[200px]">"{targetTitle}"</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {success ? (
            <div className="text-center py-4 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <p className="text-sm font-bold text-white">Report Submitted</p>
              <p className="text-xs text-slate-400">Our team will review this shortly.</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Reason
                </label>
                <div className="space-y-1.5">
                  {REASONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setReason(r)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        reason === r
                          ? 'bg-red-500/15 text-red-300 border border-red-500/25'
                          : 'bg-white/[0.03] text-slate-400 border border-white/5 hover:bg-white/[0.06] hover:text-slate-300'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Details (optional)
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={2}
                  maxLength={300}
                  placeholder="Any additional context..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500/30 transition-all resize-none"
                />
              </div>

              {error && (
                <p className="text-xs text-red-400 font-medium">{error}</p>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading || !reason}
                className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Submit Report
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
