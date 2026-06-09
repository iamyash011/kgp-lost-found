import { UploadCloud, CheckCircle2, Loader2, X, AlertTriangle, Sparkles, Image as ImageIcon, Eye, EyeOff, Calendar, Shield } from 'lucide-react';
import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { trackItemReport } from '../utils/analytics';

import { LOCATION_SYNONYMS } from '../utils/locations';
import { COMMON_ITEMS } from '../utils/items';

const CATEGORIES = [
  'Electronics', 'Documents & IDs', 'Clothing & Accessories', 'Bags & Wallets',
  'Keys', 'Stationery', 'Sports Equipment', 'Books', 'Water Bottles', 'Other',
];

const COLORS = [
  'Black', 'White', 'Silver', 'Blue', 'Red', 'Green', 'Brown', 'Gold',
  'Pink', 'Orange', 'Yellow', 'Purple', 'Grey', 'Transparent', 'Other',
];

export default function ReportItem() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [type, setType] = useState('LOST');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    identifyingMarks: '',
    category: '',
    color: '',
    brand: '',
    dateOccurred: '',
    reward: '',
  });

  // Privacy settings
  const [showName, setShowName] = useState(false);
  const [showWhatsapp, setShowWhatsapp] = useState(false);
  const [sensitiveImage, setSensitiveImage] = useState(false);
  const [urgency, setUrgency] = useState('NORMAL');

  const [showLocSuggestions, setShowLocSuggestions] = useState(false);
  const [showTitleSuggestions, setShowTitleSuggestions] = useState(false);

  const titleSuggestions = formData.title.length >= 1 ?
    COMMON_ITEMS.filter(item => item.toLowerCase().includes(formData.title.toLowerCase()))
    : COMMON_ITEMS.slice(0, 50);

  const locationSuggestions = formData.location.length >= 1 ? 
    Object.entries(LOCATION_SYNONYMS)
      .filter(([standardName, synonyms]) => {
        const query = formData.location.toLowerCase();
        return standardName.toLowerCase().includes(query) || synonyms.some(s => s.includes(query));
      })
      .map(([standardName]) => standardName)
    : [];

  const [selectedFiles, setSelectedFiles] = useState([]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setError('');
    const files = Array.from(e.target.files);
    addFiles(files);
  };

  const addFiles = (files) => {
    if (selectedFiles.length + files.length > 3) {
      setError('You can only upload a maximum of 3 images.');
      return;
    }
    const currentTotalSize = selectedFiles.reduce((acc, item) => acc + item.file.size, 0);
    const newFilesSize = files.reduce((acc, file) => acc + file.size, 0);
    if ((currentTotalSize + newFilesSize) > 5 * 1024 * 1024) {
      setError('Total image size exceeds the 5MB combined limit.');
      return;
    }
    const newSelections = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setError('Only image files are permitted.');
        return;
      }
      newSelections.push({ file, previewUrl: URL.createObjectURL(file) });
    }
    setSelectedFiles((prev) => [...prev, ...newSelections]);
  };

  const removeFile = (indexToRemove) => {
    setSelectedFiles((prev) => {
      URL.revokeObjectURL(prev[indexToRemove].previewUrl);
      return prev.filter((_, idx) => idx !== indexToRemove);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !formData.location) return;

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('userId', user.id);
      fd.append('type', type);
      fd.append('title', formData.title);
      fd.append('description', formData.description);
      fd.append('location', formData.location);
      if (formData.identifyingMarks) fd.append('identifyingMarks', formData.identifyingMarks);
      if (formData.category) fd.append('category', formData.category);
      if (formData.color) fd.append('color', formData.color);
      if (formData.brand) fd.append('brand', formData.brand);
      if (formData.dateOccurred) fd.append('dateOccurred', formData.dateOccurred);
      if (formData.reward && type === 'LOST') fd.append('reward', formData.reward);
      fd.append('showPosterName', showName);
      fd.append('showPosterWhatsapp', showWhatsapp);
      fd.append('sensitiveImage', sensitiveImage);
      fd.append('urgency', urgency);

      selectedFiles.forEach((item) => {
        fd.append('images', item.file);
      });

      await api.createItem(fd);
      trackItemReport(type, formData.title);
      navigate('/');
    } catch (err) {
      console.error('Failed to create item', err);
      setError(err.message || 'Failed to submit report. Please verify image sizes and try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-[var(--bg-primary)] border border-[var(--border-medium)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)] focus:ring-1 focus:ring-[var(--accent-gold)] transition-all text-sm font-medium";
  const labelClass = "block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative">

      <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative z-10">
        {/* Back Button */}
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-6 decoration-none">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back to Feed
        </Link>

        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight font-heading">
              Post an Item
            </h1>
            <p className="text-[var(--text-secondary)] mt-2 text-sm">
              Detailed descriptions enable better matching.
            </p>
          </div>
          <div className="p-3 bg-[var(--accent-gold-dim)] rounded-xl">
            <Sparkles className="w-6 h-6" style={{ color: 'var(--accent-gold)' }} />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/20 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--accent-red)' }} />
            <p className="text-sm leading-normal font-medium" style={{ color: 'var(--accent-red)' }}>{error}</p>
          </div>
        )}
        
        {/* Type toggle */}
        <div className="flex bg-[var(--bg-tertiary)] p-1 rounded-xl mb-8 w-fit border border-[var(--border-subtle)]">
          <button 
            type="button" onClick={() => setType('LOST')}
            className={`px-6 sm:px-8 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${type === 'LOST' ? 'bg-white shadow-sm text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            style={type === 'LOST' ? { color: 'var(--accent-red)' } : {}}
          >
            I Lost Something
          </button>
          <button 
            type="button" onClick={() => setType('FOUND')}
            className={`px-6 sm:px-8 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${type === 'FOUND' ? 'bg-white shadow-sm text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            style={type === 'FOUND' ? { color: 'var(--accent-gold)' } : {}}
          >
            I Found Something
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload */}
          <div>
            <label className={labelClass}>Upload Images (Max 3, up to 5MB combined)</label>
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); setError(''); addFiles(Array.from(e.dataTransfer.files)); }}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[var(--border-medium)] hover:border-[var(--accent-gold)] transition-all rounded-xl p-8 flex flex-col items-center justify-center bg-[var(--bg-tertiary)] cursor-pointer group"
            >
              <input type="file" ref={fileInputRef} multiple accept="image/*" onChange={handleFileChange} className="hidden" />
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-sm border border-[var(--border-subtle)]">
                <UploadCloud className="w-6 h-6" style={{ color: 'var(--accent-gold)' }} />
              </div>
              <p className="text-[var(--text-primary)] font-semibold text-sm mb-1">Click or drag images to upload</p>
              <p className="text-[var(--text-secondary)] text-xs">JPEG, PNG, WEBP, or GIF</p>
            </div>
          </div>

          {/* Thumbnails */}
          {selectedFiles.length > 0 && (
            <div className="grid grid-cols-3 gap-4 bg-[var(--bg-tertiary)] p-4 border border-[var(--border-subtle)] rounded-xl">
              {selectedFiles.map((item, idx) => (
                <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-[var(--border-medium)] bg-black group/thumb">
                  <img src={item.previewUrl} alt={`preview-${idx}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                    <button type="button" onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                      className="p-2 bg-[var(--accent-red)] hover:bg-red-600 text-white rounded-full cursor-pointer shadow-lg">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-[10px] text-white font-medium">
                    {item.file.size < 1024 * 1024 
                      ? `${(item.file.size / 1024).toFixed(0)} KB` 
                      : `${(item.file.size / (1024 * 1024)).toFixed(1)} MB`}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sensitive image checkbox */}
          {selectedFiles.length > 0 && (
            <label className="flex items-center gap-3 bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 cursor-pointer group">
              <input type="checkbox" checked={sensitiveImage} onChange={(e) => setSensitiveImage(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 accent-amber-500" />
              <div>
                <p className="text-xs text-amber-300 font-semibold">Contains sensitive details</p>
                <p className="text-[10px] text-slate-500">Image will be blurred in the feed (ID numbers, serial numbers, faces)</p>
              </div>
            </label>
          )}

          {/* Core Fields */}
          <div className="space-y-4">
            {/* Title */}
            <div className="relative">
              <label className={labelClass}>Item Title *</label>
              <input required type="text" name="title" value={formData.title}
                onChange={(e) => { handleChange(e); setShowTitleSuggestions(true); }}
                onFocus={() => setShowTitleSuggestions(true)}
                onBlur={() => setTimeout(() => setShowTitleSuggestions(false), 200)}
                placeholder="e.g. Milton Water Bottle, ID Card" className={`${inputClass} relative z-20`} />
              {showTitleSuggestions && titleSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-secondary)] border border-[var(--border-medium)] rounded-xl shadow-lg overflow-hidden z-30">
                  <ul className="max-h-48 overflow-y-auto">
                    {titleSuggestions.map((t) => (
                      <li key={t} onMouseDown={(e) => { e.preventDefault(); setFormData(prev => ({ ...prev, title: t })); setShowTitleSuggestions(false); }}
                        className="px-4 py-3 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] cursor-pointer font-medium transition-colors">{t}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Category + Color row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Category</label>
                <select name="category" value={formData.category} onChange={handleChange}
                  className={`${inputClass} appearance-none cursor-pointer bg-no-repeat`} style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%231A202C%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundPosition: 'right 16px top 50%', backgroundSize: '12px auto' }}>
                  <option value="">Select category...</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Color</label>
                <select name="color" value={formData.color} onChange={handleChange}
                  className={`${inputClass} appearance-none cursor-pointer bg-no-repeat`} style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%231A202C%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundPosition: 'right 16px top 50%', backgroundSize: '12px auto' }}>
                  <option value="">Select color...</option>
                  {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Brand + Date row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Brand (Optional)</label>
                <input type="text" name="brand" value={formData.brand} onChange={handleChange}
                  placeholder="e.g. JBL, Samsung, Milton" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>
                  <Calendar className="w-3 h-3 inline mr-1" />
                  {type === 'LOST' ? 'When Lost' : 'When Found'}
                </label>
                <input type="datetime-local" name="dateOccurred" value={formData.dateOccurred} onChange={handleChange}
                  className={inputClass} />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className={labelClass}>Description *</label>
              <textarea required name="description" value={formData.description} onChange={handleChange}
                rows={3} placeholder="Describe the item in detail — scratches, stickers, unique features..."
                className={`${inputClass} resize-none leading-relaxed`} />
            </div>

            {/* Location + Identifying Marks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <label className={labelClass}>{type === 'LOST' ? 'Expected Location *' : 'Found Location *'}</label>
                <input required type="text" name="location" value={formData.location}
                  onChange={(e) => { handleChange(e); setShowLocSuggestions(true); }}
                  onFocus={() => setShowLocSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowLocSuggestions(false), 200)}
                  placeholder="e.g. Nalanda Classroom Complex" className={`${inputClass} relative z-20`} />
                {showLocSuggestions && locationSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-secondary)] border border-[var(--border-medium)] rounded-xl shadow-lg overflow-hidden z-30">
                    <ul className="max-h-48 overflow-y-auto">
                      {locationSuggestions.map((loc) => (
                        <li key={loc} onMouseDown={(e) => { e.preventDefault(); setFormData(prev => ({ ...prev, location: loc })); setShowLocSuggestions(false); }}
                          className="px-4 py-3 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] cursor-pointer font-medium transition-colors">{loc}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div>
                <label className={labelClass}>Identifying Marks (Optional)</label>
                <input type="text" name="identifyingMarks" value={formData.identifyingMarks} onChange={handleChange}
                  placeholder="e.g. Scratch on base, red tape" className={inputClass} />
              </div>
            </div>

            {/* Urgency + Reward (LOST only) */}
            {type === 'LOST' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Urgency</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setUrgency('NORMAL')}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${urgency === 'NORMAL' ? 'bg-slate-600/20 text-slate-300 border border-slate-500/20' : 'bg-white/[0.03] text-slate-600 border border-white/[0.06]'}`}>
                      Normal
                    </button>
                    <button type="button" onClick={() => setUrgency('URGENT')}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${urgency === 'URGENT' ? 'bg-red-500/20 text-red-300 border border-red-500/20' : 'bg-white/[0.03] text-slate-600 border border-white/[0.06]'}`}>
                      🔥 Urgent
                    </button>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Reward (Optional)</label>
                  <input type="text" name="reward" value={formData.reward} onChange={handleChange}
                    placeholder="e.g. ₹500 reward" className={inputClass} />
                </div>
              </div>
            )}
          </div>

          {/* ── Privacy Settings ────────────────────────── */}
          <div className="bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-5 h-5 text-[var(--accent-gold)]" />
              <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Privacy Settings</h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] -mt-2">Control what's visible publicly. Your info stays hidden until someone's claim is accepted.</p>

            <label className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl cursor-pointer group hover:border-[var(--border-medium)] transition-all">
              <div className="flex items-center gap-4">
                {showName ? <Eye className="w-5 h-5" style={{ color: 'var(--accent-gold)' }} /> : <EyeOff className="w-5 h-5 text-[var(--text-muted)]" />}
                <div>
                  <p className="text-sm text-[var(--text-primary)] font-semibold">Show my name publicly</p>
                  <p className="text-xs text-[var(--text-secondary)]">{showName ? 'Your name is visible' : 'Shows as "Verified Campus User"'}</p>
                </div>
              </div>
              <div className={`w-12 h-6 rounded-full transition-all relative cursor-pointer ${showName ? 'bg-[var(--accent-gold)]' : 'bg-[var(--border-medium)]'}`}
                onClick={(e) => { e.preventDefault(); setShowName(!showName); }}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${showName ? 'left-6.5' : 'left-0.5'}`} />
              </div>
            </label>

            <label className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl cursor-pointer group hover:border-[var(--border-medium)] transition-all">
              <div className="flex items-center gap-4">
                {showWhatsapp ? <Eye className="w-5 h-5" style={{ color: 'var(--accent-gold)' }} /> : <EyeOff className="w-5 h-5 text-[var(--text-muted)]" />}
                <div>
                  <p className="text-sm text-[var(--text-primary)] font-semibold">Show my WhatsApp publicly</p>
                  <p className="text-xs text-[var(--text-secondary)]">{showWhatsapp ? 'Your number is visible to all' : 'Hidden until claim accepted'}</p>
                </div>
              </div>
              <div className={`w-12 h-6 rounded-full transition-all relative cursor-pointer ${showWhatsapp ? 'bg-[var(--accent-gold)]' : 'bg-[var(--border-medium)]'}`}
                onClick={(e) => { e.preventDefault(); setShowWhatsapp(!showWhatsapp); }}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${showWhatsapp ? 'left-6.5' : 'left-0.5'}`} />
              </div>
            </label>
          </div>

          {/* Info note */}
          <div className="bg-[var(--accent-gold-dim)] border border-[var(--accent-gold)]/20 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--accent-gold)' }} />
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Your contact number <strong className="text-[var(--text-primary)]">{user?.whatsappNumber || 'Not Set'}</strong> is linked to this report. It will only be shared when you accept a claim.
            </p>
          </div>

          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[var(--accent-gold)] hover:brightness-110 disabled:opacity-50 text-white font-bold text-base py-4 rounded-xl shadow-md active:scale-[0.99] transition-all cursor-pointer">
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            {loading ? 'Publishing Post...' : 'Submit Post'}
          </button>
        </form>
      </div>
    </div>
  );
}
