import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapPin, Clock, X, MessageCircle, Tag, AlertCircle, CheckCircle, Trash2, CheckCircle2, Info, Search, Image as ImageIcon } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getStandardLocation, getSynonymsForLocation } from '../utils/locations';

// Simple time formatter
const timeAgo = (dateString) => {
  const date = new Date(dateString);
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
};

// Keyword Highlighter component
function HighlightText({ text, highlight }) {
  if (!text) return null;
  if (!highlight || !highlight.trim()) return <span>{text}</span>;
  
  const regex = new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <span>
      {parts.map((part, index) => 
        regex.test(part) ? (
          <mark key={index} className="bg-blue-500/30 text-blue-200 font-semibold px-0.5 rounded">
            {part}
          </mark>
        ) : (
          part
        )
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

function ItemModal({ item, onClose, onActionSuccess }) {
  if (!item) return null;

  const { user, isAdmin } = useAuth();
  const isLost = item.type === 'LOST';
  const whatsappNumber = item.user?.whatsappNumber || '0000000000';
  const contactName = item.user?.name || 'Unknown';
  const isOwner = item.userId === user?.id;

  const images = getImages(item.imageUrl);
  const [activeImgIdx, setActiveImgIdx] = useState(0);

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      {/* Modal panel */}
      <div
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl overflow-hidden shadow-2xl shadow-black/70 animate-in"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'modalIn 0.2s ease-out' }}
      >
        {/* Image header */}
        <div className="relative h-56 overflow-hidden bg-slate-950">
          {images.length > 0 ? (
            <img 
              src={images[activeImgIdx].startsWith('http') ? images[activeImgIdx] : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${images[activeImgIdx]}`} 
              alt={item.title} 
              className="w-full h-full object-cover transition-all duration-300" 
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 border-b border-slate-800/80 text-slate-500">
              <ImageIcon className="w-12 h-12 mb-2 text-slate-700" />
              <span className="text-xs font-semibold">No Images Uploaded</span>
            </div>
          )}

          {/* Carousel arrows */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImgIdx((prev) => (prev === 0 ? images.length - 1 : prev - 1));
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/60 backdrop-blur-sm border border-slate-750 flex items-center justify-center text-white hover:bg-slate-900 transition-all cursor-pointer z-10 font-bold"
              >
                &larr;
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImgIdx((prev) => (prev === images.length - 1 ? 0 : prev + 1));
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/60 backdrop-blur-sm border border-slate-750 flex items-center justify-center text-white hover:bg-slate-900 transition-all cursor-pointer z-10 font-bold"
              >
                &rarr;
              </button>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 bg-slate-950/40 backdrop-blur-sm px-2.5 py-1 rounded-full border border-slate-800/60">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setActiveImgIdx(idx); }}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${idx === activeImgIdx ? 'bg-blue-400 w-3' : 'bg-slate-500'}`}
                  />
                ))}
              </div>
            </>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/30 to-transparent" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-slate-900/80 backdrop-blur-sm border border-slate-700/60 rounded-full flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Type badge */}
          <div className="absolute top-4 left-4">
            <span className={`px-3 py-1 rounded-full text-xs font-extrabold tracking-wide shadow-lg border ${
              isLost
                ? 'bg-red-500/20 text-red-300 border-red-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
            }`}>
              {item.type}
            </span>
          </div>

          {/* Status badge if resolved */}
          {item.status === 'RESOLVED' && (
            <div className="absolute top-4 left-24">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold tracking-wide shadow-lg border bg-blue-500/20 text-blue-300 border-blue-500/30 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Resolved
              </span>
            </div>
          )}

          {/* Title over image */}
          <div className="absolute bottom-4 left-5 right-5">
            <h2 className="text-2xl font-bold text-white leading-tight">{item.title}</h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Description */}
          <div>
            <p className="text-slate-300 text-sm leading-relaxed">{item.description}</p>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-start gap-3 bg-slate-800/40 border border-slate-750/50 rounded-xl p-3">
              <MapPin className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xxs text-slate-500 mb-0.5">{isLost ? 'Expected near' : 'Found at'}</p>
                <p className="text-xs text-slate-200 font-semibold">{item.location}</p>
              </div>
            </div>

            {item.identifyingMarks && (
              <div className="flex items-start gap-3 bg-slate-800/40 border border-slate-750/50 rounded-xl p-3">
                <Tag className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xxs text-slate-500 mb-0.5">Identifying Marks</p>
                  <p className="text-xs text-slate-200 font-semibold">{item.identifyingMarks}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 bg-slate-800/40 border border-slate-750/50 rounded-xl p-3">
              <Clock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xxs text-slate-500 mb-0.5">Posted</p>
                <p className="text-xs text-slate-200 font-semibold">{timeAgo(item.createdAt)} by {isOwner ? 'You' : contactName}</p>
              </div>
            </div>
          </div>

          {/* Admin Actions */}
          {isAdmin && !isOwner && (
            <div className="bg-red-950/20 border border-red-900/50 rounded-2xl p-4 space-y-3 mb-4">
              <div className="flex items-center gap-2 text-xs text-red-400 font-bold">
                <AlertCircle className="w-4 h-4" />
                <span>Admin Controls</span>
              </div>
              <button
                onClick={async () => {
                  if (window.confirm('ADMIN OVERRIDE: Are you sure you want to delete this report permanently?')) {
                    try {
                      await api.deleteItem(item.id);
                      onActionSuccess('Report deleted by Admin.', 'info');
                      onClose();
                    } catch (err) {
                      onActionSuccess('Failed to delete report.', 'error');
                    }
                  }
                }}
                className="w-full py-2.5 bg-red-900/40 hover:bg-red-800/50 text-red-300 border border-red-700/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Force Delete Report
              </button>
            </div>
          )}

          {/* Info note / Actions */}
          {isOwner ? (
            <div className="bg-slate-800/20 border border-slate-700/50 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
                <Info className="w-4 h-4 text-blue-400" />
                <span>You reported this item. What would you like to do?</span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  {item.status === 'ACTIVE' && (
                    <button
                      onClick={async () => {
                        try {
                          await api.resolveItem(item.id);
                          onActionSuccess('Item marked as resolved successfully!', 'success');
                          onClose();
                        } catch (err) {
                          onActionSuccess('Failed to resolve item.', 'error');
                        }
                      }}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Mark Resolved
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to delete this report permanently?')) {
                        try {
                          await api.deleteItem(item.id);
                          onActionSuccess('Report deleted successfully.', 'info');
                          onClose();
                        } catch (err) {
                          onActionSuccess('Failed to delete report.', 'error');
                        }
                      }
                    }}
                    className="flex-1 py-2.5 bg-red-950/40 hover:bg-red-900/30 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" /> Delete Report
                  </button>
                </div>

                {/* Wipe images button to reclaim space */}
                {item.status === 'RESOLVED' && images.length > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm('Wipe uploaded image files from server storage to reclaim space?')) {
                        try {
                          await api.purgeImages(item.id);
                          onActionSuccess('Uploaded images wiped successfully from server storage!', 'info');
                          onClose();
                        } catch (err) {
                          onActionSuccess('Failed to wipe images.', 'error');
                        }
                      }
                    }}
                    className="w-full py-2.5 bg-yellow-600/10 hover:bg-yellow-600/20 text-yellow-400 border border-yellow-500/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" /> Wipe Images to Save Space
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className={`flex items-start gap-2 rounded-xl p-3 border ${
                isLost
                  ? 'bg-red-500/10 border-red-500/20'
                  : 'bg-emerald-500/10 border-emerald-500/20'
              }`}>
                <AlertCircle className={`w-4 h-4 mt-0.5 shrink-0 ${isLost ? 'text-red-400' : 'text-emerald-400'}`} />
                <p className="text-xs text-slate-300 leading-relaxed">
                  {isLost
                    ? 'If you have found this item, reach out to the owner directly via WhatsApp to coordinate return.'
                    : 'If this is your item, contact the finder via WhatsApp to claim it.'}
                </p>
              </div>

              {/* WhatsApp CTA */}
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-green-600 hover:bg-green-500 text-white font-semibold text-sm transition-all shadow-lg shadow-green-900/35 cursor-pointer active:scale-[0.99]"
              >
                <MessageCircle className="w-5 h-5" />
                Contact {contactName} on WhatsApp
              </a>
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

export default function Feed() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';

  const [selectedItem, setSelectedItem] = useState(null);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Toast feedback state
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await api.getItems('ALL');
      setItems(data);
    } catch (error) {
      // Silently handle — backend may not be available yet
      console.error('Error fetching items:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter items in frontend to support search, tags, and dynamic user reporting manager
  const filteredItems = items.filter((item) => {
    // 1. Filter by user reports tab vs public feed tabs
    if (activeFilter === 'MY_REPORTS') {
      if (item.userId !== user?.id) return false;
    } else {
      // In public feed, only show active ones
      if (item.status !== 'ACTIVE') return false;
      // Filter by type if not ALL
      if (activeFilter !== 'ALL' && item.type !== activeFilter) return false;
    }

    // 2. Filter by search query if it exists (Using Synonym Engine)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      
      // Expand query using synonyms for location matching
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
    // Refresh feed to update status/content
    fetchItems();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
      {/* Toast Alert popup */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 animate-bounce duration-500">
          <div className={`flex items-center gap-3 px-5 py-4 border rounded-2xl shadow-2xl backdrop-blur-xl ${
            toast.type === 'success' 
              ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-200' 
              : toast.type === 'error'
              ? 'bg-red-950/80 border-red-500/30 text-red-200'
              : 'bg-blue-950/80 border-blue-500/30 text-blue-200'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 animate-pulse" />
            ) : (
              <Info className="w-5 h-5 text-blue-400 shrink-0" />
            )}
            <span className="text-xs font-semibold">{toast.message}</span>
            <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white ml-2">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight bg-gradient-to-r from-blue-100 to-slate-200 bg-clip-text">
            Recent Activity
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Help your fellow KGPians find their lost belongings.</p>
        </div>

        <div className="flex bg-slate-800/40 p-1 rounded-xl backdrop-blur-sm border border-slate-700/40">
          {['ALL', 'LOST', 'FOUND', ...(user ? ['MY_REPORTS'] : [])].map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-5 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeFilter === f
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {f === 'ALL'
                ? 'All Items'
                : f === 'MY_REPORTS'
                ? 'My Reports'
                : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {searchQuery && (
        <div className="mb-6 flex items-center gap-2 text-xs font-medium text-slate-400 bg-blue-500/5 border border-blue-500/10 py-2.5 px-4 rounded-xl w-fit">
          <Search className="w-4 h-4 text-blue-400 shrink-0" />
          <span>Showing results matching "<span className="text-blue-300 font-bold">{searchQuery}</span>"</span>
          <button 
            onClick={() => {
              // Clear search params
              const url = new URL(window.location.href);
              url.searchParams.delete('q');
              window.history.pushState({}, '', url.pathname);
              // Trigger a state change to re-render
              window.dispatchEvent(new Event('popstate'));
            }}
            className="ml-2 px-1.5 py-0.5 bg-blue-500/15 hover:bg-blue-500/30 text-blue-300 rounded font-semibold text-xxs"
          >
            Clear
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
            <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => {
            const isOwner = item.userId === user?.id;
            const images = getImages(item.imageUrl);
            const displayImg = images.length > 0
              ? (images[0].startsWith('http') ? images[0] : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${images[0]}`)
              : null;

            return (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="group flex flex-col bg-slate-800/20 border border-slate-700/50 rounded-2xl overflow-hidden hover:bg-slate-800/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/5 cursor-pointer relative"
              >
                <div className="relative h-48 overflow-hidden bg-slate-900 border-b border-slate-800/50">
                  {displayImg ? (
                    <img src={displayImg} alt={item.title} className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800/30 text-slate-600 group-hover:text-slate-500 transition-colors">
                      <ImageIcon className="w-10 h-10 mb-2 opacity-40" strokeWidth={1.5} />
                      <span className="text-xs font-semibold tracking-wide opacity-40">No Image</span>
                    </div>
                  )}
                  
                  {/* Type badge */}
                  <div className="absolute top-3 left-3">
                    <span className={`px-2.5 py-1 rounded-full text-xxs font-extrabold tracking-wider border ${
                      item.type === 'LOST'
                        ? 'bg-red-500/20 text-red-300 border-red-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    }`}>
                      {item.type}
                    </span>
                  </div>

                  {/* Owner badge */}
                  {isOwner && (
                    <div className="absolute top-3 right-3">
                      <span className="px-2.5 py-1 rounded-full text-xxs font-extrabold tracking-wider border bg-purple-500/20 text-purple-300 border-purple-500/30">
                        Yours
                      </span>
                    </div>
                  )}

                  {/* Status badge */}
                  {item.status === 'RESOLVED' && (
                    <div className="absolute bottom-3 left-3">
                      <span className="px-2.5 py-1 rounded-full text-xxs font-extrabold tracking-wider border bg-blue-500/20 text-blue-300 border-blue-500/30 flex items-center gap-1 shadow-lg">
                        <CheckCircle className="w-3 h-3" /> Resolved
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-5 flex flex-col flex-grow">
                  <h3 className="text-md font-bold text-slate-100 line-clamp-1 group-hover:text-blue-400 transition-colors">
                    <HighlightText text={item.title} highlight={searchQuery} />
                  </h3>
                  <p className="text-xs text-slate-400 mt-2.5 line-clamp-2 flex-grow leading-relaxed">
                    <HighlightText text={item.description} highlight={searchQuery} />
                  </p>

                  <div className="mt-4 pt-4 border-t border-slate-700/40 flex flex-col gap-2.5">
                    <div className="flex items-center text-xxs text-slate-400 font-medium">
                      <MapPin className="w-3.5 h-3.5 mr-1.5 text-blue-400 shrink-0" />
                      <span className="truncate">
                        <HighlightText text={item.location} highlight={searchQuery} />
                      </span>
                    </div>
                    <div className="flex items-center text-xxs text-slate-500">
                      <Clock className="w-3.5 h-3.5 mr-1.5" />
                      <span>{timeAgo(item.createdAt)}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-700/20 flex items-center justify-between">
                    <span className="text-xxs text-slate-500">
                      {isOwner ? 'Posted by You' : `By ${item.user?.name || 'Unknown'}`}
                    </span>
                    {!isOwner && (
                      <a
                        href={`https://wa.me/${item.user?.whatsappNumber}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xxs font-bold text-green-400 hover:text-green-300 flex items-center gap-1 bg-green-500/10 hover:bg-green-500/20 px-2.5 py-1 rounded-lg transition-colors border border-green-500/15"
                        onClick={(e) => e.stopPropagation()}
                      >
                        WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {filteredItems.length === 0 && (
            <div className="col-span-full text-center py-16 text-slate-400 bg-slate-800/10 border border-slate-750/30 rounded-3xl p-8">
              <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-300">No reports found.</p>
              <p className="text-xs text-slate-500 mt-1">Try resetting your filters or adjusting your search queries.</p>
            </div>
          )}
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemModal 
          item={selectedItem} 
          onClose={() => setSelectedItem(null)} 
          onActionSuccess={handleActionSuccess}
        />
      )}
    </div>
  );
}

