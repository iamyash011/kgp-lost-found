import { useState } from 'react';
import { Check, X, HelpCircle, MessageCircle, Loader2, Shield, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../services/api';
import { timeAgo } from '../utils/timeAgo';

export default function ClaimReviewCard({ claim, onUpdate }) {
  const [loading, setLoading] = useState(null); // 'accept' | 'reject' | 'more'
  const [rejectNote, setRejectNote] = useState('');
  const [moreInfoNote, setMoreInfoNote] = useState('');
  const [showActions, setShowActions] = useState(false);
  const [error, setError] = useState('');

  const statusColors = {
    PENDING: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
    ACCEPTED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
    REJECTED: 'bg-red-500/15 text-red-300 border-red-500/20',
    MORE_INFO: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  };

  const statusLabels = {
    PENDING: 'Pending Review',
    ACCEPTED: 'Accepted',
    REJECTED: 'Rejected',
    MORE_INFO: 'More Info Requested',
  };

  const handleAccept = async () => {
    if (!confirm('Accept this claim? The claimant will be able to see your WhatsApp number.')) return;
    setLoading('accept');
    setError('');
    try {
      await api.acceptClaim(claim.id);
      onUpdate?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async () => {
    setLoading('reject');
    setError('');
    try {
      await api.rejectClaim(claim.id, rejectNote);
      onUpdate?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  const handleMoreInfo = async () => {
    if (!moreInfoNote.trim()) {
      setError('Please specify what additional information you need.');
      return;
    }
    setLoading('more');
    setError('');
    try {
      await api.requestMoreInfo(claim.id, moreInfoNote);
      onUpdate?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  const isPending = claim.status === 'PENDING' || claim.status === 'MORE_INFO';

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-white/10 transition-all">
      {/* Header */}
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-500 flex items-center justify-center text-xs font-black text-white shrink-0">
            {claim.claimant?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">
              {claim.claimant?.name || 'Verified Student'}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="flex items-center gap-1 text-[10px] text-slate-500">
                <Clock className="w-3 h-3" /> {timeAgo(claim.createdAt)}
              </span>
              {claim.claimant?.trustScore > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                  <Shield className="w-3 h-3" /> Trust: {claim.claimant.trustScore}
                </span>
              )}
            </div>
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${statusColors[claim.status]}`}>
          {statusLabels[claim.status]}
        </span>
      </div>

      {/* Claim on which item */}
      {claim.item && (
        <div className="px-4 pb-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Claiming</p>
          <p className="text-xs text-slate-300 font-semibold">{claim.item.title}</p>
        </div>
      )}

      {/* Identifying info */}
      <div className="px-4 pb-4">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Verification Details</p>
        <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3">
          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{claim.identifyingInfo}</p>
        </div>
      </div>

      {/* Response note if exists */}
      {claim.responseNote && (
        <div className="px-4 pb-4">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Your Response</p>
          <p className="text-xs text-slate-400 italic">"{claim.responseNote}"</p>
        </div>
      )}

      {/* WhatsApp button for accepted claims */}
      {claim.status === 'ACCEPTED' && claim.claimant && (
        <div className="px-4 pb-4">
          <a
            href={`https://wa.me/91${claim.claimant.whatsappNumber || ''}?text=${encodeURIComponent(`Hi! I'm reaching out from KGP Find regarding "${claim.item?.title || 'an item'}".`)}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-xs transition-all"
          >
            <MessageCircle className="w-4 h-4" /> Contact Claimant on WhatsApp
          </a>
        </div>
      )}

      {/* Action buttons for pending claims */}
      {isPending && (
        <div className="border-t border-white/5">
          <button
            onClick={() => setShowActions(!showActions)}
            className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/[0.02] transition-colors"
          >
            <span>Review Actions</span>
            {showActions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showActions && (
            <div className="px-4 pb-4 space-y-3">
              {error && (
                <p className="text-xs text-red-400 font-medium">{error}</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleAccept}
                  disabled={!!loading}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {loading === 'accept' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Accept
                </button>
                <button
                  onClick={handleReject}
                  disabled={!!loading}
                  className="flex-1 py-2 bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/20 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {loading === 'reject' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                  Reject
                </button>
              </div>

              {/* Reject note */}
              <div>
                <input
                  type="text"
                  placeholder="Optional rejection reason..."
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500/30 transition-all"
                />
              </div>

              {/* Ask more info */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="What more details do you need?"
                  value={moreInfoNote}
                  onChange={(e) => setMoreInfoNote(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/30 transition-all"
                />
                <button
                  onClick={handleMoreInfo}
                  disabled={!!loading}
                  className="px-3 py-2 bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/20 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  {loading === 'more' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <HelpCircle className="w-3.5 h-3.5" />}
                  Ask More
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
