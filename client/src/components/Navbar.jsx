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
    <nav className="navbar-container">
      <Link to="/" className="navbar-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <img src="/logo.png" alt="KGP Find Logo" style={{ height: '32px', width: '32px', objectFit: 'contain', borderRadius: '6px' }} />
        <span>KGP Find</span>
      </Link>

      <div className="navbar-search">
        <Search className="w-4 h-4 text-slate-400" />
        <input 
          type="text" 
          placeholder="Search items, locations..."
          value={searchVal} 
          onChange={handleSearchChange} 
        />
        {searchVal && (
          <button onClick={() => { setSearchVal(''); setSearchParams({}); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="navbar-actions">
        {isAdmin && (
          <Link to="/admin" style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent-blue)', textDecoration: 'none' }}>
            <Shield className="w-4 h-4 inline mr-1" /> Admin
          </Link>
        )}

        <Link to="/report" className="btn-report">
          Report
        </Link>

        <div className="navbar-divider" />

        {user ? (
          <div className="flex items-center gap-3 relative" ref={notifRef}>
            <button onClick={() => setShowNotif(!showNotif)} style={{ position: 'relative', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '16px', height: '16px', backgroundColor: '#c5221f', borderRadius: '50%', color: 'white', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification dropdown */}
            {showNotif && (
              <div className="absolute right-0 top-10 w-80 bg-white dark:bg-[#1c1e21] border border-[#e8eaed] dark:border-[#2d2f33] rounded-xl shadow-lg overflow-hidden z-50">
                <div className="p-3 border-b border-[#e8eaed] dark:border-[#2d2f33] flex justify-between items-center">
                  <span className="text-sm font-bold text-[#202124] dark:text-[#e3e3e3]">Notifications</span>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="text-xs text-[#1a73e8] dark:text-[#4da3ff] hover:underline bg-transparent border-none cursor-pointer">
                      Read all
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((notif) => {
                    const Icon = NOTIF_ICONS[notif.type] || Bell;
                    return (
                      <div key={notif.id} 
                           onClick={() => {
                             if (notif.relatedId) navigate(`/item/${notif.relatedId}`);
                             setShowNotifications(false);
                           }}
                           className="p-3 border-b border-[#e8eaed] dark:border-[#2d2f33] hover:bg-[#f8f9fa] dark:hover:bg-[#28292d] cursor-pointer">
                        <div className="flex gap-2">
                          <Icon className="w-4 h-4 mt-1 text-[#1a73e8] dark:text-[#4da3ff]" />
                          <div className="flex-1">
                            <p className="text-xs font-bold text-[#202124] dark:text-[#e3e3e3]">{notif.title}</p>
                            <p className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6] mt-1">{notif.message}</p>
                            <div className="flex justify-between mt-1 items-center">
                              <span className="text-[10px] text-[#80868b]">{timeAgo(notif.createdAt)}</span>
                              {!notif.isRead && (
                                <button onClick={(e) => handleMarkAsRead(e, notif.id)} className="text-[10px] text-[#1a73e8] dark:text-[#4da3ff] bg-transparent border-none cursor-pointer hover:underline">
                                  Mark read
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {notifications.length === 0 && (
                    <div className="p-6 text-center text-sm text-[#5f6368] dark:text-[#9aa0a6]">No notifications yet</div>
                  )}
                </div>
              </div>
            )}

            {/* Profile dropdown */}
            <div className="flex items-center relative group">
              <div className="avatar-circle cursor-pointer">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="absolute right-0 top-10 w-48 bg-white dark:bg-[#1c1e21] border border-[#e8eaed] dark:border-[#2d2f33] rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 overflow-hidden z-50">
                <div className="p-3 border-b border-[#e8eaed] dark:border-[#2d2f33]">
                  <p className="text-sm font-bold text-[#202124] dark:text-[#e3e3e3] truncate">{user.name}</p>
                  <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] truncate mt-1">{user.email}</p>
                </div>
                <Link to="/profile" className="block w-full text-left px-4 py-2 text-sm text-[#202124] dark:text-[#e3e3e3] hover:bg-[#f8f9fa] dark:hover:bg-[#28292d] text-decoration-none">
                  My Profile
                </Link>
                <button onClick={logout} className="block w-full text-left px-4 py-2 text-sm text-[#c5221f] dark:text-[#f28b82] hover:bg-[#f8f9fa] dark:hover:bg-[#28292d] bg-transparent border-none cursor-pointer">
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        ) : (
          <Link to="/login" style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', textDecoration: 'none' }}>
            Sign In
          </Link>
        )}
        
        <div className="navbar-divider" />
        
        <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle dark mode">
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile hamburger */}
      <div className="mobile-menu-btn">
        <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle dark mode">
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        {user && (
          <div className="avatar-circle">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)' }}>
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="mobile-menu-container">
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
                            <div key={notif.id} 
                             onClick={() => {
                               if (notif.relatedId) navigate(`/item/${notif.relatedId}`);
                               setShowMobileMenu(false);
                             }}
                             className="p-3 cursor-pointer hover:bg-white/[0.02] border-b border-white/[0.04]">
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
