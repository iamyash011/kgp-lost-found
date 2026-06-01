import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { timeAgo } from '../utils/timeAgo';
import {
  Users, FileText, CheckCircle2, AlertTriangle, Trash2, BarChart3, Shield,
  Ban, Flag, Fingerprint, TrendingUp, Eye, X, Check
} from 'lucide-react';

const TABS = ['Overview', 'Items', 'Users', 'Reports', 'Claims'];

export default function AdminDashboard() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [claims, setClaims] = useState([]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchAll();
  }, [isAdmin]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statsData, itemsData, usersData, reportsData, claimsData] = await Promise.all([
        api.adminFetch('/stats'),
        api.adminFetch('/items'),
        api.adminFetch('/users'),
        api.adminFetch('/reports'),
        api.adminFetch('/claims'),
      ]);
      setStats(statsData);
      setItems(itemsData);
      setUsers(usersData);
      setReports(reportsData);
      setClaims(claimsData);
    } catch (err) {
      console.error('Admin fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-slate-500">Admin access required.</p>
      </div>
    );
  }

  const handleDeleteItem = async (id) => {
    if (!confirm('Delete this item permanently?')) return;
    try {
      await api.adminFetch(`/items/${id}`, { method: 'DELETE' });
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (err) { alert('Failed.'); }
  };

  const handleResolveItem = async (id) => {
    try {
      await api.adminFetch(`/items/${id}/resolve`, { method: 'PATCH' });
      setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'RESOLVED' } : i));
    } catch (err) { alert('Failed.'); }
  };

  const handleBanUser = async (id) => {
    try {
      await api.adminFetch(`/users/${id}/ban`, { method: 'PATCH' });
      fetchAll();
    } catch (err) { alert('Failed.'); }
  };

  const handleDeleteUser = async (id) => {
    if (!confirm('Delete this user and ALL their data? This is irreversible.')) return;
    try {
      await api.adminFetch(`/users/${id}`, { method: 'DELETE' });
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err) { alert('Failed.'); }
  };

  const handleReportAction = async (id, status) => {
    try {
      await api.adminFetch(`/reports/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    } catch (err) { alert('Failed.'); }
  };

  const statCards = stats ? [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'blue' },
    { label: 'Active Items', value: stats.activeItems, icon: FileText, color: 'emerald' },
    { label: 'Resolved', value: stats.resolvedItems, icon: CheckCircle2, color: 'purple' },
    { label: 'Total Matches', value: stats.totalMatches, icon: TrendingUp, color: 'cyan' },
    { label: 'Total Claims', value: stats.totalClaims, icon: Fingerprint, color: 'amber' },
    { label: 'Accepted Claims', value: stats.acceptedClaims, icon: Check, color: 'emerald' },
    { label: 'Pending Reports', value: stats.pendingReports, icon: Flag, color: 'red' },
    { label: 'Banned Users', value: stats.bannedUsers, icon: Ban, color: 'red' },
  ] : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/15 rounded-xl flex items-center justify-center">
          <Shield className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-white font-heading">Admin Dashboard</h1>
          <p className="text-xs text-slate-500 font-medium">Platform management & moderation</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.03] p-1 rounded-xl mb-6 w-fit border border-white/[0.06] overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab ? 'bg-amber-500/15 text-amber-300 shadow-sm' : 'text-slate-500 hover:text-white'
            }`}>
            {tab}
            {tab === 'Reports' && reports.filter(r => r.status === 'PENDING').length > 0 && (
              <span className="ml-1.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-black text-white inline-flex items-center justify-center">
                {reports.filter(r => r.status === 'PENDING').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
        </div>
      ) : (
        <>
          {/* Overview */}
          {activeTab === 'Overview' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {statCards.map(card => (
                <div key={card.label} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 hover:border-white/[0.1] transition-all">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-${card.color}-500/10`}>
                    <card.icon className={`w-4 h-4 text-${card.color}-400`} />
                  </div>
                  <p className="text-2xl font-black text-white">{card.value}</p>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-1">{card.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Items */}
          {activeTab === 'Items' && (
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left p-4 text-slate-500 font-bold uppercase tracking-wider text-[10px]">Item</th>
                      <th className="text-left p-4 text-slate-500 font-bold uppercase tracking-wider text-[10px]">Type</th>
                      <th className="text-left p-4 text-slate-500 font-bold uppercase tracking-wider text-[10px]">User</th>
                      <th className="text-left p-4 text-slate-500 font-bold uppercase tracking-wider text-[10px]">Claims</th>
                      <th className="text-left p-4 text-slate-500 font-bold uppercase tracking-wider text-[10px]">Status</th>
                      <th className="text-left p-4 text-slate-500 font-bold uppercase tracking-wider text-[10px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {items.map(item => (
                      <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4 font-semibold text-white max-w-[200px] truncate">{item.title}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${item.type === 'LOST' ? 'bg-red-500/15 text-red-300' : 'bg-emerald-500/15 text-emerald-300'}`}>{item.type}</span>
                        </td>
                        <td className="p-4 text-slate-400">{item.user?.name}</td>
                        <td className="p-4 text-slate-400">{item._count?.claims || 0}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${item.status === 'ACTIVE' ? 'bg-blue-500/15 text-blue-300' : 'bg-slate-500/15 text-slate-400'}`}>{item.status}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-1.5">
                            {item.status === 'ACTIVE' && (
                              <button onClick={() => handleResolveItem(item.id)} className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg cursor-pointer"><CheckCircle2 className="w-3 h-3" /></button>
                            )}
                            <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg cursor-pointer"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Users */}
          {activeTab === 'Users' && (
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left p-4 text-slate-500 font-bold uppercase tracking-wider text-[10px]">Name</th>
                      <th className="text-left p-4 text-slate-500 font-bold uppercase tracking-wider text-[10px]">Email</th>
                      <th className="text-left p-4 text-slate-500 font-bold uppercase tracking-wider text-[10px]">Trust</th>
                      <th className="text-left p-4 text-slate-500 font-bold uppercase tracking-wider text-[10px]">Reports</th>
                      <th className="text-left p-4 text-slate-500 font-bold uppercase tracking-wider text-[10px]">Items</th>
                      <th className="text-left p-4 text-slate-500 font-bold uppercase tracking-wider text-[10px]">Status</th>
                      <th className="text-left p-4 text-slate-500 font-bold uppercase tracking-wider text-[10px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4 font-semibold text-white">{u.name}</td>
                        <td className="p-4 text-slate-400 text-[10px]">{u.email}</td>
                        <td className="p-4">
                          <span className="text-emerald-400 font-bold">{u.trustScore}</span>
                        </td>
                        <td className="p-4">
                          <span className={u.reportCount > 0 ? 'text-red-400 font-bold' : 'text-slate-600'}>{u.reportCount}</span>
                        </td>
                        <td className="p-4 text-slate-400">{u._count?.items || 0}</td>
                        <td className="p-4">
                          {u.isBanned ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/15 text-red-300">Banned</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-300">Active</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-1.5">
                            <button onClick={() => handleBanUser(u.id)}
                              className={`p-1.5 rounded-lg cursor-pointer ${u.isBanned ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400'}`}
                              title={u.isBanned ? 'Unban' : 'Ban'}>
                              <Ban className="w-3 h-3" />
                            </button>
                            <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg cursor-pointer" title="Delete">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Reports */}
          {activeTab === 'Reports' && (
            reports.length === 0 ? (
              <div className="text-center py-16 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                <Flag className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-400">No reports yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reports.map(report => (
                  <div key={report.id} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Flag className="w-4 h-4 text-red-400" />
                        <span className="text-xs font-bold text-white">{report.reason}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                        report.status === 'PENDING' ? 'bg-amber-500/15 text-amber-300 border-amber-500/20'
                        : report.status === 'REVIEWED' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
                        : 'bg-slate-500/15 text-slate-400 border-slate-500/20'
                      }`}>{report.status}</span>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      By: {report.reporter?.name} • Target: {report.targetType} • {timeAgo(report.createdAt)}
                    </p>
                    {report.details && <p className="text-xs text-slate-400 italic">"{report.details}"</p>}
                    {report.status === 'PENDING' && (
                      <div className="flex gap-2 pt-2">
                        <button onClick={() => handleReportAction(report.id, 'REVIEWED')}
                          className="flex-1 py-2 bg-emerald-500/10 text-emerald-400 rounded-lg text-[10px] font-bold hover:bg-emerald-500/20 cursor-pointer flex items-center justify-center gap-1">
                          <Check className="w-3 h-3" /> Reviewed
                        </button>
                        <button onClick={() => handleReportAction(report.id, 'DISMISSED')}
                          className="flex-1 py-2 bg-slate-500/10 text-slate-400 rounded-lg text-[10px] font-bold hover:bg-slate-500/20 cursor-pointer flex items-center justify-center gap-1">
                          <X className="w-3 h-3" /> Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}

          {/* Claims */}
          {activeTab === 'Claims' && (
            claims.length === 0 ? (
              <div className="text-center py-16 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                <Fingerprint className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-400">No claims yet</p>
              </div>
            ) : (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="text-left p-4 text-slate-500 font-bold uppercase tracking-wider text-[10px]">Item</th>
                        <th className="text-left p-4 text-slate-500 font-bold uppercase tracking-wider text-[10px]">Claimant</th>
                        <th className="text-left p-4 text-slate-500 font-bold uppercase tracking-wider text-[10px]">Trust</th>
                        <th className="text-left p-4 text-slate-500 font-bold uppercase tracking-wider text-[10px]">Status</th>
                        <th className="text-left p-4 text-slate-500 font-bold uppercase tracking-wider text-[10px]">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {claims.map(claim => (
                        <tr key={claim.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-4 font-semibold text-white max-w-[200px] truncate">{claim.item?.title}</td>
                          <td className="p-4 text-slate-400">{claim.claimant?.name}</td>
                          <td className="p-4">
                            <span className="text-emerald-400 font-bold">{claim.claimant?.trustScore || 0}</span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              claim.status === 'PENDING' ? 'bg-amber-500/15 text-amber-300'
                              : claim.status === 'ACCEPTED' ? 'bg-emerald-500/15 text-emerald-300'
                              : claim.status === 'REJECTED' ? 'bg-red-500/15 text-red-300'
                              : 'bg-blue-500/15 text-blue-300'
                            }`}>{claim.status}</span>
                          </td>
                          <td className="p-4 text-slate-500">{timeAgo(claim.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
