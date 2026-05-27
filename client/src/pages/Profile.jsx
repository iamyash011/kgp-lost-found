import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Link } from 'react-router-dom';
import { Trash2, CheckCircle2, User, Phone, Mail, Clock, ShieldAlert } from 'lucide-react';
import { timeAgo } from '../utils/timeAgo';

export default function Profile() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMyItems = async () => {
    try {
      const allItems = await api.getItems();
      // Filter items belonging to the current user
      const myItems = allItems.filter(item => item.userId === user?.id);
      setItems(myItems);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchMyItems();
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
    if (window.confirm('Are you sure you want to delete this report?')) {
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Profile Header */}
      <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-3xl p-6 sm:p-10 flex flex-col md:flex-row items-center gap-6 shadow-sm mb-8 transition-colors">
        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-500 flex items-center justify-center text-4xl sm:text-5xl font-black text-white shadow-xl shadow-blue-500/20">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <div className="text-center md:text-left space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-heading tracking-tight">{user?.name}</h1>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6 text-sm text-slate-500 dark:text-slate-400 font-medium">
            <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> {user?.email}</span>
            {user?.whatsappNumber && (
              <span className="flex items-center gap-1.5"><Phone className="w-4 h-4" /> +91 {user?.whatsappNumber}</span>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-heading">My Reports</h2>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white dark:bg-slate-800/20 border border-slate-200 dark:border-slate-700/50 rounded-3xl p-12 text-center transition-colors">
          <div className="w-16 h-16 bg-blue-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Reports Yet</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm max-w-sm mx-auto">You haven't posted any lost or found items. If you lose something, you can report it here.</p>
          <Link to="/report" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors inline-block">
            Report an Item
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(item => {
            const images = getImages(item.imageUrl);
            const displayImg = images.length > 0
              ? (images[0].startsWith('http') ? images[0] : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${images[0]}`)
              : null;

            return (
              <div key={item.id} className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-3xl overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-all">
                <div className="h-40 bg-slate-100 dark:bg-slate-900 relative">
                  {displayImg ? (
                    <img src={displayImg} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-600">No Image</div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
                      item.type === 'LOST' 
                        ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300' 
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                    }`}>
                      {item.type}
                    </span>
                  </div>
                  {item.status === 'RESOLVED' && (
                    <div className="absolute top-3 right-3">
                      <span className="px-2 py-1 bg-slate-800/80 text-white text-xs font-bold rounded-lg backdrop-blur-sm">
                        RESOLVED
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-1 truncate">{item.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-4">
                    <Clock className="w-3.5 h-3.5" /> {timeAgo(item.createdAt)}
                  </p>
                  <div className="mt-auto flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                    {item.status === 'ACTIVE' && (
                      <button 
                        onClick={() => handleResolve(item.id)}
                        className="flex-1 py-2 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
                      </button>
                    )}
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="flex-1 py-2 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
