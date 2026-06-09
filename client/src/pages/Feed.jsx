import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { MapPin, Clock, X, Tag, AlertCircle, CheckCircle, Trash2, CheckCircle2, Info, Search, Image as ImageIcon, Flag, Shield, Fingerprint, MessageCircle, Zap, Image, Lock } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getStandardLocation, getSynonymsForLocation } from '../utils/locations';
import { trackSearch, trackFilterChange, trackItemView } from '../utils/analytics';
import { timeAgo } from '../utils/timeAgo';
import ClaimModal from '../components/ClaimModal';
import ReportModal from '../components/ReportModal';
import ItemCard from '../components/ItemCard';
import HighlightText from '../components/HighlightText';

const getImages = (imageUrlString) => {
  if (!imageUrlString) return [];
  try {
    const parsed = JSON.parse(imageUrlString);
    return Array.isArray(parsed) ? parsed : [imageUrlString];
  } catch (e) {
    return [imageUrlString];
  }
};

const CATEGORIES = [
  'All', 'Electronics', 'Documents & IDs', 'Clothing & Accessories', 'Bags & Wallets',
  'Keys', 'Stationery', 'Sports Equipment', 'Books', 'Water Bottles', 'Other',
];

// Reusing existing ItemModal with some style updates
function ItemModal({ item, onClose, onActionSuccess }) {
  // (Keep the existing ItemModal logic, just ensure it renders with the dark theme and glassmorphism)
  // To save space, we will just copy the previous ItemModal implementation here but styled.
  // ... (Full implementation below)
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
      <div className="animate-modal" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }} onClick={onClose}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '560px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-medium)', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }} onClick={(e) => e.stopPropagation()}>
          
          {/* Image Header */}
          <div style={{ position: 'relative', height: '240px', backgroundColor: 'var(--bg-tertiary)', overflow: 'hidden' }}>
            {images.length > 0 ? (
              <img src={images[activeImgIdx].startsWith('http') ? images[activeImgIdx] : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${images[activeImgIdx]}`} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: item.sensitiveImage && !isOwner && !isAdmin ? 'blur(12px)' : 'none' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <ImageIcon size={40} style={{ opacity: 0.4, marginBottom: '8px' }} />
                <span style={{ fontSize: '12px', fontWeight: '600' }}>No Images Uploaded</span>
              </div>
            )}
            
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--bg-secondary), transparent)' }} />
            
            <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', width: '32px', height: '32px', backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
              <X size={16} />
            </button>

            <div style={{ position: 'absolute', bottom: '16px', left: '20px', right: '20px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <span style={{ backgroundColor: isLost ? 'rgba(247, 89, 89, 0.15)' : 'rgba(79, 142, 247, 0.15)', color: isLost ? 'var(--accent-red)' : 'var(--accent-blue)', border: `1px solid ${isLost ? 'rgba(247, 89, 89, 0.25)' : 'rgba(79, 142, 247, 0.25)'}`, padding: '4px 10px', borderRadius: '999px', fontSize: '10px', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {item.type}
                </span>
                {item.status === 'RESOLVED' && (
                  <span style={{ backgroundColor: 'rgba(79, 142, 247, 0.15)', color: 'var(--accent-blue)', border: '1px solid rgba(79, 142, 247, 0.25)', padding: '4px 10px', borderRadius: '999px', fontSize: '10px', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle size={12} /> Resolved
                  </span>
                )}
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>{item.title}</h2>
            </div>
          </div>

          <div style={{ padding: '24px', maxHeight: '50vh', overflowY: 'auto' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: 1.6, margin: '0 0 24px 0' }}>{item.description}</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '12px' }}>
                <MapPin size={16} color="var(--accent-blue)" style={{ marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{isLost ? 'Expected near' : 'Found at'}</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{item.location}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '12px' }}>
                <Clock size={16} color="var(--text-muted)" style={{ marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Posted</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{timeAgo(item.createdAt)} by {isOwner ? 'You' : displayName}</div>
                </div>
              </div>
            </div>

            {isOwner ? (
               <div style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                   <Info size={16} color="var(--accent-blue)" /> You reported this item
                 </div>
                 <div style={{ display: 'flex', gap: '12px' }}>
                   {item.status === 'ACTIVE' && (
                     <button onClick={async () => {
                       try { await api.resolveItem(item.id); onActionSuccess('Marked as resolved!', 'success'); onClose(); } catch (err) { onActionSuccess('Failed.', 'error'); }
                     }} style={{ flex: 1, padding: '12px', backgroundColor: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                       <CheckCircle2 size={16} /> Resolve
                     </button>
                   )}
                   <button onClick={async () => {
                     if (window.confirm('Delete this report permanently?')) {
                       try { await api.deleteItem(item.id); onActionSuccess('Deleted.', 'info'); onClose(); } catch (err) { onActionSuccess('Failed.', 'error'); }
                     }
                   }} style={{ flex: 1, padding: '12px', backgroundColor: 'rgba(247, 89, 89, 0.1)', color: 'var(--accent-red)', border: '1px solid rgba(247, 89, 89, 0.2)', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                     <Trash2 size={16} /> Delete
                   </button>
                 </div>
               </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {user && item.status === 'ACTIVE' && (
                  <button onClick={() => setShowClaimModal(true)} className="btn-gold" style={{ width: '100%', py: '14px' }}>
                    <Fingerprint size={16} />
                    {isLost ? "I Found This Item" : "This Might Be Mine"}
                  </button>
                )}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '12px', backgroundColor: 'rgba(79, 142, 247, 0.05)', border: '1px solid rgba(79, 142, 247, 0.15)', borderRadius: '12px' }}>
                  <Shield size={16} color="var(--accent-blue)" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    Contact details are protected. Submit a claim with identifying proof — once accepted, WhatsApp contact will be unlocked.
                  </p>
                </div>
                {user && (
                  <button onClick={() => setShowReportModal(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', padding: '12px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: '500', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                    <Flag size={14} /> Report this post
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {showClaimModal && <ClaimModal item={item} onClose={() => setShowClaimModal(false)} onSuccess={() => { onActionSuccess('Claim submitted!', 'success'); onClose(); }} />}
      {showReportModal && <ReportModal targetType="ITEM" targetId={item.id} targetTitle={item.title} onClose={() => setShowReportModal(false)} onSuccess={() => onActionSuccess('Report submitted.', 'info')} />}
    </>
  );
}



// ═══════════════════════════════════════════════════════
// Main Feed (Post-Login)
// ═══════════════════════════════════════════════════════
export default function Feed() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';

  const [selectedItem, setSelectedItem] = useState(null);
  const [itemToReport, setItemToReport] = useState(null);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [activeCategory, setActiveCategory] = useState('All');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const filteredItems = items.filter((item) => {
    if (item.status !== 'ACTIVE') return false;
    if (activeFilter !== 'ALL' && item.type !== activeFilter) return false;
    if (activeCategory !== 'All' && item.category !== activeCategory) return false;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const standardSearchLoc = getStandardLocation(query);
      const searchWords = standardSearchLoc ? [...new Set([query, ...getSynonymsForLocation(standardSearchLoc)])] : [query];
      const titleMatch = searchWords.some(w => item.title?.toLowerCase().includes(w));
      const descMatch = searchWords.some(w => item.description?.toLowerCase().includes(w));
      const locMatch = searchWords.some(w => item.location?.toLowerCase().includes(w));
      return titleMatch || descMatch || locMatch;
    }
    return true;
  });



  return (
    <div className="page-container" style={{ padding: '40px 24px', display: 'flex', gap: '32px' }}>
      
      {/* Left Sidebar (Desktop) */}
      <aside style={{ width: '260px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '32px' }} className="hidden lg:flex">
        
        <div>
          <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Status</div>
          <div style={{ display: 'flex', backgroundColor: 'var(--bg-tertiary)', padding: '4px', borderRadius: '10px' }}>
            {['ALL', 'LOST', 'FOUND'].map(f => (
              <button key={f} onClick={() => setActiveFilter(f)} style={{ flex: 1, padding: '8px', fontSize: '13px', fontWeight: '600', backgroundColor: activeFilter === f ? 'var(--bg-secondary)' : 'transparent', color: activeFilter === f ? 'var(--accent-gold)' : 'var(--text-secondary)', border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: activeFilter === f ? '0 2px 4px rgba(0,0,0,0.1)' : 'none' }}>
                {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Category</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={{ textAlign: 'left', padding: '10px 12px', fontSize: '14px', backgroundColor: activeCategory === cat ? 'var(--accent-gold-dim)' : 'transparent', color: activeCategory === cat ? 'var(--accent-gold)' : 'var(--text-primary)', border: activeCategory === cat ? '1px solid var(--accent-gold)' : '1px solid transparent', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', fontWeight: activeCategory === cat ? '600' : '400' }}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Features Box */}
        <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Why KGP Find?</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ backgroundColor: 'var(--accent-gold-dim)', color: 'var(--accent-gold)', padding: '6px', borderRadius: '8px' }}><Zap size={16} /></div>
              <div><h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '2px', margin: 0, color: 'var(--text-primary)' }}>Smart Matches</h4><p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>Auto-matching system connects lost & found instantly.</p></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ backgroundColor: 'rgba(79, 142, 247, 0.1)', color: 'var(--accent-blue)', padding: '6px', borderRadius: '8px' }}><Shield size={16} /></div>
              <div><h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '2px', margin: 0, color: 'var(--text-primary)' }}>Privacy First</h4><p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>Contact info hidden until claims are verified.</p></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ backgroundColor: 'rgba(247, 89, 89, 0.1)', color: 'var(--accent-red)', padding: '6px', borderRadius: '8px' }}><Lock size={16} /></div>
              <div><h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '2px', margin: 0, color: 'var(--text-primary)' }}>KGP Exclusive</h4><p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>Only @iitkgp emails. 100% spam-free.</p></div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, minWidth: 0 }}>
        
        {/* Mobile Filters Horizontal Scroll */}
        <div className="lg:hidden mb-6" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
          {['ALL', 'LOST', 'FOUND'].map(f => (
            <button key={f} onClick={() => setActiveFilter(f)} style={{ flexShrink: 0, padding: '8px 16px', fontSize: '13px', fontWeight: '600', backgroundColor: activeFilter === f ? 'var(--accent-gold-dim)' : 'var(--bg-tertiary)', color: activeFilter === f ? 'var(--accent-gold)' : 'var(--text-secondary)', border: activeFilter === f ? '1px solid var(--accent-gold)' : '1px solid transparent', borderRadius: '8px' }}>
              {f === 'ALL' ? 'All Items' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
          {CATEGORIES.map(cat => (
             <button key={cat} onClick={() => setActiveCategory(cat)} style={{ flexShrink: 0, padding: '8px 16px', fontSize: '13px', backgroundColor: activeCategory === cat ? 'var(--accent-gold-dim)' : 'var(--bg-tertiary)', color: activeCategory === cat ? 'var(--accent-gold)' : 'var(--text-primary)', border: activeCategory === cat ? '1px solid var(--accent-gold)' : '1px solid transparent', borderRadius: '8px' }}>
               {cat}
             </button>
          ))}
        </div>

        {searchQuery && (
          <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '12px', fontSize: '14px' }}>
            <Search size={16} color="var(--text-secondary)" />
            <span>Search results for <span style={{ color: 'var(--accent-blue)', fontWeight: '600' }}>"{searchQuery}"</span></span>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '64px', color: 'var(--text-muted)' }}>Loading items...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {filteredItems.map(item => (
              <ItemCard key={item.id} item={item} searchQuery={searchQuery} onClick={() => setSelectedItem(item)} onReport={setItemToReport} />
            ))}
            {filteredItems.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '80px 0' }}>
                <AlertCircle size={40} color="var(--text-muted)" style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>No items found</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Try adjusting your search or filters.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {selectedItem && (
        <ItemModal item={selectedItem} onClose={() => setSelectedItem(null)} onActionSuccess={(msg, type) => { fetchItems(); }} />
      )}
      {itemToReport && (
        <ReportModal targetType="ITEM" targetId={itemToReport.id} targetTitle={itemToReport.title} onClose={() => setItemToReport(null)} onSuccess={() => {}} />
      )}
    </div>
  );
}
