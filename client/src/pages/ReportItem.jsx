import { UploadCloud, CheckCircle2, Loader2, X, AlertTriangle, Sparkles, Image as ImageIcon } from 'lucide-react';
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

import { LOCATION_SYNONYMS } from '../utils/locations';
import { COMMON_ITEMS } from '../utils/items';

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
  });

  const [showLocSuggestions, setShowLocSuggestions] = useState(false);
  const [showTitleSuggestions, setShowTitleSuggestions] = useState(false);

  // Compute title suggestions dynamically based on input
  const titleSuggestions = formData.title.length >= 1 ?
    COMMON_ITEMS.filter(item => item.toLowerCase().includes(formData.title.toLowerCase()))
    : COMMON_ITEMS.slice(0, 50); // Show top 50 if empty

  // Compute location suggestions dynamically based on input
  const locationSuggestions = formData.location.length >= 1 ? 
    Object.entries(LOCATION_SYNONYMS)
      .filter(([standardName, synonyms]) => {
        const query = formData.location.toLowerCase();
        return standardName.toLowerCase().includes(query) || synonyms.some(s => s.includes(query));
      })
      .map(([standardName]) => standardName)
    : [];

  // State to hold actual File objects and their temporary preview URLs
  const [selectedFiles, setSelectedFiles] = useState([]); // [{ file, previewUrl }]

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setError('');
    const files = Array.from(e.target.files);
    addFiles(files);
  };

  const addFiles = (files) => {
    // Check if total files will exceed 3
    if (selectedFiles.length + files.length > 3) {
      setError('You can only upload a maximum of 3 images.');
      return;
    }

    const currentTotalSize = selectedFiles.reduce((acc, item) => acc + item.file.size, 0);
    const newFilesSize = files.reduce((acc, file) => acc + file.size, 0);
    
    if ((currentTotalSize + newFilesSize) > 5 * 1024 * 1024) {
      setError('Total image size exceeds the 5MB combined limit. Please choose smaller images.');
      return;
    }

    const newSelections = [];
    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Only image files (JPEG, PNG, WEBP, GIF) are permitted.');
        return;
      }

      newSelections.push({
        file,
        previewUrl: URL.createObjectURL(file)
      });
    }

    setSelectedFiles((prev) => [...prev, ...newSelections]);
  };

  const removeFile = (indexToRemove) => {
    setSelectedFiles((prev) => {
      // Revoke the temporary object URL to free up memory
      URL.revokeObjectURL(prev[indexToRemove].previewUrl);
      return prev.filter((_, idx) => idx !== indexToRemove);
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setError('');
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !formData.location) return;

    setLoading(true);
    try {
      // Create FormData payload
      const formDataToSend = new FormData();
      formDataToSend.append('userId', user.id);
      formDataToSend.append('type', type);
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('location', formData.location);
      if (formData.identifyingMarks) {
        formDataToSend.append('identifyingMarks', formData.identifyingMarks);
      }

      // Append binary files
      selectedFiles.forEach((item) => {
        formDataToSend.append('images', item.file);
      });

      await api.createItem(formDataToSend);
      navigate('/');
    } catch (err) {
      console.error('Failed to create item', err);
      setError('Failed to submit report. Please verify image sizes and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative">
      <div className="absolute top-10 left-10 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-200 dark:border-slate-700/50 rounded-3xl p-8 backdrop-blur-md shadow-2xl relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight font-heading bg-gradient-to-r from-blue-100 to-slate-200 bg-clip-text">
              Report an Item
            </h1>
            <p className="text-slate-600 dark:text-slate-400 dark:text-slate-400 mt-1.5 text-sm">
              Provide as many details as possible to help active keyword matching.
            </p>
          </div>
          <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <Sparkles className="w-5 h-5 text-blue-400" />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-200 leading-normal font-semibold">{error}</p>
          </div>
        )}
        
        <div className="flex bg-white dark:bg-slate-900/60 p-1 rounded-xl mb-8 w-fit border border-slate-200 dark:border-slate-700/40">
          <button 
            type="button"
            onClick={() => setType('LOST')}
            className={`px-8 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${type === 'LOST' ? 'bg-red-500/25 text-red-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:text-white'}`}
          >
            I Lost Something
          </button>
          <button 
            type="button"
            onClick={() => setType('FOUND')}
            className={`px-8 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${type === 'FOUND' ? 'bg-emerald-500/25 text-emerald-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:text-white'}`}
          >
            I Found Something
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Custom multi-image drag & drop upload zone */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 dark:text-slate-400 mb-2">
              Upload Images (Max 3, up to 5MB combined)
            </label>

            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-500/50 transition-all rounded-3xl p-8 flex flex-col items-center justify-center bg-white dark:bg-slate-900/20 cursor-pointer group hover:bg-white dark:bg-slate-900/40 relative overflow-hidden"
            >
              <input 
                type="file"
                ref={fileInputRef}
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mb-3 group-hover:scale-105 transition-transform border border-blue-500/15">
                <UploadCloud className="w-6 h-6 text-blue-400" />
              </div>
              <p className="text-slate-800 dark:text-slate-200 font-semibold text-xs mb-1">Click or drag images to upload</p>
              <p className="text-slate-600 dark:text-slate-400 text-xxs leading-normal">
                JPEG, PNG, WEBP, or GIF. Maximum 3 images, up to 5MB combined.
              </p>
            </div>
          </div>

          {/* Thumbnail preview list */}
          {selectedFiles.length > 0 && (
            <div className="grid grid-cols-3 gap-4 bg-white dark:bg-slate-900/30 p-4 border border-slate-200 dark:border-slate-800 rounded-3xl">
              {selectedFiles.map((item, idx) => (
                <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 group/thumb shadow-md">
                  <img src={item.previewUrl} alt={`preview-${idx}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                      className="p-1.5 bg-red-600 hover:bg-red-500 text-slate-900 dark:text-white rounded-full transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="absolute bottom-2 left-2 bg-white dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded text-xxs text-slate-350 font-medium">
                    {(item.file.size / (1024 * 1024)).toFixed(1)} MB
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-4">
            <div className="relative">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 dark:text-slate-400 mb-1.5">Item Title *</label>
              <input 
                required
                type="text" 
                name="title"
                value={formData.title}
                onChange={(e) => {
                  handleChange(e);
                  setShowTitleSuggestions(true);
                }}
                onFocus={() => setShowTitleSuggestions(true)}
                onBlur={() => setTimeout(() => setShowTitleSuggestions(false), 200)}
                placeholder="e.g. Milton Water Bottle, ID Card, etc..." 
                className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-650 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all text-xs font-medium relative z-20" 
              />

              {showTitleSuggestions && titleSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden z-30 animate-in fade-in slide-in-from-top-2 duration-150">
                  <ul className="max-h-48 overflow-y-auto">
                    {titleSuggestions.map((itemTitle) => (
                      <li 
                        key={itemTitle}
                        onClick={() => {
                          setFormData(prev => ({ ...prev, title: itemTitle }));
                          setShowTitleSuggestions(false);
                        }}
                        className="px-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 hover:bg-slate-700 cursor-pointer font-medium transition-colors"
                      >
                        {itemTitle}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 dark:text-slate-400 mb-1.5">Description *</label>
              <textarea 
                required
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4} 
                placeholder="Describe the item in detail (e.g. scratch, sticker, exact look). Higher keyword detail enables better matching score!" 
                className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-650 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all text-xs font-medium resize-none leading-relaxed"
              ></textarea>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 dark:text-slate-400 mb-1.5">
                  {type === 'LOST' ? 'Expected Location *' : 'Found Location *'}
                </label>
                <input 
                  required
                  type="text" 
                  name="location"
                  value={formData.location}
                  onChange={(e) => {
                    handleChange(e);
                    setShowLocSuggestions(true);
                  }}
                  onFocus={() => setShowLocSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowLocSuggestions(false), 200)}
                  placeholder="e.g. Nalanda Classroom Complex" 
                  className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-650 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all text-xs font-medium relative z-20" 
                />
                
                {showLocSuggestions && locationSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden z-30 animate-in fade-in slide-in-from-top-2 duration-150">
                    <ul className="max-h-48 overflow-y-auto">
                      {locationSuggestions.map((loc) => (
                        <li 
                          key={loc}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, location: loc }));
                            setShowLocSuggestions(false);
                          }}
                          className="px-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 hover:bg-slate-700 cursor-pointer font-medium transition-colors"
                        >
                          {loc}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 dark:text-slate-400 mb-1.5">Identifying Marks (Optional)</label>
                <input 
                  type="text" 
                  name="identifyingMarks"
                  value={formData.identifyingMarks}
                  onChange={handleChange}
                  placeholder="e.g. Scratch on base, red tape on neck" 
                  className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-650 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all text-xs font-medium" 
                />
              </div>
            </div>
          </div>

          <div className="bg-blue-500/5 border border-blue-500/10 rounded-3xl p-4 flex items-start gap-3 mt-8">
            <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5 animate-pulse" />
            <p className="text-xxs text-slate-350 leading-relaxed">
              Your contact number <strong className="text-slate-900 dark:text-white">{user?.whatsappNumber || 'Not Set'}</strong> will be automatically linked to this report so matches can establish quick, immediate communication.
            </p>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 disabled:opacity-50 text-slate-900 dark:text-white font-bold text-sm py-3.5 rounded-xl shadow-lg active:scale-[0.99] transition-all cursor-pointer"
          >
            {loading && <Loader2 className="w-4.5 h-4.5 animate-spin" />}
            {loading ? 'Publishing Report...' : 'Submit Report'}
          </button>
        </form>
      </div>
    </div>
  );
}

