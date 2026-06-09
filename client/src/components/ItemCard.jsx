import { MapPin, Clock, Flag } from 'lucide-react';
import { timeAgo } from '../utils/timeAgo';
import HighlightText from './HighlightText';
import { useAuth } from '../context/AuthContext';

export default function ItemCard({ item, searchQuery, onClick, onReport }) {
  const { user } = useAuth();
  const isOwner = item.userId === user?.id;
  const isLost = item.type === 'LOST';

  // Extract first image
  let displayImg = null;
  if (item.imageUrl) {
    try {
      const parsed = JSON.parse(item.imageUrl);
      const first = Array.isArray(parsed) ? parsed[0] : parsed;
      if (first) {
        displayImg = first.startsWith('http') ? first : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${first}`;
      }
    } catch (e) {
      displayImg = item.imageUrl.startsWith('http') ? item.imageUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${item.imageUrl}`;
    }
  }

  const tagColor = isLost ? 'var(--accent-red)' : 'var(--accent-blue)';
  const tagBg = isLost ? 'rgba(247, 89, 89, 0.15)' : 'rgba(79, 142, 247, 0.15)';
  const tagBorder = isLost ? 'rgba(247, 89, 89, 0.25)' : 'rgba(79, 142, 247, 0.25)';

  return (
    <div 
      onClick={onClick}
      style={{
        position: 'relative',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '16px',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.18s ease-out, border-color 0.18s ease-out',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.borderColor = 'var(--border-medium)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'var(--border-subtle)';
      }}
    >
      {/* Image Area */}
      <div style={{ height: '180px', width: '100%', backgroundColor: 'var(--bg-tertiary)', position: 'relative' }}>
        {displayImg ? (
          <img src={displayImg} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: item.sensitiveImage ? 'blur(8px)' : 'none' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            No Image
          </div>
        )}

        {/* Absolute Status Tag */}
        <div style={{
          position: 'absolute', top: '12px', right: '12px',
          backgroundColor: tagBg, color: tagColor, border: `1px solid ${tagBorder}`,
          padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700',
          letterSpacing: '0.08em', textTransform: 'uppercase'
        }}>
          {item.type}
        </div>
      </div>

      {/* Card Body */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <HighlightText text={item.title} highlight={searchQuery} />
        </h3>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          <MapPin size={14} />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }}>
            {item.location}
          </span>
          <span>·</span>
          <span>{timeAgo(item.createdAt)}</span>
        </div>

        <p style={{ 
          margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
        }}>
          <HighlightText text={item.description} highlight={searchQuery} />
        </p>

        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)' }}>
            {item.category || 'Other'}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {user && !isOwner && (
              <button 
                onClick={(e) => { e.stopPropagation(); onReport(item); }}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                title="Report"
              >
                <Flag size={14} />
              </button>
            )}
            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>Claim →</span>
          </div>
        </div>
      </div>
    </div>
  );
}
