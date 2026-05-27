import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Bell, Search, Menu, PlusCircle, X, Sparkles, Check, MessageCircle, Shield, Sun, Moon, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const searchQuery = searchParams.get('q') || '';
  const [searchVal, setSearchVal] = useState(searchQuery);

  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const matches = await api.getNotifications(user.id);
      setNotifications(matches);
      const pending = matches.filter((m) => m.status === 'PENDING');
      setUnreadCount(pending.length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

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
      setNotifications((prev) =>
        prev.map((n) => (n.id === matchId ? { ...n, status: 'NOTIFIED' } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

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
    <nav className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-emerald-500 rounded-lg flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <Search className="w-4 h-4" strokeWidth={3.5} />
              </div>
              <span className="text-xl tracking-wide font-heading font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-emerald-600 dark:from-blue-400 dark:to-emerald-400">
                KGP Find
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-5">
            {/* Search Input bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search items, locations..."
                value={searchVal}
                onChange={handleSearchChange}
                className="bg-slate-100 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-slate-200 rounded-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700/60 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all w-64 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
              />
              {searchVal && (
                <button
                  onClick={() => {
                    setSearchVal('');
                    setSearchParams({});
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {isAdmin && (
              <Link
                to="/admin"
                className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 border border-amber-200 dark:border-amber-500/20 px-4 py-2.5 rounded-full transition-colors cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5" />
                Admin
              </Link>
            )}

            <Link
              to="/report"
              className="flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-full transition-colors shadow-md shadow-blue-600/20 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Report Item
            </Link>

            <button
              onClick={toggleTheme}
              className="p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              aria-label="Toggle Dark Mode"
            >
              {isDark ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>

            {user ? (
              <div className="flex items-center gap-4 relative" ref={notifRef}>
                {/* Bell notification button */}
                <button
                  onClick={() => setShowNotif(!showNotif)}
                  className="relative p-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer bg-slate-100 dark:bg-slate-800/40 hover:bg-slate-200 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 rounded-xl"
                >
                  <Bell className="w-4.5 h-4.5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 border-2 border-white dark:border-slate-900 rounded-full text-xxs font-black text-white flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications dropdown list */}
                {showNotif && (
                  <div className="absolute right-0 top-14 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" /> Notifications
                      </span>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/10 rounded-full text-xxs font-semibold">
                          {unreadCount} new
                        </span>
                      )}
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                      {notifications.map((match) => {
                        const { myItem, matchedItem, whatsapp } = resolveMatchDetails(match);
                        const isPending = match.status === 'PENDING';
                        const scorePct = Math.round(match.matchScore * 100);

                        return (
                          <div
                            key={match.id}
                            className={`p-3.5 transition-colors text-left space-y-2 hover:bg-slate-50 dark:hover:bg-slate-800/30 ${
                              isPending ? 'bg-blue-50 dark:bg-blue-500/5' : ''
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-xxs font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                                Potential Match
                              </span>
                              <span className="text-xxs font-black text-slate-500">
                                {scorePct}% score
                              </span>
                            </div>
                            <p className="text-xxs text-slate-600 dark:text-slate-300 leading-normal">
                              Someone reported finding a{' '}
                              <strong className="text-slate-900 dark:text-slate-100">{matchedItem.title}</strong>{' '}
                              matching your lost{' '}
                              <span className="text-slate-500 dark:text-slate-400 font-semibold">{myItem.title}</span>.
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
                                  className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xxs font-semibold flex items-center gap-1 cursor-pointer border border-slate-200 dark:border-slate-700/50"
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
                          <Bell className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No matches yet</p>
                          <p className="text-xxs text-slate-500">We'll alert you as soon as keywords align.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Profile dropdown */}
                <div className="flex items-center gap-3 relative group">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-500 flex items-center justify-center text-sm font-black shadow-inner cursor-pointer text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  {/* Dropdown menu */}
                  <div className="absolute right-0 top-10 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 overflow-hidden">
                    <div className="p-3.5 border-b border-slate-100 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-900/30">
                      <p className="text-xs text-slate-900 dark:text-white font-bold truncate">{user.name}</p>
                      <p className="text-xxs text-slate-500 dark:text-slate-400 truncate mt-0.5">{user.email}</p>
                    </div>
                    <Link
                      to="/profile"
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <User className="w-3.5 h-3.5" /> My Profile
                    </Link>
                    <button
                      onClick={logout}
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link
                to="/login"
                className="text-xs font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/80 px-5 py-2.5 rounded-full transition-colors shadow-sm cursor-pointer"
              >
                Sign In
              </Link>
            )}
          </div>

          <div className="md:hidden flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-1.5 text-slate-500 dark:text-slate-400"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            {user && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-500 flex items-center justify-center text-xs font-black text-white shadow-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-slate-600 dark:text-slate-300 p-1">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="px-4 pt-2 pb-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search items, locations..."
                value={searchVal}
                onChange={(e) => { handleSearchChange(e); }}
                className="w-full bg-slate-100 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-slate-200 rounded-xl pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700/60 focus:outline-none focus:border-blue-500/60"
              />
            </div>

            <div className="flex flex-col gap-2">
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 p-3 rounded-xl"
                >
                  <Shield className="w-4 h-4" /> Admin Dashboard
                </Link>
              )}
              
              <Link
                to="/report"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 p-3 rounded-xl shadow-md"
              >
                <PlusCircle className="w-4 h-4" /> Report Item
              </Link>

              {user ? (
                <>
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/50 p-3 rounded-xl"
                  >
                    <User className="w-4 h-4 text-slate-500 dark:text-slate-400" /> My Profile
                  </Link>

                  <button
                    onClick={() => { setShowNotif(!showNotif); }}
                    className="flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/50 p-3 rounded-xl"
                  >
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Notifications
                    </div>
                    {unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => { logout(); setMobileMenuOpen(false); }}
                    className="flex items-center gap-2 text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 p-3 rounded-xl"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 p-3 rounded-xl"
                >
                  Sign In
                </Link>
              )}
            </div>
            
            {user && showNotif && (
              <div className="mt-2 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800/60">
                  {notifications.map((match) => {
                    const { myItem, matchedItem, whatsapp } = resolveMatchDetails(match);
                    const isPending = match.status === 'PENDING';
                    return (
                      <div key={match.id} className={`p-3 ${isPending ? 'bg-blue-50 dark:bg-blue-500/5' : ''}`}>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mb-2">
                          Match for <strong className="text-slate-900 dark:text-slate-100">{myItem.title}</strong>
                        </p>
                        <div className="flex gap-2">
                          <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="flex-1 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold text-center">
                            Chat
                          </a>
                          {isPending && (
                            <button onClick={(e) => handleMarkAsRead(e, match.id)} className="px-3 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold">
                              Read
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {notifications.length === 0 && (
                    <div className="p-4 text-center text-slate-500 text-xs">No matches yet</div>
                  )}
                </div>
              </div>
            )}
            
          </div>
        </div>
      )}
    </nav>
  );
}
