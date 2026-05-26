import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Bell, Search, Menu, PlusCircle, X, MessageSquare, Sparkles, Check, MessageCircle, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const searchQuery = searchParams.get('q') || '';
  const [searchVal, setSearchVal] = useState(searchQuery);

  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const notifRef = useRef(null);

  // Sync search input with searchParams (e.g. if cleared from feed)
  useEffect(() => {
    setSearchVal(searchQuery);
  }, [searchQuery]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchVal(val);
    if (location.pathname !== '/') {
      navigate(`/?q=${encodeURIComponent(val)}`);
    } else {
      if (val) {
        setSearchParams({ q: val });
      } else {
        setSearchParams({});
      }
    }
  };

  // Fetch match notifications
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const matches = await api.getNotifications(user.id);
      setNotifications(matches);
      // Count unread matches (status === 'PENDING')
      const pending = matches.filter((m) => m.status === 'PENDING');
      setUnreadCount(pending.length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Poll notifications every 10 seconds for real-time matches
      const interval = setInterval(fetchNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Click outside notification container to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotif(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (e, matchId) => {
    e.stopPropagation();
    try {
      await api.markNotificationRead(matchId);
      // Optimistically update
      setNotifications((prev) =>
        prev.map((n) => (n.id === matchId ? { ...n, status: 'NOTIFIED' } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  // Identifies which item belongs to user and which is the matched one
  const resolveMatchDetails = (match) => {
    const isLostMine = match.lostItem.userId === user?.id;
    const myItem = isLostMine ? match.lostItem : match.foundItem;
    const matchedItem = isLostMine ? match.foundItem : match.lostItem;
    return {
      myItem,
      matchedItem,
      matchedType: matchedItem.type,
      contactName: matchedItem.user?.name || 'KGPian',
      whatsapp: matchedItem.user?.whatsappNumber || '000000000',
    };
  };

  return (
    <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
                K
              </div>
              <span className="text-lg font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
                KGP Find
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-6">
            {/* Search Input bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search items, locations..."
                value={searchVal}
                onChange={handleSearchChange}
                className="bg-slate-800/50 text-xs text-slate-200 rounded-full pl-10 pr-4 py-2 border border-slate-700/60 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all w-64 placeholder:text-slate-500 font-medium"
              />
              {searchVal && (
                <button
                  onClick={() => {
                    setSearchVal('');
                    setSearchParams({});
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {isAdmin && (
              <Link
                to="/admin"
                className="flex items-center gap-1.5 text-xs font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-4 py-2 rounded-full transition-colors cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5" />
                Admin
              </Link>
            )}

            <Link
              to="/report"
              className="flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-full transition-colors shadow-lg shadow-blue-600/10 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Report Item
            </Link>

            {user ? (
              <div className="flex items-center gap-4 relative" ref={notifRef}>
                {/* Bell notification button */}
                <button
                  onClick={() => setShowNotif(!showNotif)}
                  className="relative p-2 text-slate-400 hover:text-white transition-colors cursor-pointer bg-slate-800/20 hover:bg-slate-800/60 border border-slate-800/40 rounded-xl"
                >
                  <Bell className="w-4.5 h-4.5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 border border-slate-900 rounded-full text-xxs font-black text-white flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications dropdown list */}
                {showNotif && (
                  <div className="absolute right-0 top-12 w-80 bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-3.5 border-b border-slate-800 bg-slate-950/20 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Notifications
                      </span>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/10 rounded-full text-xxs font-semibold">
                          {unreadCount} new match{unreadCount > 1 ? 'es' : ''}
                        </span>
                      )}
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60">
                      {notifications.map((match) => {
                        const { myItem, matchedItem, matchedType, contactName, whatsapp } = resolveMatchDetails(match);
                        const isPending = match.status === 'PENDING';
                        const scorePct = Math.round(match.matchScore * 100);

                        return (
                          <div
                            key={match.id}
                            className={`p-3.5 transition-colors text-left space-y-2 hover:bg-slate-850/30 ${
                              isPending ? 'bg-blue-500/5' : ''
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-xxs font-extrabold text-blue-400 uppercase tracking-wider">
                                Potential Match
                              </span>
                              <span className="text-xxs font-black text-slate-500">
                                {scorePct}% score
                              </span>
                            </div>

                            <p className="text-xxs text-slate-300 leading-normal">
                              Someone reported finding a{' '}
                              <strong className="text-slate-100">{matchedItem.title}</strong>{' '}
                              matching your lost{' '}
                              <span className="text-slate-400 font-semibold">{myItem.title}</span>.
                            </p>

                            <div className="flex items-center gap-2 pt-1">
                              <a
                                href={`https://wa.me/${whatsapp}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xxs font-bold text-center flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <MessageCircle className="w-3.5 h-3.5" /> Chat
                              </a>
                              {isPending && (
                                <button
                                  onClick={(e) => handleMarkAsRead(e, match.id)}
                                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xxs font-semibold flex items-center gap-1 cursor-pointer border border-slate-700/50"
                                  title="Mark as Read"
                                >
                                  <Check className="w-3.5 h-3.5" /> Read
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {notifications.length === 0 && (
                        <div className="py-10 text-center text-slate-500 space-y-2">
                          <Bell className="w-8 h-8 mx-auto text-slate-750" />
                          <p className="text-xs font-semibold">No matches yet</p>
                          <p className="text-xxs text-slate-600">We'll alert you as soon as keywords align.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Profile dropdown */}
                <div className="flex items-center gap-3 relative group">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-emerald-600 border border-slate-700/80 flex items-center justify-center text-xs font-black shadow-inner cursor-pointer text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  {/* Dropdown menu */}
                  <div className="absolute right-0 top-10 w-48 bg-slate-850 border border-slate-750 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 overflow-hidden">
                    <div className="p-3 border-b border-slate-850/60 bg-slate-900/30">
                      <p className="text-xs text-white font-bold truncate">{user.name}</p>
                      <p className="text-xxs text-slate-450 truncate mt-0.5">{user.email}</p>
                    </div>
                    <button
                      onClick={logout}
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 rounded-b-xl transition-colors cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link
                to="/login"
                className="text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700/80 px-4 py-2 rounded-full transition-colors shadow-lg cursor-pointer"
              >
                Sign In
              </Link>
            )}
          </div>

          <div className="md:hidden flex items-center gap-3">
            {user && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-emerald-600 border border-slate-700 flex items-center justify-center text-xxs font-black text-white">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <button className="text-slate-300">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

