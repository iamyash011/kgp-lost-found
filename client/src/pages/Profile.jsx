import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Link } from 'react-router-dom';
import { Trash2, CheckCircle2, Phone, Mail, Clock, ShieldAlert, Shield, Award, Send, Inbox, Eye, EyeOff, MessageCircle, Fingerprint } from 'lucide-react';
import { timeAgo } from '../utils/timeAgo';
import ClaimReviewCard from '../components/ClaimReviewCard';

const TABS = ['My Reports', 'Claims Received', 'Claims Sent'];

const BADGES = [
  { key: 'verified', label: 'Verified Student', icon: Shield, color: 'blue', always: true },
  { key: 'trust3', label: 'Trusted Finder', icon: Award, color: 'emerald', minScore: 3 },
  { key: 'trust5', label: 'Returned 5+ Items', icon: Award, color: 'amber', minScore: 5 },
];

export default function Profile() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [receivedClaims, setReceivedClaims] = useState([]);
  const [sentClaims, setSentClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('My Reports');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [allItems, received, sent] = await Promise.all([
        api.getItems(),
        api.getReceivedClaims(),
        api.getSentClaims(),
      ]);
      const myItems = allItems.filter(item => item.userId === user?.id);
      setItems(myItems);
      setReceivedClaims(received);
      setSentClaims(sent);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const handleResolve = async (id) => {
    try {
      await api.resolveItem(id);
      setItems(prev => prev.map(item => item.id === id ? { ...item, status: 'RESOLVED' } : item));
    } catch (err) {
      alert('Failed to resolve item.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this report permanently?')) {
      try {
        await api.deleteItem(id);
        setItems(prev => prev.filter(item => item.id !== id));
      } catch (err) {
        alert('Failed to delete item.');
      }
    }
  };

  const getImages = (imageUrlString) => {
    if (!imageUrlString) return [];
    try {
      const parsed = JSON.parse(imageUrlString);
      return Array.isArray(parsed) ? parsed : [imageUrlString];
    } catch (e) {
      return [imageUrlString];
    }
  };

  const trustScore = user?.trustScore || 0;
  const earnedBadges = BADGES.filter(b => b.always || (b.minScore && trustScore >= b.minScore));

  const claimStatusColors = {
    PENDING: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
    ACCEPTED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
    REJECTED: 'bg-red-500/15 text-red-300 border-red-500/20',
    MORE_INFO: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Profile Header */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6 mb-6 transition-colors">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-500 flex items-center justify-center text-3xl sm:text-4xl font-black text-white shadow-xl shadow-blue-500/15">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <div className="text-center md:text-left space-y-2 flex-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-heading tracking-tight">{user?.name}</h1>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-5 text-sm text-slate-500 font-medium">
            <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {user?.email}</span>
            {user?.whatsappNumber && (
              <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> +91 {user?.whatsappNumber}</span>
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mt-2 justify-center md:justify-start">
            {earnedBadges.map(badge => (
              <span key={badge.key} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border bg-${badge.color}-500/10 text-${badge.color}-300 border-${badge.color}-500/15`}>
                <badge.icon className="w-3 h-3" /> {badge.label}
              </span>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 shrink-0">
          <div className="text-center">
            <p className="text-2xl font-black text-white">{items.length}</p>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Posts</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-emerald-400">{items.filter(i => i.status === 'RESOLVED').length}</p>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Resolved</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-blue-400">{trustScore}</p>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Trust</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white/[0.03] p-1 rounded-xl mb-6 w-fit border border-white/[0.06] gap-1">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 sm:px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === tab ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-white'
            }`}>
            {tab === 'Claims Received' && <Inbox className="w-3.5 h-3.5" />}
            {tab === 'Claims Sent' && <Send className="w-3.5 h-3.5" />}
            {tab}
            {tab === 'Claims Received' && receivedClaims.filter(c => c.status === 'PENDING').length > 0 && (
              <span className="w-4 h-4 bg-red-500 rounded-full text-[9px] font-black text-white flex items-center justify-center">
                {receivedClaims.filter(c => c.status === 'PENDING').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <>
          {/* My Reports */}
          {activeTab === 'My Reports' && (
            items.length === 0 ? (
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-12 text-center">
                <ShieldAlert className="w-8 h-8 text-blue-500 mx-auto mb-3 opacity-50" />
                <h3 className="text-base font-bold text-white mb-1">No Reports Yet</h3>
                <p className="text-slate-500 mb-5 text-sm max-w-sm mx-auto">You haven't posted any lost or found items.</p>
                <Link to="/report" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-sm transition-colors inline-block">
                  Report an Item
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {items.map(item => {
                  const images = getImages(item.imageUrl);
                  const displayImg = images.length > 0
                    ? (images[0].startsWith('http') ? images[0] : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${images[0]}`)
                    : null;

                  return (
                    <div key={item.id} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden flex flex-col hover:border-white/[0.1] transition-all">
                      <div className="h-36 bg-slate-950 relative">
                        {displayImg ? (
                          <img src={displayImg} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-700 text-xs">No Image</div>
                        )}
                        <div className="absolute top-3 left-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${
                            item.type === 'LOST' ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'
                          }`}>{item.type}</span>
                        </div>
                        {item.status === 'RESOLVED' && (
                          <div className="absolute top-3 right-3">
                            <span className="px-2 py-0.5 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold rounded-lg">RESOLVED</span>
                          </div>
                        )}
                      </div>
                      <div className="p-4 flex-1 flex flex-col">
                        <h3 className="font-bold text-white text-sm mb-1 truncate">{item.title}</h3>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1.5 mb-3">
                          <Clock className="w-3 h-3" /> {timeAgo(item.createdAt)}
                        </p>
                        <div className="mt-auto flex gap-2 pt-3 border-t border-white/[0.04]">
                          {item.status === 'ACTIVE' && (
                            <button onClick={() => handleResolve(item.id)}
                              className="flex-1 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
                            </button>
                          )}
                          <button onClick={() => handleDelete(item.id)}
                            className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* Claims Received */}
          {activeTab === 'Claims Received' && (
            receivedClaims.length === 0 ? (
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-12 text-center">
                <Inbox className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white mb-1">No Claims Yet</h3>
                <p className="text-slate-500 text-sm">When someone claims your item, it'll appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {receivedClaims.map(claim => (
                  <ClaimReviewCard key={claim.id} claim={claim} onUpdate={fetchData} />
                ))}
              </div>
            )
          )}

          {/* Claims Sent */}
          {activeTab === 'Claims Sent' && (
            sentClaims.length === 0 ? (
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-12 text-center">
                <Send className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white mb-1">No Claims Sent</h3>
                <p className="text-slate-500 text-sm">When you claim an item, it'll appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sentClaims.map(claim => (
                  <div key={claim.id} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Fingerprint className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-bold text-white">{claim.item?.title || 'Unknown Item'}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${claimStatusColors[claim.status]}`}>
                        {claim.status === 'MORE_INFO' ? 'More Info Needed' : claim.status}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-500">
                      Submitted {timeAgo(claim.createdAt)}
                    </p>

                    <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Your Proof</p>
                      <p className="text-xs text-slate-300 leading-relaxed">{claim.identifyingInfo}</p>
                    </div>

                    {claim.responseNote && (
                      <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3">
                        <p className="text-[10px] text-amber-400 font-bold mb-0.5">Response from owner:</p>
                        <p className="text-xs text-slate-300 italic">"{claim.responseNote}"</p>
                      </div>
                    )}

                    {/* WhatsApp button for accepted claims */}
                    {claim.status === 'ACCEPTED' && claim.item?.user?.whatsappNumber && (
                      <a
                        href={`https://wa.me/91${claim.item.user.whatsappNumber}?text=${encodeURIComponent(`Hi! I'm reaching out from KGP Find about "${claim.item.title}".`)}`}
                        target="_blank" rel="noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-xs transition-all cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4" /> Contact on WhatsApp
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
