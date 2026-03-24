import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

const CATEGORY_ICONS = {
  Reddit:  { icon: '💬', color: '#FF4500' },
  Reviews: { icon: '⭐', color: '#00D9FF' },
  News:    { icon: '📰', color: '#FFB830' },
  Jobs:    { icon: '💼', color: '#00F5A0' },
  Other:   { icon: '🔗', color: '#A8B4C8' },
};

const S = {
  page: { minHeight: '100vh', background: 'var(--navy)', display: 'flex', flexDirection: 'column' },
  nav: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 40px', borderBottom: '1px solid var(--border)',
    background: 'rgba(7,11,19,0.95)', backdropFilter: 'blur(12px)',
    position: 'sticky', top: 0, zIndex: 100,
  },
  navLeft:  { display: 'flex', alignItems: 'center', gap: 14 },
  navRight: { display: 'flex', gap: 10 },
  backBtn: {
    padding: '8px 16px', background: 'transparent',
    border: '1px solid var(--border2)', borderRadius: 8,
    color: 'var(--gray1)', fontSize: 13, cursor: 'pointer',
    fontFamily: 'var(--font-body)', transition: 'border-color 0.2s',
  },
  navTitle: { fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 700, color: 'var(--white)' },
  btnSec: {
    padding: '9px 18px', background: 'var(--surface)',
    border: '1px solid var(--border2)', borderRadius: 9,
    color: 'var(--white)', fontSize: 13, cursor: 'pointer',
    fontFamily: 'var(--font-body)', transition: 'border-color 0.2s',
  },
  btnPri: {
    padding: '9px 22px', background: 'var(--cyan)',
    border: 'none', borderRadius: 9, color: 'var(--navy)',
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'var(--font-head)', transition: 'opacity 0.2s',
  },
  body: {
    display: 'flex', maxWidth: 1200, margin: '0 auto',
    width: '100%', padding: '36px 40px', gap: 28,
  },
  aside: { width: 260, flexShrink: 0 },
  asideCard: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 14, padding: '18px', marginBottom: 14,
  },
  asideLabel: {
    fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--gray2)',
    textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12,
  },
  statRow: {
    display: 'flex', justifyContent: 'space-between',
    padding: '7px 0', borderBottom: '1px solid var(--border)',
  },
  statK: { fontSize: 12, color: 'var(--gray1)' },
  statV: { fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--cyan)' },

  // Sources panel
  sourceCat: { marginBottom: 16 },
  sourceCatHeader: {
    display: 'flex', alignItems: 'center', gap: 6,
    marginBottom: 8,
  },
  sourceCatIcon: { fontSize: 13 },
  sourceCatName: {
    fontFamily: 'var(--font-mono)', fontSize: 10,
    textTransform: 'uppercase', letterSpacing: '0.08em',
    fontWeight: 500,
  },
  sourceCatCount: {
    marginLeft: 'auto', fontSize: 10,
    fontFamily: 'var(--font-mono)', color: 'var(--gray2)',
  },
  sourceLink: {
    display: 'block', fontSize: 11, color: 'var(--gray1)',
    textDecoration: 'none', padding: '5px 8px',
    borderRadius: 6, marginBottom: 3,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid transparent',
    transition: 'all 0.15s', wordBreak: 'break-all',
    lineHeight: 1.4,
  },

  content: { flex: 1, minWidth: 0 },
  mdWrap: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 16, padding: '36px 44px',
  },
};

const MD_CSS = `
.md { font-family: 'DM Sans', sans-serif; color: #A8B4C8; line-height: 1.8; }
.md h1 { font-family: 'Syne',sans-serif; font-size: 26px; font-weight: 800; color: #fff; margin: 0 0 20px; }
.md h2 { font-family: 'Syne',sans-serif; font-size: 19px; font-weight: 700; color: #fff; margin: 32px 0 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.md h3 { font-family: 'Syne',sans-serif; font-size: 15px; font-weight: 700; color: #00D9FF; margin: 20px 0 8px; }
.md p  { margin: 0 0 14px; }
.md ul, .md ol { padding-left: 18px; margin: 0 0 14px; }
.md li { margin-bottom: 6px; }
.md strong { color: #fff; font-weight: 500; }
.md hr { border: none; border-top: 1px solid rgba(255,255,255,0.06); margin: 28px 0; }
.md code { font-family: 'DM Mono',monospace; font-size: 13px; background: #0C1220; border: 1px solid rgba(255,255,255,0.07); padding: 2px 6px; border-radius: 4px; color: #00D9FF; }
.md table { width: 100%; border-collapse: collapse; margin: 0 0 20px; font-size: 13px; }
.md th { background: rgba(0,217,255,0.07); color: #fff; padding: 9px 12px; text-align: left; border-bottom: 1px solid rgba(0,217,255,0.15); font-family: 'Syne',sans-serif; font-size: 12px; }
.md td { padding: 9px 12px; border-bottom: 1px solid rgba(255,255,255,0.04); }
.md tr:hover td { background: rgba(255,255,255,0.02); }
.md blockquote { border-left: 3px solid #00D9FF; margin: 0 0 14px; padding: 8px 16px; background: rgba(0,217,255,0.04); border-radius: 0 6px 6px 0; }
.md a { color: #00D9FF; text-decoration: none; }
.md a:hover { text-decoration: underline; }
`;

function getDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url.slice(0, 30);
  }
}

function SourcesPanel({ sources }) {
  const total = Object.values(sources).reduce((a, v) => a + v.length, 0);
  if (total === 0) return null;

  return (
    <div style={S.asideCard}>
      <div style={{ ...S.asideLabel, marginBottom: 16 }}>
        Live Sources ({total})
      </div>
      {Object.entries(sources).map(([cat, urls]) => {
        const meta = CATEGORY_ICONS[cat] || CATEGORY_ICONS.Other;
        return (
          <div key={cat} style={S.sourceCat}>
            <div style={S.sourceCatHeader}>
              <span style={S.sourceCatIcon}>{meta.icon}</span>
              <span style={{ ...S.sourceCatName, color: meta.color }}>{cat}</span>
              <span style={S.sourceCatCount}>{urls.length}</span>
            </div>
            {urls.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={S.sourceLink}
                onMouseOver={e => {
                  e.currentTarget.style.borderColor = meta.color + '40';
                  e.currentTarget.style.color = '#fff';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.color = 'var(--gray1)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                }}
              >
                ↗ {getDomain(url)}
              </a>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default function Report() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { report, competitor, yourCompany, sources = {} } = location.state || {};
  const [copied, setCopied] = useState(false);

  if (!report) {
    return (
      <div style={{ ...S.page, alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--gray1)' }}>No report found.</p>
        <button onClick={() => navigate('/')} style={{ ...S.btnSec, marginTop: 16 }}>← Back</button>
      </div>
    );
  }

  const wordCount   = report.trim().split(/\s+/).length;
  const totalSources = Object.values(sources).reduce((a, v) => a + v.length, 0);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={S.page}>
      <style>{MD_CSS}</style>

      <nav style={S.nav}>
        <div style={S.navLeft}>
          <button style={S.backBtn} onClick={() => navigate('/')}
            onMouseOver={e => e.target.style.borderColor = 'var(--cyan)'}
            onMouseOut={e  => e.target.style.borderColor = 'var(--border2)'}>
            ← New analysis
          </button>
          <span style={S.navTitle}>
            Intelligence Report: {competitor}
          </span>
        </div>
        <div style={S.navRight}>
          <button style={S.btnSec} onClick={handleCopy}
            onMouseOver={e => e.target.style.borderColor = 'var(--cyan)'}
            onMouseOut={e  => e.target.style.borderColor = 'var(--border2)'}>
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
          <button style={S.btnPri} onClick={() => window.print()}
            onMouseOver={e => e.target.style.opacity = '0.85'}
            onMouseOut={e  => e.target.style.opacity = '1'}>
            🖨️ Export PDF
          </button>
        </div>
      </nav>

      <div style={S.body}>
        <aside style={S.aside}>

          {/* Stats card */}
          <div style={S.asideCard}>
            <div style={S.asideLabel}>Report Stats</div>
            {[
              { k: 'Competitor',    v: competitor },
              { k: 'Your company',  v: yourCompany },
              { k: 'Word count',    v: wordCount.toLocaleString() },
              { k: 'Live sources',  v: totalSources },
              { k: 'Agents used',   v: '4' },
              { k: 'Status',        v: 'Complete ✓' },
            ].map(r => (
              <div key={r.k} style={S.statRow}>
                <span style={S.statK}>{r.k}</span>
                <span style={S.statV}>{r.v}</span>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div style={S.asideCard}>
            <div style={S.asideLabel}>Actions</div>
            <button style={{ ...S.btnSec, width: '100%', marginBottom: 8, textAlign: 'left' }}
              onClick={handleCopy}>
              📋 Copy as Markdown
            </button>
            <button style={{ ...S.btnPri, width: '100%', textAlign: 'left' }}
              onClick={() => window.print()}>
              🖨️ Print / Save PDF
            </button>
          </div>

          {/* Sources panel */}
          <SourcesPanel sources={sources} />

        </aside>

        <div style={S.content}>
          <div style={S.mdWrap} className="fade-up">
            <div className="md">
              <ReactMarkdown>{report}</ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
