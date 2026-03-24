import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const API     = 'http://localhost:8000';
const POLL_MS = 3000;
const TIMEOUT = 5 * 60 * 1000;

const AGENTS = [
  { key: 'scraper',    icon: '🌐', label: 'Web Scraper',   desc: 'Scanning website, Reddit, G2, Trustpilot, news, jobs' },
  { key: 'analyst',    icon: '🔬', label: 'Intel Analyst', desc: 'Extracting strengths and weaknesses from real data' },
  { key: 'strategist', icon: '♟️',  label: 'Strategist',    desc: 'Building competitive strategy' },
  { key: 'battlecard', icon: '⚔️',  label: 'Battlecard AI', desc: 'Writing your sales battlecard' },
];

const S = {
  page: { minHeight: '100vh', background: 'var(--navy)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' },
  top:  { textAlign: 'center', marginBottom: 48 },
  eyebrow: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cyan)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 },
  title: { fontFamily: 'var(--font-head)', fontSize: 38, fontWeight: 800, color: 'var(--white)', marginBottom: 8 },
  sub:   { color: 'var(--gray1)', fontSize: 15 },
  progressWrap: { width: '100%', maxWidth: 680, marginBottom: 12 },
  track: { height: 3, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden' },
  bar:   pct => ({ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#00A8CC,#00D9FF)', borderRadius: 4, transition: 'width 0.6s ease' }),
  pctLabel: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--gray2)', textAlign: 'right', marginTop: 6 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, width: '100%', maxWidth: 680, marginBottom: 32 },
  card: status => ({
    background: status === 'completed' ? 'rgba(0,245,160,0.04)' : status === 'running' ? 'rgba(0,217,255,0.06)' : 'var(--surface)',
    border: `1px solid ${status === 'completed' ? 'rgba(0,245,160,0.2)' : status === 'running' ? 'rgba(0,217,255,0.3)' : status === 'error' ? 'rgba(255,77,109,0.25)' : 'var(--border)'}`,
    borderRadius: 16, padding: '22px 20px', transition: 'all 0.35s ease',
  }),
  cardTop: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 },
  icon:  { fontSize: 22 },
  name:  { fontFamily: 'var(--font-head)', fontSize: 14, fontWeight: 700, color: 'var(--white)', flex: 1 },
  badge: status => ({
    fontSize: 10, fontFamily: 'var(--font-mono)', padding: '3px 8px', borderRadius: 5,
    background: status === 'completed' ? 'rgba(0,245,160,0.12)' : status === 'running' ? 'rgba(0,217,255,0.12)' : status === 'error' ? 'rgba(255,77,109,0.12)' : 'rgba(255,255,255,0.04)',
    color: status === 'completed' ? 'var(--green)' : status === 'running' ? 'var(--cyan)' : status === 'error' ? 'var(--red)' : 'var(--gray2)',
    letterSpacing: '0.06em',
  }),
  msg:     { fontSize: 13, color: 'var(--gray1)', display: 'flex', alignItems: 'center', gap: 8 },
  spinner: { width: 12, height: 12, border: '2px solid rgba(0,217,255,0.15)', borderTop: '2px solid var(--cyan)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 },
  cancelBtn: { padding: '10px 28px', background: 'transparent', border: '1px solid var(--border2)', borderRadius: 10, color: 'var(--gray1)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'border-color 0.2s' },
  err: { background: 'rgba(255,77,109,0.08)', border: '1px solid rgba(255,77,109,0.25)', borderRadius: 12, padding: '16px 20px', maxWidth: 680, width: '100%', marginBottom: 24, color: 'var(--red)', fontSize: 14 },
};

function fmt(s) { return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; }

export default function Tracking() {
  const navigate = useNavigate();
  const location = useLocation();
  const { taskId, competitor, yourCompany } = location.state || {};

  const [agents, setAgents] = useState({
    scraper:    { status: 'pending', message: '' },
    analyst:    { status: 'pending', message: '' },
    strategist: { status: 'pending', message: '' },
    battlecard: { status: 'pending', message: '' },
  });
  const [elapsed, setElapsed] = useState(0);
  const [error, setError]     = useState('');
  const intRef = useRef(null);
  const tmrRef = useRef(null);
  const toRef  = useRef(null);
  const t0     = useRef(Date.now());

  useEffect(() => {
    if (!taskId) { navigate('/'); return; }

    const poll = async () => {
      try {
        const { data } = await axios.get(`${API}/api/status/${taskId}`);
        if (data.agents) setAgents(data.agents);
        if (data.status === 'completed') {
          clearAll();
          navigate('/report', {
            state: {
              report:      data.report,
              sources:     data.sources || {},
              competitor,
              yourCompany,
            }
          });
        }
        if (data.status === 'error') {
          clearAll();
          setError(data.error || 'Analysis failed.');
        }
      } catch { /* keep polling */ }
    };

    poll();
    intRef.current = setInterval(poll, POLL_MS);
    tmrRef.current = setInterval(() => setElapsed(Math.floor((Date.now()-t0.current)/1000)), 1000);
    toRef.current  = setTimeout(() => { clearAll(); setError('Timed out after 5 minutes.'); }, TIMEOUT);
    return clearAll;
  }, [taskId]);

  const clearAll = () => {
    clearInterval(intRef.current);
    clearInterval(tmrRef.current);
    clearTimeout(toRef.current);
  };

  const done = Object.values(agents).filter(a => a.status === 'completed').length;
  const pct  = (done / 4) * 100;

  return (
    <div style={S.page}>
      <div style={S.top} className="fade-up">
        <p style={S.eyebrow}>// Intelligence Gathering Active</p>
        <h1 style={S.title}>Analyzing {competitor}</h1>
        <p style={S.sub}>Elapsed: {fmt(elapsed)} · {done}/4 agents complete</p>
      </div>

      {error && (
        <div style={S.err}>
          <strong>Error:</strong> {error}
          <br />
          <button onClick={() => navigate('/')} style={{ ...S.cancelBtn, marginTop: 12 }}>← Try again</button>
        </div>
      )}

      <div style={S.progressWrap} className="fade-up-1">
        <div style={S.track}><div style={S.bar(pct)} /></div>
        <div style={S.pctLabel}>{Math.round(pct)}% complete</div>
      </div>

      <div style={S.grid} className="fade-up-1">
        {AGENTS.map(a => {
          const ag = agents[a.key] || { status: 'pending', message: '' };
          return (
            <div key={a.key} style={S.card(ag.status)}>
              <div style={S.cardTop}>
                <span style={S.icon}>{a.icon}</span>
                <span style={S.name}>{a.label}</span>
                <span style={S.badge(ag.status)}>
                  {ag.status === 'running' ? 'LIVE' : ag.status === 'completed' ? 'DONE' : ag.status === 'error' ? 'ERR' : 'WAIT'}
                </span>
              </div>
              <div style={S.msg}>
                {ag.status === 'running' && <div style={S.spinner} />}
                <span>{ag.message || a.desc}</span>
              </div>
            </div>
          );
        })}
      </div>

      {!error && (
        <button style={S.cancelBtn}
          onClick={() => { clearAll(); navigate('/'); }}
          onMouseOver={e => e.target.style.borderColor = 'var(--red)'}
          onMouseOut={e  => e.target.style.borderColor = 'var(--border2)'}>
          Cancel
        </button>
      )}
    </div>
  );
}
