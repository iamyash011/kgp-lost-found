import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapPin, Clock, X, Tag, AlertCircle, CheckCircle, Trash2, CheckCircle2, Info, Search, Image as ImageIcon, Flag, Shield, Fingerprint, MessageCircle, Eye, Sparkles, Award } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getStandardLocation, getSynonymsForLocation } from '../utils/locations';
import { trackSearch, trackFilterChange, trackItemView } from '../utils/analytics';
import { timeAgo } from '../utils/timeAgo';
import ClaimModal from '../components/ClaimModal';
import ReportModal from '../components/ReportModal';

// Keyword Highlighter
function HighlightText({ text, highlight }) {
  if (!text) return null;
  if (!highlight || !highlight.trim()) return <span>{text}</span>;
  const regex = new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark key={index} className="bg-blue-500/30 text-blue-200 font-semibold px-0.5 rounded">{part}</mark>
        ) : (part)
      )}
    </span>
  );
}

const getImages = (imageUrlString) => {
  if (!imageUrlString) return [];
  try {
    const parsed = JSON.parse(imageUrlString);
    if (Array.isArray(parsed)) return parsed;
    return [imageUrlString];
  } catch (e) {
    return [imageUrlString];
  }
};

const CATEGORIES = [
  'All', 'Electronics', 'Documents & IDs', 'Clothing & Accessories', 'Bags & Wallets',
  'Keys', 'Stationery', 'Sports Equipment', 'Books', 'Water Bottles', 'Other',
];

// ═══════════════════════════════════════════════════════
// Item Detail Modal — privacy-aware, claim flow
// ═══════════════════════════════════════════════════════
function ItemModal({ item, onClose, onActionSuccess }) {
  if (!item) return null;

  const { user, isAdmin } = useAuth();
  const isLost = item.type === 'LOST';
  const isOwner = item.userId === user?.id;
  const posterName = item.user?.name || null;
  const displayName = posterName || 'Verified Campus User';
  const hasPublicWhatsapp = !!item.user?.whatsappNumber;

  const images = getImages(item.imageUrl);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={onClose}>
        <div className="relative w-full max-w-lg bg-[#0c1322] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl shadow-black/70"
          onClick={(e) => e.stopPropagation()} style={{ animation: 'modalIn 0.2s ease-out' }}>

          {/* Image header */}
          <div className="relative h-56 overflow-hidden bg-slate-950">
            {images.length > 0 ? (
              <img
                src={images[activeImgIdx].startsWith('http') ? images[activeImgIdx] : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${images[activeImgIdx]}`}
                alt={item.title}
                className={`w-full h-full object-cover transition-all duration-300 ${item.sensitiveImage && !isOwner && !isAdmin ? 'blur-lg' : ''}`}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-600">
                <ImageIcon className="w-10 h-10 mb-2 opacity-40" />
                <span className="text-[10px] font-semibold opacity-40">No Images Uploaded</span>
              </div>
            )}

            {/* Sensitive overlay */}
            {item.sensitiveImage && !isOwner && !isAdmin && images.length > 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/10">
                  <p className="text-[10px] text-amber-300 font-bold">🔒 Contains sensitive details</p>
                </div>
              </div>
            )}

            {/* Carousel */}
            {images.length > 1 && (
              <>
                <button type="button"
                  onClick={(e) => { e.stopPropagation(); setActiveImgIdx((prev) => (prev === 0 ? images.length - 1 : prev - 1)); }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-black/60 transition-all cursor-pointer z-10 font-bold text-sm">
                  ←
                </button>
                <button type="button"
                  onClick={(e) => { e.stopPropagation(); setActiveImgIdx((prev) => (prev === images.length - 1 ? 0 : prev + 1)); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-black/60 transition-all cursor-pointer z-10 font-bold text-sm">
                  →
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-full">
                  {images.map((_, idx) => (
                    <button key={idx} type="button" onClick={(e) => { e.stopPropagation(); setActiveImgIdx(idx); }}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${idx === activeImgIdx ? 'bg-blue-400 w-3' : 'bg-white/40'}`} />
                  ))}
                </div>
              </>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-[#0c1322] via-transparent to-transparent" />

            <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 bg-black/40 backdrop-blur-sm border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors cursor-pointer">
              <X className="w-4 h-4" />
            </button>

            {/* Badges */}
            <div className="absolute top-4 left-4 flex gap-2">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide ${isLost ? 'bg-red-500/20 text-red-300 border border-red-500/25' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/25'}`}>
                {item.type}
              </span>
              {item.urgency === 'URGENT' && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide bg-orange-500/20 text-orange-300 border border-orange-500/25">
                  🔥 Urgent
                </span>
              )}
              {item.status === 'RESOLVED' && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide bg-blue-500/20 text-blue-300 border border-blue-500/25 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Resolved
                </span>
              )}
            </div>

            <div className="absolute bottom-4 left-5 right-5">
              <h2 className="text-xl font-bold text-white leading-tight">{item.title}</h2>
            </div>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4 max-h-[50vh] overflow-y-auto">
            <p className="text-slate-300 text-sm leading-relaxed">{item.description}</p>

            {/* Detail chips */}
            <div className="flex flex-wrap gap-2">
              {item.category && (
                <span className="px-2.5 py-1 bg-white/[0.04] border border-white/[0.06] rounded-lg text-[10px] text-slate-400 font-medium">{item.category}</span>
              )}
              {item.color && (
                <span className="px-2.5 py-1 bg-white/[0.04] border border-white/[0.06] rounded-lg text-[10px] text-slate-400 font-medium">🎨 {item.color}</span>
              )}
              {item.brand && (
                <span className="px-2.5 py-1 bg-white/[0.04] border border-white/[0.06] rounded-lg text-[10px] text-slate-400 font-medium">{item.brand}</span>
              )}
              {item.reward && (
                <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/15 rounded-lg text-[10px] text-emerald-300 font-bold">💰 {item.reward}</span>
              )}
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-1 gap-2.5">
              <div className="flex items-start gap-3 bg-white/[0.03] border border-white/[0.05] rounded-xl p-3">
                <MapPin className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-500 mb-0.5">{isLost ? 'Expected near' : 'Found at'}</p>
                  <p className="text-xs text-slate-200 font-semibold">{item.location}</p>
                </div>
              </div>
              {item.identifyingMarks && (
                <div className="flex items-start gap-3 bg-white/[0.03] border border-white/[0.05] rounded-xl p-3">
                  <Tag className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-500 mb-0.5">Identifying Marks</p>
                    <p className="text-xs text-slate-200 font-semibold">{item.identifyingMarks}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3 bg-white/[0.03] border border-white/[0.05] rounded-xl p-3">
                <Clock className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-500 mb-0.5">Posted</p>
                  <p className="text-xs text-slate-200 font-semibold">{timeAgo(item.createdAt)} by {isOwner ? 'You' : displayName}</p>
                </div>
              </div>
            </div>

            {/* Poster info */}
            <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.05] rounded-xl p-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-500 flex items-center justify-center text-[10px] font-black text-white shrink-0">
                {posterName ? posterName.charAt(0).toUpperCase() : '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-white truncate">{displayName}</p>
                  <Shield className="w-3 h-3 text-blue-400 shrink-0" />
                </div>
                <p className="text-[10px] text-slate-500">Verified Campus User</p>
              </div>
              {item.user?.trustScore > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/15">
                  <Award className="w-3 h-3" /> {item.user.trustScore}
                </span>
              )}
            </div>

            {/* Admin Controls */}
            {isAdmin && !isOwner && (
              <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs text-red-400 font-bold">
                  <AlertCircle className="w-4 h-4" /> Admin Controls
                </div>
                <button
                  onClick={async () => {
                    if (window.confirm('ADMIN: Delete this report permanently?')) {
                      try {
                        await api.deleteItem(item.id);
                        onActionSuccess('Report deleted by Admin.', 'info');
                        onClose();
                      } catch (err) {
                        onActionSuccess('Failed to delete report.', 'error');
                      }
                    }
                  }}
                  className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/15 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> Force Delete
                </button>
              </div>
            )}

            {/* Owner actions */}
            {isOwner ? (
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
                  <Info className="w-4 h-4 text-blue-400" /> You reported this item
                </div>
                <div className="flex gap-2">
                  {item.status === 'ACTIVE' && (
                    <button onClick={async () => {
                      try { await api.resolveItem(item.id); onActionSuccess('Marked as resolved!', 'success'); onClose(); } catch (err) { onActionSuccess('Failed.', 'error'); }
                    }}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                      <CheckCircle2 className="w-4 h-4" /> Resolve
                    </button>
                  )}
                  <button onClick={async () => {
                    if (window.confirm('Delete this report permanently?')) {
                      try { await api.deleteItem(item.id); onActionSuccess('Deleted.', 'info'); onClose(); } catch (err) { onActionSuccess('Failed.', 'error'); }
                    }
                  }}
                    className="flex-1 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/15 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              </div>
            ) : (
              /* Non-owner actions — CLAIM FLOW */
              <div className="space-y-3">
                {/* Public WhatsApp if allowed */}
                {hasPublicWhatsapp && (
                  <a href={`https://wa.me/91${item.user.whatsappNumber}?text=${encodeURIComponent(`Hi! Reaching out from KGP Find about "${item.title}".`)}`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white shadow-md font-semibold text-sm transition-all cursor-pointer active:scale-[0.99]">
                    <MessageCircle className="w-4 h-4" /> Contact on WhatsApp
                  </a>
                )}

                {/* Claim CTA */}
                {user && item.status === 'ACTIVE' && (
                  <button onClick={() => setShowClaimModal(true)}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all cursor-pointer active:scale-[0.99]">
                    <Fingerprint className="w-4 h-4" />
                    {isLost ? "I Found This Item" : "This Might Be Mine"}
                  </button>
                )}

                {!hasPublicWhatsapp && (
                  <div className="flex items-start gap-2 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                    <Shield className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Contact details are protected. Submit a claim with identifying proof — once accepted, WhatsApp contact will be unlocked.
                    </p>
                  </div>
                )}

                {/* Report button */}
                {user && (
                  <button onClick={() => setShowReportModal(true)}
                    className="flex items-center justify-center gap-1.5 w-full py-2 text-slate-600 hover:text-red-400 text-[10px] font-medium transition-colors">
                    <Flag className="w-3 h-3" /> Report this post
                  </button>
                )}
              </div>
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

      {showClaimModal && (
        <ClaimModal item={item} onClose={() => setShowClaimModal(false)} onSuccess={() => onActionSuccess('Claim submitted!', 'success')} />
      )}
      {showReportModal && (
        <ReportModal targetType="ITEM" targetId={item.id} targetTitle={item.title} onClose={() => setShowReportModal(false)} onSuccess={() => onActionSuccess('Report submitted.', 'info')} />
      )}
    </>
  );
}


// ═══════════════════════════════════════════════════════
// Feed Page
// ═══════════════════════════════════════════════════════
export default function Feed() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';

  const [selectedItem, setSelectedItem] = useState(null);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [activeCategory, setActiveCategory] = useState('All');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await api.getItems('ALL');
      setItems(data);
    } catch (error) {
      console.error('Error fetching items:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (item.status !== 'ACTIVE') return false;
    if (activeFilter !== 'ALL' && item.type !== activeFilter) return false;
    if (activeCategory !== 'All' && item.category !== activeCategory) return false;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const standardSearchLoc = getStandardLocation(query);
      const searchWords = standardSearchLoc
        ? [...new Set([query, ...getSynonymsForLocation(standardSearchLoc)])]
        : [query];

      const titleMatch = searchWords.some(w => item.title?.toLowerCase().includes(w));
      const descMatch = searchWords.some(w => item.description?.toLowerCase().includes(w));
      const locMatch = searchWords.some(w => item.location?.toLowerCase().includes(w));
      const marksMatch = searchWords.some(w => item.identifyingMarks?.toLowerCase().includes(w));
      return titleMatch || descMatch || locMatch || marksMatch;
    }
    return true;
  });

  const handleActionSuccess = (message, type) => {
    triggerToast(message, type);
    fetchItems();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-6 z-50" style={{ animation: 'modalIn 0.2s ease-out' }}>
          <div className={`flex items-center gap-3 px-5 py-3.5 border rounded-xl shadow-2xl backdrop-blur-xl ${
            toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
            : toast.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-300'
            : 'bg-blue-500/10 border-blue-500/20 text-blue-300'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <Info className="w-4 h-4 shrink-0" />}
            <span className="text-xs font-semibold">{toast.message}</span>
            <button onClick={() => setToast(null)} className="text-slate-500 hover:text-white ml-2"><X className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-heading">
            Recent Activity
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Help your fellow KGPians find their lost belongings.</p>
        </div>

        <div className="flex bg-white/[0.04] p-1 rounded-xl border border-white/[0.06]">
          {['ALL', 'LOST', 'FOUND'].map((f) => (
            <button key={f}
              onClick={() => { setActiveFilter(f); trackFilterChange('type', f); }}
              className={`px-4 sm:px-5 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeFilter === f ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-white'
              }`}>
              {f === 'ALL' ? 'All Items' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Category filter pills */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer border ${
              activeCategory === cat
                ? 'bg-blue-500/15 text-blue-300 border-blue-500/20'
                : 'bg-white/[0.03] text-slate-500 border-white/[0.06] hover:text-slate-300 hover:border-white/10'
            }`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Search indicator */}
      {searchQuery && (
        <div className="mb-5 flex items-center gap-2 text-xs font-medium text-slate-400 bg-blue-500/5 border border-blue-500/10 py-2.5 px-4 rounded-xl w-fit">
          <Search className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>Showing results for "<span className="text-blue-300 font-bold">{searchQuery}</span>"</span>
          <button onClick={() => {
            const url = new URL(window.location.href);
            url.searchParams.delete('q');
            window.history.pushState({}, '', url.pathname);
            window.dispatchEvent(new Event('popstate'));
          }} className="ml-2 px-1.5 py-0.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 rounded text-[10px] font-bold">Clear</button>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-4 border-white/5" />
            <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredItems.map((item) => {
            const isOwner = item.userId === user?.id;
            const images = getImages(item.imageUrl);
            const displayImg = images.length > 0
              ? (images[0].startsWith('http') ? images[0] : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${images[0]}`)
              : null;
            const posterName = item.user?.name || null;

            return (
              <div key={item.id}
                onClick={() => { setSelectedItem(item); trackItemView(item.id, item.type); }}
                className="group flex flex-col bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-white/[0.12] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/[0.03] cursor-pointer"
              >
                <div className="relative h-44 overflow-hidden bg-slate-950">
                  {displayImg ? (
                    <img src={displayImg} alt={item.title}
                      className={`w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500 ${item.sensitiveImage ? 'blur-md' : ''}`} />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-700">
                      <ImageIcon className="w-8 h-8 mb-1 opacity-30" strokeWidth={1.5} />
                      <span className="text-[10px] font-semibold opacity-30">No Image</span>
                    </div>
                  )}

                  {item.sensitiveImage && displayImg && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[9px] text-amber-300 font-bold bg-black/50 backdrop-blur-sm px-2 py-1 rounded-lg border border-amber-500/20">🔒 Sensitive</span>
                    </div>
                  )}

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider border ${
                      item.type === 'LOST' ? 'bg-red-500/20 text-red-300 border-red-500/25' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/25'
                    }`}>{item.type}</span>
                    {item.urgency === 'URGENT' && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider bg-orange-500/20 text-orange-300 border border-orange-500/25">🔥</span>
                    )}
                  </div>

                  {isOwner && (
                    <div className="absolute top-3 right-3">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/25">Yours</span>
                    </div>
                  )}

                  {item.reward && (
                    <div className="absolute bottom-3 right-3">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/25">💰 {item.reward}</span>
                    </div>
                  )}
                </div>

                <div className="p-4 flex flex-col flex-grow">
                  <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-blue-300 transition-colors">
                    <HighlightText text={item.title} highlight={searchQuery} />
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-2 flex-grow leading-relaxed">
                    <HighlightText text={item.description} highlight={searchQuery} />
                  </p>

                  {/* Category chip */}
                  {item.category && (
                    <span className="inline-block mt-2 px-2 py-0.5 bg-white/[0.04] border border-white/[0.06] rounded text-[9px] text-slate-500 font-medium w-fit">
                      {item.category}
                    </span>
                  )}

                  <div className="mt-3 pt-3 border-t border-white/[0.04] flex flex-col gap-1.5">
                    <div className="flex items-center text-[10px] text-slate-500 font-medium">
                      <MapPin className="w-3 h-3 mr-1.5 text-blue-400/60 shrink-0" />
                      <span className="truncate"><HighlightText text={item.location} highlight={searchQuery} /></span>
                    </div>
                    <div className="flex items-center text-[10px] text-slate-600">
                      <Clock className="w-3 h-3 mr-1.5" />
                      <span>{timeAgo(item.createdAt)}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-white/[0.03] flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-500 flex items-center justify-center text-[8px] font-black text-white">
                        {posterName ? posterName.charAt(0).toUpperCase() : '?'}
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {isOwner ? 'You' : (posterName || 'Verified User')}
                      </span>
                      <Shield className="w-2.5 h-2.5 text-blue-400/50" />
                    </div>
                    {!isOwner && user && (
                      <span className="text-[10px] font-bold text-blue-400/70 flex items-center gap-1">
                        <Eye className="w-3 h-3" /> View
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="col-span-full text-center py-16 text-slate-500 bg-white/[0.02] border border-white/[0.05] rounded-2xl p-8">
              <AlertCircle className="w-8 h-8 text-slate-700 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-400">No reports found.</p>
              <p className="text-xs text-slate-600 mt-1">Try resetting your filters or adjusting your search.</p>
            </div>
          )}
        </div>
      )}

      {selectedItem && (
        <ItemModal item={selectedItem} onClose={() => setSelectedItem(null)} onActionSuccess={handleActionSuccess} />
      )}

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
