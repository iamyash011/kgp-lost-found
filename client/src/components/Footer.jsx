import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--border-subtle)',
      backgroundColor: 'var(--bg-primary)',
      padding: '24px 0',
      marginTop: 'auto'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 24px',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Left: Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: '14px', fontWeight: '800', letterSpacing: '-0.02em' }}>
            <span style={{ color: 'var(--accent-gold)' }}>KGP</span>
            <span style={{ color: 'var(--text-primary)' }}> Find</span>
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
            © {new Date().getFullYear()}
          </span>
        </div>

        {/* Right: Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <Link to="#" style={{ textDecoration: 'none', color: 'inherit' }}>Privacy</Link>
          <Link to="#" style={{ textDecoration: 'none', color: 'inherit' }}>Terms</Link>
          <Link to="#" style={{ textDecoration: 'none', color: 'inherit' }}>Contact</Link>
        </div>
      </div>
    </footer>
  );
}
