import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Zap, Shield, Lock, Image as ImageIcon, Flag, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ active: 0, resolved: 247 }); // Fake base for presentation

  useEffect(() => {
    // Optionally fetch live stats
    const fetchStats = async () => {
      try {
        const items = await api.getItems('ALL');
        setStats({
          active: items.filter(i => i.status === 'ACTIVE').length,
          resolved: items.filter(i => i.status === 'RESOLVED').length + 247
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };
    fetchStats();
  }, []);

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Hero Section */}
      <section style={{ 
        padding: '120px 24px', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        textAlign: 'center',
        minHeight: '85vh',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', zIndex: 10 }} className="stagger-1 animate-slide-up">
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px',
            backgroundColor: 'var(--accent-gold-dim)', 
            padding: '8px 16px', 
            borderRadius: '999px', 
            fontSize: '13px', 
            fontWeight: '600', 
            color: 'var(--accent-gold)', 
            marginBottom: '32px' 
          }}>
            <Shield size={16} /> Verified IIT Kharagpur Platform
          </div>
          
          <h1 className="font-heading" style={{ 
            fontSize: 'clamp(48px, 8vw, 80px)', 
            fontWeight: '900', 
            lineHeight: 1.05, 
            color: 'var(--text-primary)', 
            margin: '0 0 24px 0',
            letterSpacing: '-0.03em'
          }}>
            Campus Lost & Found, <br/>
            <span style={{ color: 'var(--accent-gold)' }}>simplified.</span>
          </h1>
          
          <p style={{ 
            fontSize: '20px', 
            color: 'var(--text-secondary)', 
            maxWidth: '600px', 
            margin: '0 auto 48px auto', 
            lineHeight: 1.6 
          }}>
            Report lost items in seconds. Get matched automatically. Reclaim your belongings securely using your institute email.
          </p>
          
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {user ? (
              <Link to="/feed" className="btn-gold" style={{ padding: '16px 40px', fontSize: '18px' }}>
                Open App →
              </Link>
            ) : (
              <Link to="/login" className="btn-gold" style={{ padding: '16px 40px', fontSize: '18px' }}>
                Sign in with Google →
              </Link>
            )}
          </div>
          
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '24px', fontWeight: '500' }}>
            Strictly @iitkgp.ac.in login only.
          </p>
        </div>
      </section>

      {/* Live Stats Bar */}
      <div style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px', display: 'flex', flexWrap: 'wrap', gap: '48px', justifyContent: 'space-around', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="font-heading" style={{ fontSize: '40px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>{stats.resolved}</div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>Items Recovered</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="font-heading" style={{ fontSize: '40px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>{stats.active}</div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>Active Searches</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="font-heading" style={{ fontSize: '40px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>&lt;60s</div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>Average Post Time</div>
          </div>
        </div>
      </div>

      <div className="page-container" style={{ padding: '120px 24px' }}>
        {/* User Flow (How It Works) */}
        <section style={{ marginBottom: '160px' }}>
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <h2 className="font-heading" style={{ fontSize: '48px', fontWeight: '800', margin: '0 0 16px 0', color: 'var(--text-primary)' }}>How KGP Find works</h2>
            <p style={{ fontSize: '20px', color: 'var(--text-secondary)' }}>A seamless 3-step process to recover your items.</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
            {/* Step 1 */}
            <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '48px 32px', borderRadius: '24px', position: 'relative' }}>
              <div style={{ width: '64px', height: '64px', backgroundColor: 'var(--bg-secondary)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <Search size={32} color="var(--accent-gold)" />
              </div>
              <h3 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>1. Post your item</h3>
              <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>Describe what you lost or found. Add identifying marks, location, and a photo. Takes under a minute.</p>
            </div>
            {/* Step 2 */}
            <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '48px 32px', borderRadius: '24px', position: 'relative' }}>
              <div style={{ width: '64px', height: '64px', backgroundColor: 'var(--bg-secondary)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <Zap size={32} color="var(--accent-gold)" />
              </div>
              <h3 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>2. Auto-matching kicks in</h3>
              <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>Our system instantly scans all active posts to find high-confidence matches based on category, date, and location.</p>
            </div>
            {/* Step 3 */}
            <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '48px 32px', borderRadius: '24px', position: 'relative' }}>
              <div style={{ width: '64px', height: '64px', backgroundColor: 'var(--bg-secondary)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <CheckCircle2 size={32} color="var(--accent-gold)" />
              </div>
              <h3 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>3. Claim with proof</h3>
              <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>Submit proof of ownership securely. Once accepted by the finder, contact details are unlocked to arrange a meetup.</p>
            </div>
          </div>
        </section>

        {/* Security & Features */}
        <section style={{ marginBottom: '160px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '80px' }}>
            <h2 className="font-heading" style={{ fontSize: '48px', fontWeight: '800', margin: '0 0 16px 0', color: 'var(--text-primary)' }}>Built on Trust.</h2>
            <p style={{ fontSize: '20px', color: 'var(--text-secondary)', maxWidth: '600px' }}>Every feature is designed to protect your privacy and ensure items return to their rightful owners.</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
            {[
              { icon: Lock, title: 'KGPians only', desc: 'Login strictly restricted to @iitkgp.ac.in domains. No anonymous posts, no external spam.' },
              { icon: Shield, title: 'Privacy by default', desc: 'Your contact details are never shown publicly. Only revealed when a claim is accepted.' },
              { icon: Search, title: 'Campus-aware search', desc: 'Searches understand campus synonyms. Type "Nalanda" — find posts tagged "NRSC."' },
              { icon: Flag, title: 'Report & moderate', desc: 'Flag inappropriate content instantly. Community moderation ensures a clean feed.' },
              { icon: Image, title: 'Sensitive content blur', desc: 'Upload ID cards or sensitive photos safely. Public sees a blur, the owner sees everything.' }
            ].map((feat, i) => (
              <div key={i} className="feature-card" style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
                <div style={{ width: '48px', height: '48px', flexShrink: 0, borderRadius: '12px', backgroundColor: 'var(--accent-gold-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <feat.icon size={24} color="var(--accent-gold)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>{feat.title}</h3>
                  <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section style={{ 
          padding: '100px 40px', 
          textAlign: 'center', 
          backgroundColor: 'var(--bg-tertiary)', 
          borderRadius: '32px',
          border: '1px solid var(--border-subtle)'
        }}>
          <h2 className="font-heading" style={{ fontSize: '48px', fontWeight: '800', margin: '0 0 24px 0', color: 'var(--text-primary)' }}>Ready to find your item?</h2>
          <p style={{ fontSize: '20px', color: 'var(--text-secondary)', marginBottom: '48px', maxWidth: '600px', margin: '0 auto 48px auto' }}>Join thousands of KGPians who've already recovered what mattered.</p>
          {user ? (
            <Link to="/feed" className="btn-gold" style={{ padding: '16px 40px', fontSize: '18px' }}>Open App →</Link>
          ) : (
            <Link to="/login" className="btn-gold" style={{ padding: '16px 40px', fontSize: '18px' }}>Sign in with Google →</Link>
          )}
        </section>
      </div>
    </div>
  );
}
