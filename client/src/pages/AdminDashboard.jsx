import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Shield, Users, FileText, GitMerge, TrendingUp,
  Trash2, CheckCircle, AlertTriangle, Loader2,
  Search, RefreshCw, UserX, Eye
} from 'lucide-react';

const TABS = ['Insights', 'Reports', 'Users'];

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className={`bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 flex items-center gap-4 hover:border-${color}-500/30 transition-all`}>
      <div className={`w-12 h-12 bg-${color}-500/10 border border-${color}-500/20 rounded-xl flex items-center justify-center`}>
        <Icon className={`w-6 h-6 text-${color}-400`} />
      </div>
      <div>
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{label}</p>
        <p className="text-3xl font-black text-white mt-0.5">{value ?? '—'}</p>
      </div>
    </div>
  );
}

function Badge({ status }) {
  const map = {
    ACTIVE: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    RESOLVED: 'bg-slate-700/40 text-slate-400 border-slate-600/30',
    LOST: 'bg-red-500/15 text-red-400 border-red-500/20',
    FOUND: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xxs font-bold border ${map[status] || 'bg-slate-700 text-slate-400'}`}>
      {status}
    </span>
  );
}

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Insights');
  const [stats, setStats] = useState(null);
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return; }
    loadData();
  }, [isAdmin]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, itemsData, usersData] = await Promise.all([
        api.adminFetch('/stats'),
        api.adminFetch('/items'),
        api.adminFetch('/users'),
      ]);
      setStats(statsData);
      setItems(itemsData);
      setUsers(usersData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id) => {
    if (!confirm('Permanently delete this item and all its matches?')) return;
    setActionLoading(id);
    try {
      await api.adminFetch(`/items/${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((i) => i.id !== id));
      showToast('Item deleted successfully.');
    } catch (err) {
      showToast('Failed to delete item.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolveItem = async (id) => {
    setActionLoading(id + '_resolve');
    try {
      await api.adminFetch(`/items/${id}/resolve`, { method: 'PATCH' });
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, status: 'RESOLVED' } : i));
      showToast('Item marked as resolved.');
    } catch (err) {
      showToast('Failed to resolve item.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!confirm('Permanently delete this user and ALL their data? This cannot be undone.')) return;
    setActionLoading('user_' + id);
    try {
      await api.adminFetch(`/users/${id}`, { method: 'DELETE' });
      setUsers((prev) => prev.filter((u) => u.id !== id));
      showToast('User deleted.');
    } catch (err) {
      showToast('Failed to delete user.');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredItems = items.filter((item) =>
    `${item.title} ${item.description} ${item.user?.name} ${item.user?.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const filteredUsers = users.filter((u) =>
    `${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  );

  if (!isAdmin) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-800 border border-slate-700 text-white text-xs font-semibold px-5 py-3 rounded-xl shadow-2xl animate-in slide-in-from-bottom-4">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Owner Dashboard</h1>
            <p className="text-slate-400 text-xs mt-0.5">Logged in as <span className="text-amber-400 font-bold">{user?.email}</span></p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800/60 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:border-slate-600 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-900/60 p-1 rounded-xl mb-8 w-fit border border-slate-700/40 gap-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setSearch(''); }}
            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === tab
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
        </div>
      ) : (
        <>
          {/* INSIGHTS TAB */}
          {activeTab === 'Insights' && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="blue" />
                <StatCard icon={FileText} label="Active Reports" value={stats.activeItems} color="emerald" />
                <StatCard icon={CheckCircle} label="Resolved" value={stats.resolvedItems} color="slate" />
                <StatCard icon={GitMerge} label="Total Matches" value={stats.totalMatches} color="amber" />
              </div>

              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
                <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  Platform Overview
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 text-center">
                    <p className="text-3xl font-black text-white">{stats.totalItems}</p>
                    <p className="text-slate-400 text-xs mt-1 font-semibold">Total Items Ever Posted</p>
                  </div>
                  <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 text-center">
                    <p className="text-3xl font-black text-emerald-400">
                      {stats.totalItems > 0 ? Math.round((stats.resolvedItems / stats.totalItems) * 100) : 0}%
                    </p>
                    <p className="text-slate-400 text-xs mt-1 font-semibold">Resolution Rate</p>
                  </div>
                  <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 text-center">
                    <p className="text-3xl font-black text-blue-400">
                      {stats.totalUsers > 0 ? (stats.totalItems / stats.totalUsers).toFixed(1) : 0}
                    </p>
                    <p className="text-slate-400 text-xs mt-1 font-semibold">Avg Reports Per User</p>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-slate-900/30 border border-slate-800 rounded-xl">
                  <p className="text-xs font-bold text-slate-300 mb-3">Last 14 Days Activity ({stats.recentItems?.length || 0} reports)</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1.5 text-xs text-red-400 font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                      Lost: {stats.recentItems?.filter(i => i.type === 'LOST').length || 0}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-blue-400 font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
                      Found: {stats.recentItems?.filter(i => i.type === 'FOUND').length || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* REPORTS TAB */}
          {activeTab === 'Reports' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by title, user, or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/40 transition-all font-medium"
                />
              </div>
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
                <div className="grid grid-cols-12 gap-4 px-4 py-2.5 bg-slate-900/50 border-b border-slate-800 text-xxs font-bold uppercase tracking-wider text-slate-500">
                  <span className="col-span-4">Item</span>
                  <span className="col-span-2">Reporter</span>
                  <span className="col-span-1">Type</span>
                  <span className="col-span-1">Status</span>
                  <span className="col-span-2">Date</span>
                  <span className="col-span-2 text-right">Actions</span>
                </div>
                <div className="divide-y divide-slate-800/60 max-h-[60vh] overflow-y-auto">
                  {filteredItems.length === 0 && (
                    <div className="py-12 text-center text-slate-500 text-xs font-semibold">No items found.</div>
                  )}
                  {filteredItems.map((item) => (
                    <div key={item.id} className="grid grid-cols-12 gap-4 px-4 py-3.5 hover:bg-slate-800/20 transition-colors items-center">
                      <div className="col-span-4">
                        <p className="text-xs font-bold text-white truncate">{item.title}</p>
                        <p className="text-xxs text-slate-500 truncate mt-0.5">{item.location}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xxs text-slate-300 font-semibold truncate">{item.user?.name}</p>
                        <p className="text-xxs text-slate-500 truncate">{item.user?.email}</p>
                      </div>
                      <div className="col-span-1"><Badge status={item.type} /></div>
                      <div className="col-span-1"><Badge status={item.status} /></div>
                      <div className="col-span-2">
                        <p className="text-xxs text-slate-400">{new Date(item.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="col-span-2 flex items-center justify-end gap-1.5">
                        {item.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleResolveItem(item.id)}
                            disabled={actionLoading === item.id + '_resolve'}
                            className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-lg transition-colors cursor-pointer"
                            title="Mark Resolved"
                          >
                            {actionLoading === item.id + '_resolve'
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <CheckCircle className="w-3.5 h-3.5" />
                            }
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          disabled={actionLoading === item.id}
                          className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg transition-colors cursor-pointer"
                          title="Delete Item"
                        >
                          {actionLoading === item.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />
                          }
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xxs text-slate-500 text-right">{filteredItems.length} items shown</p>
            </div>
          )}

          {/* USERS TAB */}
          {activeTab === 'Users' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/40 transition-all font-medium"
                />
              </div>
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
                <div className="grid grid-cols-12 gap-4 px-4 py-2.5 bg-slate-900/50 border-b border-slate-800 text-xxs font-bold uppercase tracking-wider text-slate-500">
                  <span className="col-span-3">Name</span>
                  <span className="col-span-4">Email</span>
                  <span className="col-span-2">WhatsApp</span>
                  <span className="col-span-1 text-center">Reports</span>
                  <span className="col-span-1">Joined</span>
                  <span className="col-span-1 text-right">Action</span>
                </div>
                <div className="divide-y divide-slate-800/60 max-h-[60vh] overflow-y-auto">
                  {filteredUsers.length === 0 && (
                    <div className="py-12 text-center text-slate-500 text-xs font-semibold">No users found.</div>
                  )}
                  {filteredUsers.map((u) => (
                    <div key={u.id} className="grid grid-cols-12 gap-4 px-4 py-3.5 hover:bg-slate-800/20 transition-colors items-center">
                      <div className="col-span-3 flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-emerald-600 flex items-center justify-center text-xxs font-black text-white shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <p className="text-xs font-bold text-white truncate">{u.name}</p>
                      </div>
                      <div className="col-span-4">
                        <p className="text-xxs text-slate-300 font-medium truncate">{u.email}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xxs text-slate-400">{u.whatsappNumber || '—'}</p>
                      </div>
                      <div className="col-span-1 text-center">
                        <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/15 text-blue-400 rounded-full text-xxs font-bold">
                          {u._count?.items || 0}
                        </span>
                      </div>
                      <div className="col-span-1">
                        <p className="text-xxs text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          disabled={actionLoading === 'user_' + u.id}
                          className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg transition-colors cursor-pointer"
                          title="Delete User"
                        >
                          {actionLoading === 'user_' + u.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <UserX className="w-3.5 h-3.5" />
                          }
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xxs text-slate-500 text-right">{filteredUsers.length} users shown</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
