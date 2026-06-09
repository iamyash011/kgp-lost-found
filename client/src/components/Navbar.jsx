import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Bell, Search, Menu, PlusCircle, X, Sparkles, Check, Shield, Sun, Moon, User, CheckCheck, Fingerprint, MessageCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { timeAgo } from '../utils/timeAgo';
import { Logo } from './Logo';

const NOTIF_ICONS = {
  MATCH: Sparkles,
  CLAIM_RECEIVED: Fingerprint,
  CLAIM_ACCEPTED: Check,
  CLAIM_REJECTED: X,
  CLAIM_MORE_INFO: MessageCircle,
  CONTACT_UNLOCKED: MessageCircle,
  ADMIN_ACTION: AlertTriangle,
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
  const [scrolled, setScrolled] = useState(false);

  const notifRef = useRef(null);

  useEffect(() => {
    setSearchVal(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    <>
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        height: '64px',
        backgroundColor: 'rgba(5, 7, 15, 0.8)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: scrolled ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid transparent',
        transition: 'border-color 0.3s ease'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          
          {/* Brand */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <Logo />
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: '800', letterSpacing: '-0.03em' }}>
              <span style={{ color: 'var(--accent-gold)' }}>KGP</span>
              <span style={{ color: '#ffffff' }}> Find</span>
            </span>
          </Link>

          {/* Desktop Nav Actions */}
          <div className="hidden md:flex items-center gap-6">
            <button onClick={toggleTheme} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)' }}>
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            {user ? (
              <div className="flex items-center gap-4 relative" ref={notifRef}>
                <button onClick={() => setShowNotif(!showNotif)} style={{ position: 'relative', background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)' }}>
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="animate-wobble" style={{ position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px', backgroundColor: 'var(--accent-red)', borderRadius: '50%' }} />
                  )}
                </button>

                {/* Notifications Panel */}
                {showNotif && (
                  <div className="animate-slide-up" style={{
                    position: 'absolute', right: 0, top: '40px', width: '360px',
                    backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-medium)',
                    borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', overflow: 'hidden'
                  }}>
                    <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-heading)', fontWeight: '700', fontSize: '16px' }}>Notifications</span>
                      {unreadCount > 0 && (
                        <button onClick={handleMarkAllRead} style={{ fontSize: '12px', color: 'var(--accent-blue)', background: 'transparent', border: 'none', cursor: 'pointer' }}>Mark all read</button>
                      )}
                    </div>
                    <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                      {notifications.map(notif => {
                        const Icon = NOTIF_ICONS[notif.type] || Bell;
                        const isMatch = notif.type === 'MATCH';
                        return (
                          <div key={notif.id} onClick={() => { if (notif.relatedId) navigate(`/item/${notif.relatedId}`); setShowNotif(false); }}
                               style={{ padding: '16px', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)',
                                        borderLeft: isMatch ? '3px solid var(--accent-gold)' : '3px solid transparent',
                                        backgroundColor: notif.isRead ? 'transparent' : 'var(--accent-gold-dim)' }}>
                            <div style={{ display: 'flex', gap: '12px' }}>
                              <Icon size={18} style={{ color: isMatch ? 'var(--accent-gold)' : 'var(--accent-blue)', marginTop: '2px' }} />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{notif.title}</div>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{notif.message}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', fontWeight: '500' }}>{timeAgo(notif.createdAt)}</div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      {notifications.length === 0 && (
                        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>You're all caught up. We'll ping you when something matches.</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Profile Circle */}
                <div className="relative group">
                  <Link to="/profile" style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--accent-gold)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', textDecoration: 'none' }}>
                    {user.name.charAt(0).toUpperCase()}
                  </Link>
                  <div className="absolute right-0 top-10 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200"
                       style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-medium)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                    <div style={{ padding: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>{user.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{user.email}</div>
                    </div>
                    {isAdmin && (
                       <Link to="/admin" style={{ display: 'block', padding: '10px 16px', fontSize: '13px', color: 'var(--accent-gold)', textDecoration: 'none', fontWeight: '600' }}>Admin Dashboard</Link>
                    )}
                    <Link to="/profile" style={{ display: 'block', padding: '10px 16px', fontSize: '13px', color: 'var(--text-primary)', textDecoration: 'none' }}>My Profile</Link>
                    <button onClick={logout} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', fontSize: '13px', color: 'var(--accent-red)', background: 'transparent', border: 'none', cursor: 'pointer' }}>Sign Out</button>
                  </div>
                </div>
              </div>
            ) : (
              <Link to="/login" style={{ fontSize: '15px', fontWeight: '600', color: '#ffffff', textDecoration: 'none', opacity: 0.8, transition: 'opacity 0.2s' }} onMouseEnter={e=>e.target.style.opacity=1} onMouseLeave={e=>e.target.style.opacity=0.8}>
                Sign in
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-4">
            <button onClick={toggleTheme} style={{ background: 'transparent', border: 'none', color: '#fff' }}>
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ background: 'transparent', border: 'none', color: '#fff' }}>
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div style={{
            position: 'absolute', top: '64px', left: 0, right: 0,
            backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)',
            padding: '16px 24px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 45
          }}>
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <Search className="w-4 h-4" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="text" placeholder="Search items, locations..."
                value={searchVal} onChange={handleSearchChange}
                style={{
                  width: '100%', padding: '12px 12px 12px 36px', backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)', borderRadius: '12px',
                  color: 'var(--text-primary)', fontSize: '14px', outline: 'none'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {isAdmin && (
                <Link to="/admin" onClick={() => setMobileMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', backgroundColor: 'var(--accent-gold-dim)', color: 'var(--accent-gold)', borderRadius: '12px', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>
                  <Shield size={16} /> Admin Dashboard
                </Link>
              )}
              {user ? (
                <>
                  <Link to="/report" onClick={() => setMobileMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', backgroundColor: 'var(--accent-blue)', color: '#fff', borderRadius: '12px', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>
                    <PlusCircle size={16} /> Post Item
                  </Link>
                  <button onClick={() => { logout(); setMobileMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', backgroundColor: 'rgba(247, 89, 89, 0.1)', color: 'var(--accent-red)', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', textAlign: 'left' }}>
                    Sign Out
                  </button>
                </>
              ) : (
                <Link to="/login" onClick={() => setMobileMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', borderRadius: '12px', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>
                  Sign In
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Bottom Nav Bar (Mobile Only) */}
      {user && (
        <div className="md:hidden" style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, height: '64px',
          backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)',
          display: 'flex', justifyContent: 'space-around', alignItems: 'center', zIndex: 40,
          paddingBottom: 'env(safe-area-inset-bottom)'
        }}>
          <Link to="/" style={{ color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none' }}>
            <Search size={20} />
            <span style={{ fontSize: '10px', marginTop: '4px', fontWeight: '500' }}>Explore</span>
          </Link>
          <Link to="/report" style={{ position: 'relative', top: '-16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--accent-gold)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(201,162,39,0.3)' }}>
              <PlusCircle size={24} strokeWidth={2.5} />
            </div>
          </Link>
          <Link to="/profile" style={{ color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none' }}>
            <User size={20} />
            <span style={{ fontSize: '10px', marginTop: '4px', fontWeight: '500' }}>Profile</span>
          </Link>
        </div>
      )}
      
      {/* Spacer for mobile bottom nav */}
      {user && <div className="md:hidden" style={{ height: '64px' }} />}
    </>
  );
}
