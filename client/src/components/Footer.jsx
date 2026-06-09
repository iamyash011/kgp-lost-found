import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--border-subtle)',
      backgroundColor: 'var(--bg-tertiary)',
      padding: '64px 0 32px 0',
      marginTop: 'auto'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 24px',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '48px', marginBottom: '64px' }}>
          
          {/* Brand */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', fontWeight: '900', letterSpacing: '-0.04em' }}>
                <span style={{ color: 'var(--accent-gold)' }}>KGP</span>
                <span style={{ color: 'var(--text-primary)' }}> Find</span>
              </span>
            </Link>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, maxWidth: '240px', margin: 0 }}>
              The premium lost and found network exclusively built for the IIT Kharagpur campus.
            </p>
          </div>

          {/* Links 1 */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '20px' }}>Platform</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
              <Link to="/feed" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Explore Feed</Link>
              <Link to="/report" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Post an Item</Link>
              <Link to="/profile" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>My Profile</Link>
            </div>
          </div>

          {/* Links 2 */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '20px' }}>Resources</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
              <Link to="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>How it Works</Link>
              <Link to="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Safety Guidelines</Link>
              <Link to="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Help Center</Link>
            </div>
          </div>

          {/* Links 3 */}
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '20px' }}>Legal</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
              <Link to="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Privacy Policy</Link>
              <Link to="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Terms of Service</Link>
              <Link to="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Contact Us</Link>
            </div>
          </div>

        </div>

        <div style={{
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '32px',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            © {new Date().getFullYear()} KGP Find. All rights reserved.
          </span>
          <div style={{ color: 'var(--text-muted)', fontSize: '14px', display: 'flex', gap: '24px' }}>
            <span>Made with precision for IIT KGP</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
