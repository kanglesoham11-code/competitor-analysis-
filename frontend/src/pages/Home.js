import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = 'http://localhost:8000';

const S = {
  page: {
    minHeight: '100vh', background: 'var(--navy)',
    display: 'flex', flexDirection: 'column',
    position: 'relative', overflow: 'hidden',
  },
  bg: {
    position: 'absolute', inset: 0, pointerEvents: 'none',
    backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
    backgroundSize: '52px 52px',
  },
  glow1: {
    position: 'absolute', width: 700, height: 700, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,217,255,0.05) 0%, transparent 65%)',
    top: -200, right: -200, pointerEvents: 'none',
  },
  glow2: {
    position: 'absolute', width: 500, height: 500, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,245,160,0.04) 0%, transparent 65%)',
    bottom: -100, left: -100, pointerEvents: 'none',
  },
  nav: {
    position: 'relative', zIndex: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 48px', borderBottom: '1px solid var(--border)',
  },
  logo: { fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 800, color: 'var(--white)', display: 'flex', alignItems: 'center', gap: 10 },
  logoDot: { width: 8, height: 8, borderRadius: '50%', background: 'var(--cyan)', animation: 'pulse 2s ease infinite' },
  navBadge: {
    fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cyan)',
    background: 'var(--cyan-dim)', border: '1px solid rgba(0,217,255,0.2)',
    borderRadius: 6, padding: '4px 12px', letterSpacing: '0.06em',
  },
  main: {
    position: 'relative', zIndex: 10,
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '40px 24px',
  },
  inner: { width: '100%', maxWidth: 640 },
  eyebrow: {
    fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cyan)',
    letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 20,
    display: 'flex', alignItems: 'center', gap: 8,
  },
  eyebrowLine: { flex: 1, height: 1, background: 'rgba(0,217,255,0.2)' },
  title: {
    fontFamily: 'var(--font-head)', fontSize: 52, fontWeight: 800,
    lineHeight: 1.08, color: 'var(--white)', marginBottom: 20,
  },
  accent: {
    color: 'transparent',
    backgroundImage: 'linear-gradient(135deg, #00D9FF, #00F5A0)',
    WebkitBackgroundClip: 'text', backgroundClip: 'text',
  },
  sub: { color: 'var(--gray1)', fontSize: 17, lineHeight: 1.6, marginBottom: 48, maxWidth: 520 },
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border2)',
    borderRadius: 20, padding: '36px 32px',
  },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 },
  field: { marginBottom: 16 },
  label: {
    display: 'block', fontFamily: 'var(--font-mono)', fontSize: 11,
    color: 'var(--gray2)', textTransform: 'uppercase', letterSpacing: '0.1em',
    marginBottom: 8,
  },
  input: {
    width: '100%', background: 'var(--navy2)',
    border: '1px solid var(--border2)', borderRadius: 10,
    padding: '13px 16px', color: 'var(--white)',
    fontFamily: 'var(--font-body)', fontSize: 14,
    outline: 'none', transition: 'border-color 0.2s',
  },
  divider: {
    display: 'flex', alignItems: 'center', gap: 12,
    margin: '20px 0', color: 'var(--gray2)', fontSize: 12,
    fontFamily: 'var(--font-mono)',
  },
  dividerLine: { flex: 1, height: '1px', background: 'var(--border)' },
  btn: {
    width: '100%', padding: '18px',
    background: 'linear-gradient(135deg, #00D9FF 0%, #00B8D9 100%)',
    color: 'var(--navy)', border: 'none', borderRadius: 12,
    fontFamily: 'var(--font-head)', fontSize: 17, fontWeight: 800,
    cursor: 'pointer', transition: 'transform 0.15s, opacity 0.15s',
    letterSpacing: '0.01em', marginTop: 8,
  },
  err: {
    background: 'rgba(255,77,109,0.08)', border: '1px solid rgba(255,77,109,0.25)',
    borderRadius: 10, padding: '12px 16px', marginBottom: 16,
    color: 'var(--red)', fontSize: 13,
  },
  features: {
    display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
    gap: 12, marginTop: 48,
  },
  feature: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 12, padding: '16px',
  },
  featureIcon: { fontSize: 20, marginBottom: 8 },
  featureTitle: { fontFamily: 'var(--font-head)', fontSize: 13, fontWeight: 700, color: 'var(--white)', marginBottom: 4 },
  featureSub: { fontSize: 12, color: 'var(--gray1)' },
};

export default function Home() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    your_company: '',
    competitor: '',
    competitor_url: '',
    groq_api_key: localStorage.getItem('groq_key') || '',
  });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const focus = e => e.target.style.borderColor = 'rgba(0,217,255,0.5)';
  const blur  = e => e.target.style.borderColor = 'var(--border2)';

  const handleSubmit = async () => {
    if (!form.your_company.trim()) { setError('Enter your company name.'); return; }
    if (!form.competitor.trim())   { setError('Enter competitor name.'); return; }
    if (!form.groq_api_key.trim()) { setError('Enter your Groq API key.'); return; }
    setLoading(true); setError('');
    try {
      localStorage.setItem('groq_key', form.groq_api_key);
      const res = await axios.post(`${API}/api/analyze`, form);
      navigate('/tracking', { state: { taskId: res.data.task_id, competitor: form.competitor, yourCompany: form.your_company } });
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Cannot connect to backend. Is it running?');
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      <div style={S.bg} />
      <div style={S.glow1} />
      <div style={S.glow2} />

      <nav style={S.nav}>
        <div style={S.logo}>
          <div style={S.logoDot} />
          Intel Engine
        </div>
        <span style={S.navBadge}>LIVE INTELLIGENCE</span>
      </nav>

      <main style={S.main}>
        <div style={S.inner}>
          <div className="fade-up">
            <div style={S.eyebrow}>
              <div style={S.eyebrowLine} />
              Competitor Intelligence
              <div style={S.eyebrowLine} />
            </div>
            <h1 style={S.title}>Know Your Enemy.<br /><span style={S.accent}>Win Every Deal.</span></h1>
            <p style={S.sub}>Real-time intelligence on any competitor. Website analysis, review mining, hiring signals, and a ready-to-use sales battlecard — in under 2 minutes.</p>
          </div>

          <div style={S.card} className="fade-up-1">
            {error && <div style={S.err}>{error}</div>}

            <div style={S.row}>
              <div>
                <label style={S.label}>Your Company</label>
                <input style={S.input} placeholder="Acme Corp" value={form.your_company}
                  onChange={e => set('your_company', e.target.value)} onFocus={focus} onBlur={blur} />
              </div>
              <div>
                <label style={S.label}>Competitor Name</label>
                <input style={S.input} placeholder="RivalCo" value={form.competitor}
                  onChange={e => set('competitor', e.target.value)} onFocus={focus} onBlur={blur} />
              </div>
            </div>

            <div style={S.field}>
              <label style={S.label}>Competitor Website (optional — improves accuracy)</label>
              <input style={S.input} placeholder="https://rivalco.com" value={form.competitor_url}
                onChange={e => set('competitor_url', e.target.value)} onFocus={focus} onBlur={blur} />
            </div>

            <div style={S.divider}>
              <div style={S.dividerLine} />
              API KEY
              <div style={S.dividerLine} />
            </div>

            <div style={S.field}>
              <label style={S.label}>Groq API Key</label>
              <input style={S.input} type="password" placeholder="gsk_xxxxxxxxxxxx" value={form.groq_api_key}
                onChange={e => set('groq_api_key', e.target.value)} onFocus={focus} onBlur={blur} />
            </div>

            <button
              style={{ ...S.btn, opacity: loading ? 0.7 : 1 }}
              onClick={handleSubmit}
              disabled={loading}
              onMouseOver={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              {loading ? '⏳ Starting analysis...' : '🔍 Run Intelligence Analysis'}
            </button>
          </div>

          <div style={S.features} className="fade-up-2">
            {[
              { icon: '🌐', title: 'Live web scraping',   sub: 'Real data, not cached' },
              { icon: '💬', title: 'Review mining',        sub: 'G2, Trustpilot, Capterra' },
              { icon: '⚔️',  title: 'Sales battlecard',    sub: 'Use it today in calls' },
            ].map(f => (
              <div key={f.title} style={S.feature}>
                <div style={S.featureIcon}>{f.icon}</div>
                <div style={S.featureTitle}>{f.title}</div>
                <div style={S.featureSub}>{f.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
