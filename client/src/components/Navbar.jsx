import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Bell, Search, Menu, PlusCircle, X, Sparkles, Check, Shield, Sun, Moon, User, CheckCheck, Fingerprint, MessageCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { timeAgo } from '../utils/timeAgo';

const NOTIF_ICONS = {
  MATCH: Sparkles,
  CLAIM_RECEIVED: Fingerprint,
  CLAIM_ACCEPTED: Check,
  CLAIM_REJECTED: X,
  CLAIM_MORE_INFO: MessageCircle,
  CONTACT_UNLOCKED: MessageCircle,
  ADMIN_ACTION: AlertTriangle,
};

const NOTIF_COLORS = {
  MATCH: 'text-blue-400 bg-blue-500/10',
  CLAIM_RECEIVED: 'text-amber-400 bg-amber-500/10',
  CLAIM_ACCEPTED: 'text-emerald-400 bg-emerald-500/10',
  CLAIM_REJECTED: 'text-red-400 bg-red-500/10',
  CLAIM_MORE_INFO: 'text-blue-400 bg-blue-500/10',
  CONTACT_UNLOCKED: 'text-green-400 bg-green-500/10',
  ADMIN_ACTION: 'text-red-400 bg-red-500/10',
};

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

  useEffect(() => {
    setSearchVal(searchQuery);
  }, [searchQuery]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchVal(val);
    if (location.pathname !== '/') {
      navigate(`/?q=${encodeURIComponent(val)}`);
    } else {
      if (val) setSearchParams({ q: val });
      else setSearchParams({});
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const [notifs, { count }] = await Promise.all([
        api.getNotifications(),
        api.getUnreadCount(),
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000);
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

  const handleMarkAsRead = async (e, notifId) => {
    e.stopPropagation();
    try {
      await api.markNotificationRead(notifId);
      setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#080e1a]/90 backdrop-blur-xl border-b border-white/[0.06] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-emerald-500 rounded-lg flex items-center justify-center text-white shadow-md shadow-blue-500/15 group-hover:scale-105 transition-transform">
                <Search className="w-4 h-4" strokeWidth={3.5} />
              </div>
              <span className="text-lg tracking-wide font-heading font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
                KGP Find
              </span>
            </Link>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
              <input type="text" placeholder="Search items, locations..."
                value={searchVal} onChange={handleSearchChange}
                className="bg-white/[0.04] text-xs text-white rounded-xl pl-9 pr-4 py-2.5 border border-white/[0.06] focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 transition-all w-60 placeholder:text-slate-600 font-medium" />
              {searchVal && (
                <button onClick={() => { setSearchVal(''); setSearchParams({}); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {isAdmin && (
              <Link to="/admin"
                className="flex items-center gap-1.5 text-[10px] font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/15 px-3.5 py-2 rounded-xl transition-colors cursor-pointer">
                <Shield className="w-3.5 h-3.5" /> Admin
              </Link>
            )}

            <Link to="/report"
              className="flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-4 py-2.5 rounded-xl transition-colors shadow-md shadow-blue-600/15 cursor-pointer">
              <PlusCircle className="w-4 h-4" /> Report
            </Link>



            {user ? (
              <div className="flex items-center gap-3 relative" ref={notifRef}>
                {/* Bell */}
                <button onClick={() => setShowNotif(!showNotif)}
                  className="relative p-2.5 text-slate-500 hover:text-white transition-colors cursor-pointer bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.06] rounded-xl">
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 border-2 border-[#080e1a] rounded-full text-[9px] font-black text-white flex items-center justify-center animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification dropdown */}
                {showNotif && (
                  <div className="absolute right-0 top-14 w-80 bg-[#0c1322] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden z-50"
                    style={{ animation: 'modalIn 0.15s ease-out' }}>
                    <div className="p-3.5 border-b border-white/[0.05] flex justify-between items-center">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Notifications
                      </span>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <button onClick={handleMarkAllRead}
                            className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer">
                            <CheckCheck className="w-3 h-3" /> Read all
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-white/[0.04]">
                      {notifications.map((notif) => {
                        const Icon = NOTIF_ICONS[notif.type] || Bell;
                        const colorClass = NOTIF_COLORS[notif.type] || 'text-slate-400 bg-slate-500/10';

                        return (
                          <div key={notif.id}
                            className={`p-3.5 transition-colors text-left space-y-1.5 hover:bg-white/[0.02] ${
                              !notif.isRead ? 'bg-blue-500/[0.03]' : ''
                            }`}>
                            <div className="flex items-start gap-2.5">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-bold text-white leading-tight">{notif.title}</p>
                                <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5 line-clamp-2">{notif.message}</p>
                                <div className="flex items-center justify-between mt-1.5">
                                  <span className="text-[9px] text-slate-600">{timeAgo(notif.createdAt)}</span>
                                  {!notif.isRead && (
                                    <button onClick={(e) => handleMarkAsRead(e, notif.id)}
                                      className="text-[9px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-0.5 cursor-pointer">
                                      <Check className="w-2.5 h-2.5" /> Read
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {notifications.length === 0 && (
                        <div className="py-10 text-center space-y-2">
                          <Bell className="w-7 h-7 mx-auto text-slate-700" />
                          <p className="text-xs font-semibold text-slate-400">No notifications yet</p>
                          <p className="text-[10px] text-slate-600">We'll alert you about matches and claims.</p>
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
                  <div className="absolute right-0 top-10 w-48 bg-[#0c1322] border border-white/[0.08] rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 overflow-hidden">
                    <div className="p-3.5 border-b border-white/[0.05]">
                      <p className="text-xs text-white font-bold truncate">{user.name}</p>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">{user.email}</p>
                    </div>
                    <Link to="/profile"
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/[0.04] transition-colors cursor-pointer flex items-center gap-2 block">
                      <User className="w-3.5 h-3.5" /> My Profile
                    </Link>
                    <button onClick={logout}
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/[0.05] transition-colors cursor-pointer">
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link to="/login"
                className="text-xs font-bold text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] px-5 py-2.5 rounded-xl transition-colors shadow-sm cursor-pointer">
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="md:hidden flex items-center gap-3">

            {user && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-500 flex items-center justify-center text-xs font-black text-white shadow-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-slate-400 p-1">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#080e1a] border-b border-white/[0.06]">
          <div className="px-4 pt-2 pb-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
              <input type="text" placeholder="Search items, locations..."
                value={searchVal} onChange={handleSearchChange}
                className="w-full bg-white/[0.04] text-xs text-white rounded-xl pl-10 pr-4 py-3 border border-white/[0.06] focus:outline-none focus:border-blue-500/40" />
            </div>

            <div className="flex flex-col gap-2">
              {isAdmin && (
                <Link to="/admin" onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 text-sm font-semibold text-amber-300 bg-amber-500/10 p-3 rounded-xl">
                  <Shield className="w-4 h-4" /> Admin Dashboard
                </Link>
              )}
              <Link to="/report" onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 p-3 rounded-xl shadow-md">
                <PlusCircle className="w-4 h-4" /> Report Item
              </Link>

              {user ? (
                <>
                  <Link to="/profile" onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-300 bg-white/[0.04] p-3 rounded-xl">
                    <User className="w-4 h-4 text-slate-500" /> My Profile
                  </Link>
                  <button onClick={() => { setShowNotif(!showNotif); }}
                    className="flex items-center justify-between text-sm font-semibold text-slate-300 bg-white/[0.04] p-3 rounded-xl">
                    <div className="flex items-center gap-2"><Bell className="w-4 h-4 text-slate-500" /> Notifications</div>
                    {unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{unreadCount}</span>
                    )}
                  </button>

                  {showNotif && (
                    <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden">
                      <div className="max-h-64 overflow-y-auto divide-y divide-white/[0.04]">
                        {notifications.map((notif) => {
                          const Icon = NOTIF_ICONS[notif.type] || Bell;
                          return (
                            <div key={notif.id} className={`p-3 ${!notif.isRead ? 'bg-blue-500/[0.03]' : ''}`}>
                              <div className="flex items-start gap-2">
                                <Icon className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-[11px] font-bold text-white">{notif.title}</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">{notif.message}</p>
                                </div>
                              </div>
                              <div className="flex gap-2 mt-2">
                                {!notif.isRead && (
                                  <button onClick={(e) => handleMarkAsRead(e, notif.id)}
                                    className="px-3 py-1 bg-white/[0.04] text-slate-300 rounded-lg text-[10px] font-semibold cursor-pointer">Read</button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {notifications.length === 0 && (
                          <div className="p-4 text-center text-slate-600 text-xs">No notifications yet</div>
                        )}
                      </div>
                    </div>
                  )}

                  <button onClick={() => { logout(); setMobileMenuOpen(false); }}
                    className="flex items-center gap-2 text-sm font-semibold text-red-400 bg-red-500/[0.05] p-3 rounded-xl">
                    Sign Out
                  </button>
                </>
              ) : (
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 text-sm font-semibold text-white bg-white/[0.06] p-3 rounded-xl">
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.96) translateY(4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </nav>
  );
}
