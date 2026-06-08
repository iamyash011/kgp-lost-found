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

  useEffect(() => {
    fetchItems();
  }, []);

  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
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
    <div className="page-container relative">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-6 z-50" style={{ animation: 'modalIn 0.2s ease-out' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderRadius: '12px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px var(--shadow-color)', color: toast.type === 'error' ? 'var(--badge-lost-text)' : 'var(--badge-found-text)' }}>
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <Info className="w-4 h-4 shrink-0" />}
            <span style={{ fontSize: '14px', fontWeight: '500' }}>{toast.message}</span>
            <button onClick={() => setToast(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="feed-header">
        <div>
          <h1 className="font-heading" style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0' }}>
            Recent Activity
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>Help your fellow KGPians find their lost belongings.</p>
        </div>
      </div>

      <div className="filters-section">
        <div className="segmented-control">
          {['ALL', 'LOST', 'FOUND'].map((f) => (
            <button key={f}
              onClick={() => { setActiveFilter(f); trackFilterChange('type', f); }}
              className={`segment-btn ${activeFilter === f ? 'active' : ''}`}>
              {f === 'ALL' ? 'All Items' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Category filter pills */}
        <div className="category-scroll">
          {CATEGORIES.map((cat) => (
            <button key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`category-chip ${activeCategory === cat ? 'active' : ''}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Search indicator */}
      {searchQuery && (
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: '8px 16px', borderRadius: '12px', width: 'fit-content' }}>
          <Search className="w-4 h-4 shrink-0" />
          <span>Showing results for <span style={{ fontWeight: 'bold', color: 'var(--accent-blue)' }}>"{searchQuery}"</span></span>
          <button onClick={() => {
            const url = new URL(window.location.href);
            url.searchParams.delete('q');
            window.history.pushState({}, '', url.pathname);
            window.dispatchEvent(new Event('popstate'));
          }} style={{ marginLeft: '8px', padding: '4px 8px', background: 'var(--chip-active-bg)', color: 'var(--accent-blue)', borderRadius: '4px', border: 'none', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>Clear</button>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: 'var(--text-secondary)' }}>
          Loading...
        </div>
      ) : (
        <div className="items-grid">
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
                className="item-card"
                style={{ cursor: 'pointer' }}
              >
                <div className="card-image-area">
                  {displayImg ? (
                    <img src={displayImg} alt={item.title} style={{ filter: item.sensitiveImage ? 'blur(8px)' : 'none' }} />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--text-metadata)' }}>
                      <ImageIcon className="w-8 h-8 opacity-30" strokeWidth={1.5} />
                    </div>
                  )}

                  <span className={`status-badge ${item.type === 'LOST' ? 'lost' : 'found'}`}>{item.type}</span>
                  
                  {item.reward && (
                    <div className="reward-badge">
                      <span>₹</span> {item.reward}
                    </div>
                  )}
                </div>

                <div className="card-body">
                  <h3 className="card-title">
                    <HighlightText text={item.title} highlight={searchQuery} />
                  </h3>
                  <p className="card-desc">
                    <HighlightText text={item.description} highlight={searchQuery} />
                  </p>

                  {item.category && (
                    <span className="card-tag">
                      {item.category}
                    </span>
                  )}

                  <div style={{ marginTop: 'auto' }}>
                    <div className="card-meta-row">
                      <MapPin />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <HighlightText text={item.location} highlight={searchQuery} />
                      </span>
                    </div>
                    <div className="card-meta-row">
                      <Clock />
                      <span>{timeAgo(item.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="card-footer">
                  <div className="card-user">
                    <div className="card-user-avatar">
                      {posterName ? posterName.charAt(0).toUpperCase() : '?'}
                    </div>
                    <span className="card-user-name">
                      {isOwner ? 'You' : (posterName || 'Verified User')}
                    </span>
                  </div>
                  
                  <span className="card-view-link">
                    View →
                  </span>
                </div>
              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '64px 0', color: 'var(--text-secondary)' }}>
              <AlertCircle className="w-8 h-8 mx-auto mb-3" style={{ opacity: 0.5 }} />
              <p style={{ fontSize: '16px', fontWeight: '500' }}>No reports found.</p>
              <p style={{ fontSize: '12px' }}>Try resetting your filters or adjusting your search.</p>
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
      `}</style>
    </div>
  );
}
