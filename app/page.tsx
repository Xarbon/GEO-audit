'use client';
import { useEffect, useRef, useState } from 'react';

const ACCENT = '#22D3EE';
const GOOD = '#10B981';
const WARM = '#F97316';

const MARKETS = [
  { value: '欧美', label: '欧美市场' },
  { value: '日本', label: '日本市场' },
  { value: '东南亚', label: '东南亚市场' },
  { value: '其他', label: '其他' },
];

export default function Home() {
  const [url, setUrl] = useState('');
  const [market, setMarket] = useState('欧美');
  const [res, setRes] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [selectOpen, setSelectOpen] = useState(false);

  const mountRef = useRef(Date.now());
  const dwellSent = useRef(false);

  useEffect(() => {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'pv' }),
    }).catch(() => {});
    const sendDwell = () => {
      if (dwellSent.current) return;
      dwellSent.current = true;
      const ms = Date.now() - mountRef.current;
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          '/api/track',
          new Blob([JSON.stringify({ type: 'dwell', dwell_ms: ms })], { type: 'application/json' })
        );
      }
    };
    window.addEventListener('beforeunload', sendDwell);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') sendDwell();
    });
    return () => window.removeEventListener('beforeunload', sendDwell);
  }, []);

  async function detect() {
    if (!/^https?:\/\/[^\s/]+\.[^\s/]+/.test(url)) {
      setMsg('请输入完整网址，例如 https://yourstore.com');
      return;
    }
    setMsg('');
    setLoading(true);
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'detect', url }),
    }).catch(() => {});
    try {
      const r = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, market }),
      });
      const data = await r.json();
      if (!r.ok) {
        setMsg('检测失败：' + (data.error || r.status));
        setLoading(false);
        return;
      }
      setRes(data);
    } catch {
      setMsg('检测失败：网络错误');
    } finally {
      setLoading(false);
      setTimeout(() => {
        document.getElementById('result')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }

  function downloadReport() {
    if (!res) return;
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'download', url: res.url }),
    }).catch(() => {});
    const html = buildReportHtml(res);
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `geo-report-${(() => {
      try {
        return new URL(res.url).hostname.replace(/^www\./, '');
      } catch {
        return 'site';
      }
    })()}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <main style={{ minHeight: '100vh', background: '#070A12', color: '#F8FAFC' }}>
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 40px rgba(34, 211, 238, 0.15); }
          50% { box-shadow: 0 0 80px rgba(34, 211, 238, 0.35); }
        }
        @keyframes spin-slow {
          from { transform: rotateX(60deg) rotateZ(0deg); }
          to { transform: rotateX(60deg) rotateZ(360deg); }
        }
        @keyframes spin-reverse {
          from { transform: rotateX(-30deg) rotateY(0deg) rotateZ(0deg); }
          to { transform: rotateX(-30deg) rotateY(0deg) rotateZ(-360deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes orbit {
          from { transform: rotateY(0deg) translateX(110px) rotateY(0deg); }
          to { transform: rotateY(360deg) translateX(110px) rotateY(-360deg); }
        }
        .ring-1 { animation: spin-slow 12s linear infinite; }
        .ring-2 { animation: spin-reverse 18s linear infinite; }
        .core { animation: pulse-glow 4s ease-in-out infinite; }
        .scanner { animation: scan 3s ease-in-out infinite; }
        .node { animation: orbit 8s linear infinite; }
        .node:nth-child(2) { animation-delay: -1s; }
        .node:nth-child(3) { animation-delay: -2s; }
        .node:nth-child(4) { animation-delay: -3s; }
        .node:nth-child(5) { animation-delay: -4s; }
        .node:nth-child(6) { animation-delay: -5s; }
        .node:nth-child(7) { animation-delay: -6s; }
        @media (max-width: 768px) {
          .hero-grid { flex-direction: column !important; }
          .hero-visual { height: 320px !important; margin-top: 40px; }
        }
      `}</style>

      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '80px 24px 100px',
        }}
      >
        <div className="hero-grid" style={{ display: 'flex', gap: 60, alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                borderRadius: 999,
                border: '1px solid rgba(34, 211, 238, 0.25)',
                background: 'rgba(34, 211, 238, 0.06)',
                color: ACCENT,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: 0.5,
                marginBottom: 28,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT }} />
              GEO 生成式引擎优化检测
            </div>

            <h1
              style={{
                fontSize: 'clamp(36px, 5vw, 56px)',
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
                margin: 0,
              }}
            >
              当买家问 AI，
              <br />
              <span style={{ color: ACCENT }}>你的店</span>在答案里吗？
            </h1>

            <p
              style={{
                color: '#94A3B8',
                fontSize: 17,
                lineHeight: 1.7,
                marginTop: 22,
                maxWidth: 520,
              }}
            >
              68% 的购物决策先在 ChatGPT 里发生。免费测出你的站点能否被 AI 读懂、推荐，并下载完整整改报告。
            </p>

            <div
              style={{
                marginTop: 36,
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
                alignItems: 'stretch',
              }}
            >
              <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://你的店铺.com"
                  onKeyDown={(e) => e.key === 'Enter' && detect()}
                  style={{
                    width: '100%',
                    height: 52,
                    padding: '0 20px',
                    borderRadius: 14,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.04)',
                    color: '#F8FAFC',
                    fontSize: 15,
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(34, 211, 238, 0.5)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
              </div>

              <CustomSelect value={market} onChange={setMarket} />

              <button
                onClick={detect}
                disabled={loading}
                style={{
                  height: 52,
                  padding: '0 32px',
                  borderRadius: 14,
                  border: 0,
                  background: ACCENT,
                  color: '#070A12',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  transition: 'transform 0.15s, box-shadow 0.2s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(34,211,238,0.35)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {loading ? '检测中…' : '免费检测'}
              </button>
            </div>

            {msg && (
              <p style={{ color: WARM, fontSize: 13, marginTop: 12 }}>{msg}</p>
            )}
          </div>

          <div className="hero-visual" style={{ flex: 1, minWidth: 320, height: 480, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Interactive3DCard />
          </div>
        </div>

        {res && (
          <section
            id="result"
            style={{
              marginTop: 80,
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 24,
              background: 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(20px)',
              padding: '36px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 72, fontWeight: 800, color: scoreColor(res.total) }}>{res.total}</div>
              <div>
                <div style={{ fontSize: 15, color: '#94A3B8' }}>GEO 综合得分 / 100</div>
                <div style={{ fontSize: 14, color: '#64748B', marginTop: 4 }}>
                  {res.url} · {res.market}市场
                </div>
              </div>
            </div>

            <div style={{ marginTop: 32, display: 'grid', gap: 14 }}>
              {res.dims.map((d: any) => (
                <div key={d.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8 }}>
                    <span style={{ fontWeight: 500 }}>{d.label}</span>
                    <span style={{ fontWeight: 700, color: scoreColor(d.score) }}>{d.score}</span>
                  </div>
                  <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: d.score + '%',
                        height: '100%',
                        background: scoreColor(d.score),
                        borderRadius: 999,
                        transition: 'width 0.8s ease-out',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {res.gaps.length > 0 && (
              <div
                style={{
                  marginTop: 32,
                  background: 'rgba(249, 115, 22, 0.08)',
                  border: '1px solid rgba(249, 115, 22, 0.2)',
                  borderRadius: 18,
                  padding: 24,
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 700, color: WARM, marginBottom: 14 }}>
                  优先整改项（{res.gaps.length}）
                </div>
                {res.gaps.map((g: any, i: number) => (
                  <div key={i} style={{ fontSize: 14, marginBottom: 14, lineHeight: 1.7 }}>
                    <b>{g.label}</b>：{g.issue}
                    <br />
                    <span style={{ color: GOOD }}>→ {g.fix}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={downloadReport}
              style={{
                marginTop: 32,
                width: '100%',
                padding: '16px 0',
                borderRadius: 14,
                border: 0,
                background: 'linear-gradient(90deg, #22D3EE 0%, #0EA66B 100%)',
                color: '#070A12',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              下载完整报告（HTML）
            </button>
          </section>
        )}

        <footer style={{ marginTop: 80, fontSize: 12, color: '#475569', textAlign: 'center' }}>
          GEO 检测需求验证版 · 报告可自由下载
        </footer>
      </div>
    </main>
  );
}

function CustomSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = MARKETS.find((m) => m.value === value);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          height: 52,
          padding: '0 18px',
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(255,255,255,0.04)',
          color: '#F8FAFC',
          fontSize: 14,
          fontWeight: 500,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 28,
          minWidth: 140,
          justifyContent: 'space-between',
        }}
      >
        {selected?.label}
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M1 1L5 5L9 1" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            background: '#0F1623',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 14,
            overflow: 'hidden',
            zIndex: 50,
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          }}
        >
          {MARKETS.map((m) => (
            <div
              key={m.value}
              onClick={() => {
                onChange(m.value);
                setOpen(false);
              }}
              style={{
                padding: '12px 18px',
                fontSize: 14,
                cursor: 'pointer',
                color: value === m.value ? ACCENT : '#CBD5E1',
                background: value === m.value ? 'rgba(34, 211, 238, 0.08)' : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (value !== m.value) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              }}
              onMouseLeave={(e) => {
                if (value !== m.value) e.currentTarget.style.background = 'transparent';
              }}
            >
              {m.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Interactive3DCard() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    const y = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    setRotate({ x: x * -12, y: y * 12 });
  }

  function reset() {
    setRotate({ x: 0, y: 0 });
    setHovering(false);
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={reset}
      style={{
        width: '100%',
        maxWidth: 420,
        aspectRatio: '1 / 1',
        borderRadius: 28,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
        transition: hovering ? 'transform 0.1s ease-out' : 'transform 0.5s ease-out',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 50%, rgba(34,211,238,0.12), transparent 60%)',
        }}
      />

      <div
        className="core"
        style={{
          width: 90,
          height: 90,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, #67E8F9, #0891B2)',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: -8,
            borderRadius: '50%',
            border: '1px solid rgba(34,211,238,0.4)',
          }}
        />
      </div>

      <div
        className="ring-1"
        style={{
          position: 'absolute',
          width: 220,
          height: 220,
          borderRadius: '50%',
          border: '1px solid rgba(34,211,238,0.25)',
          transformStyle: 'preserve-3d',
        }}
      />
      <div
        className="ring-2"
        style={{
          position: 'absolute',
          width: 280,
          height: 280,
          borderRadius: '50%',
          border: '1px dashed rgba(34,211,238,0.18)',
          transformStyle: 'preserve-3d',
        }}
      />

      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="node"
          style={{
            position: 'absolute',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: i % 2 === 0 ? ACCENT : GOOD,
            boxShadow: `0 0 12px ${i % 2 === 0 ? ACCENT : GOOD}`,
            transformStyle: 'preserve-3d',
            animationDelay: `${-i}s`,
          }}
        />
      ))}

      <div
        className="scanner"
        style={{
          position: 'absolute',
          left: '10%',
          right: '10%',
          height: 2,
          background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.6), transparent)',
          borderRadius: 999,
        }}
      />

      <div
        style={{
          position: 'absolute',
          bottom: 28,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 12,
          color: 'rgba(148, 163, 184, 0.8)',
          letterSpacing: 1,
        }}
      >
        AI 引擎正在扫描站点信号…
      </div>
    </div>
  );
}

function scoreColor(s: number): string {
  if (s >= 75) return GOOD;
  if (s >= 55) return '#FACC15';
  return WARM;
}

function buildReportHtml(r: any): string {
  const dims = (r.dims || [])
    .map(
      (d: any) => `
    <div style="margin:14px 0">
      <div style="display:flex;justify-content:space-between;font-size:14px"><b>${d.label}</b><span style="font-weight:700">${d.score}</span></div>
      <div style="height:10px;background:#eef2f7;border-radius:99px;margin-top:6px;overflow:hidden">
        <div style="width:${d.score}%;height:100%;background:${d.score >= 75 ? '#10B981' : d.score >= 55 ? '#FACC15' : '#F97316'};border-radius:99px"></div>
      </div>
    </div>`
    )
    .join('');
  const gaps = (r.gaps || [])
    .map((g: any) => `<li style="margin:10px 0"><b>${g.label}</b>：${g.issue}<br><span style="color:#10B981">→ ${g.fix}</span></li>`)
    .join('');
  const sig = r.signals || {};
  return `<!doctype html><html lang="zh"><head><meta charset="utf-8"><title>GEO 检测报告 - ${r.url}</title>
<style>body{font-family:-apple-system,'Segoe UI',Roboto,'PingFang SC','Microsoft YaHei',sans-serif;max-width:720px;margin:40px auto;padding:0 20px;color:#1f2937}</style></head>
<body>
  <h1 style="font-size:26px">GEO 生成式引擎优化检测报告</h1>
  <p style="color:#64748b">${r.url} · ${r.market}市场 · 生成时间 ${new Date().toLocaleString('zh-CN')}</p>
  <div style="font-size:60px;font-weight:800;color:${r.total >= 75 ? '#10B981' : r.total >= 55 ? '#FACC15' : '#F97316'}">${r.total}<span style="font-size:20px;color:#94a3b8"> / 100</span></div>
  <h2 style="font-size:18px;margin-top:24px">七维评分</h2>
  ${dims}
  <h2 style="font-size:18px;margin-top:28px">优先整改项</h2>
  <ul style="font-size:14px;line-height:1.7">${gaps || '<li>暂无重大缺口，表现良好。</li>'}</ul>
  <h2 style="font-size:18px;margin-top:28px">检测到的信号</h2>
  <ul style="font-size:14px;line-height:1.7">
    <li>JSON-LD 结构化数据：${sig.hasJsonLd ? '✅ 已发现' : '❌ 缺失'}</li>
    <li>llms.txt：${sig.hasLlms ? '✅ 已发现' : '❌ 缺失'}</li>
    <li>AI 爬虫可爬性：${sig.aiCrawlable === true ? '✅ 允许' : sig.aiCrawlable === false ? '❌ 被 robots.txt 限制' : '⚠️ 未检测到明确规则'}</li>
    <li>robots.txt：${sig.hasRobots ? '✅ 存在' : '❌ 缺失'} · sitemap：${sig.hasSitemap ? '✅ 存在' : '❌ 缺失'}</li>
  </ul>
  <hr style="margin-top:36px;border:none;border-top:1px solid #eee">
  <p style="font-size:12px;color:#94a3b8">本报告由 GEO 检测需求验证版生成，评分为信号驱动的快速估算，供优化参考。</p>
</body></html>`;
}
