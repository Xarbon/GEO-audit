'use client';
import { useEffect, useRef, useState } from 'react';

const WARM = '#F15A29';
const GOOD = '#0EA66B';
const BLUE = '#2D6CDF';

export default function Home() {
  const [url, setUrl] = useState('');
  const [market, setMarket] = useState('欧美');
  const [res, setRes] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const mountRef = useRef(Date.now());
  const dwellSent = useRef(false);

  // 页面访问 PV + 离场时上报停留时长
  useEffect(() => {
    fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'pv' }) }).catch(() => {});
    const sendDwell = () => {
      if (dwellSent.current) return;
      dwellSent.current = true;
      const ms = Date.now() - mountRef.current;
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/track', new Blob([JSON.stringify({ type: 'dwell', dwell_ms: ms })], { type: 'application/json' }));
      }
    };
    window.addEventListener('beforeunload', sendDwell);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') sendDwell(); });
    return () => window.removeEventListener('beforeunload', sendDwell);
  }, []);

  async function detect() {
    if (!/^https?:\/\/[^\s/]+\.[^\s/]+/.test(url)) { setMsg('请输入完整网址，例如 https://yourstore.com'); return; }
    setMsg(''); setLoading(true);
    fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'detect', url }) }).catch(() => {});
    try {
      const r = await fetch('/api/audit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, market }),
      });
      const data = await r.json();
      if (!r.ok) { setMsg('检测失败：' + (data.error || r.status)); setLoading(false); return; }
      setRes(data);
    } catch { setMsg('检测失败：网络错误'); }
    finally { setLoading(false); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }
  }

  function downloadReport() {
    if (!res) return;
    fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'download', url: res.url }) }).catch(() => {});
    const html = buildReportHtml(res);
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `geo-report-${(() => { try { return new URL(res.url).hostname.replace(/^www\./, ''); } catch { return 'site'; } })()}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: '48px 20px 80px' }}>
      <h1 style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.25 }}>当买家问 AI，<br />你的店在答案里吗？</h1>
      <p style={{ color: '#64748B', fontSize: 16, marginTop: 14 }}>68% 的购物决策先在 ChatGPT 里发生。免费测出你的站点能否被 AI 读懂、推荐，并下载整改报告。</p>

      <div style={{ display: 'flex', gap: 8, marginTop: 28, maxWidth: 640, flexWrap: 'wrap' }}>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://你的店铺.com"
          style={{ flex: 1, minWidth: 240, padding: '13px 18px', borderRadius: 999, border: '1px solid #E7E7E4', fontSize: 14 }} />
        <select value={market} onChange={(e) => setMarket(e.target.value)}
          style={{ padding: '13px 14px', borderRadius: 999, border: '1px solid #E7E7E4', fontSize: 14, background: '#fff' }}>
          <option value="欧美">欧美市场</option>
          <option value="日本">日本市场</option>
          <option value="东南亚">东南亚市场</option>
          <option value="其他">其他</option>
        </select>
        <button onClick={detect} disabled={loading}
          style={{ background: GOOD, color: '#fff', border: 0, borderRadius: 999, padding: '13px 28px', fontWeight: 700, fontSize: 15, opacity: loading ? 0.6 : 1 }}>
          {loading ? '检测中…' : '免费检测'}
        </button>
      </div>
      {msg && <p style={{ color: WARM, fontSize: 13, marginTop: 10 }}>{msg}</p>}

      {res && (
        <section style={{ marginTop: 36, border: '1px solid #E7E7E4', borderRadius: 20, background: '#fff', padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <div style={{ fontSize: 56, fontWeight: 800, color: scoreColor(res.total) }}>{res.total}</div>
            <div>
              <div style={{ fontSize: 14, color: '#64748B' }}>GEO 综合得分 / 100</div>
              <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 2 }}>{res.url} · {res.market}市场</div>
            </div>
          </div>

          <div style={{ marginTop: 22 }}>
            {res.dims.map((d: any) => (
              <div key={d.key} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                  <span style={{ fontWeight: 600 }}>{d.label}</span>
                  <span style={{ fontWeight: 700, color: scoreColor(d.score) }}>{d.score}</span>
                </div>
                <div style={{ height: 9, background: '#F1F5F9', borderRadius: 999, marginTop: 5, overflow: 'hidden' }}>
                  <div style={{ width: d.score + '%', height: '100%', background: scoreColor(d.score), borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>

          {res.gaps.length > 0 && (
            <div style={{ marginTop: 22, background: '#FFF7F3', border: '1px solid #FFD9C7', borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: WARM, marginBottom: 10 }}>优先整改项（{res.gaps.length}）</div>
              {res.gaps.map((g: any, i: number) => (
                <div key={i} style={{ fontSize: 13, marginBottom: 10, lineHeight: 1.6 }}>
                  <b>{g.label}</b>：{g.issue}<br />
                  <span style={{ color: GOOD }}>→ {g.fix}</span>
                </div>
              ))}
            </div>
          )}

          <button onClick={downloadReport}
            style={{ marginTop: 22, width: '100%', background: BLUE, color: '#fff', border: 0, borderRadius: 999, padding: '14px 0', fontWeight: 700, fontSize: 15 }}>
            下载完整报告（HTML）
          </button>
        </section>
      )}

      <footer style={{ marginTop: 48, fontSize: 12, color: '#94A3B8', textAlign: 'center' }}>
        检测为免费需求验证版 · 报告可自由下载 · <a href="/stats" style={{ color: BLUE }}>查看统计漏斗</a>
      </footer>
    </main>
  );
}

function scoreColor(s: number): string {
  if (s >= 75) return GOOD;
  if (s >= 55) return '#D97706';
  return WARM;
}

// 生成自包含 HTML 报告（可离线打开 / 打印为 PDF）
function buildReportHtml(r: any): string {
  const dims = (r.dims || []).map((d: any) => `
    <div style="margin:14px 0">
      <div style="display:flex;justify-content:space-between;font-size:14px"><b>${d.label}</b><span style="font-weight:700">${d.score}</span></div>
      <div style="height:10px;background:#eef2f7;border-radius:99px;margin-top:6px;overflow:hidden">
        <div style="width:${d.score}%;height:100%;background:${d.score >= 75 ? '#0EA66B' : d.score >= 55 ? '#D97706' : '#F15A29'};border-radius:99px"></div>
      </div>
    </div>`).join('');
  const gaps = (r.gaps || []).map((g: any) => `<li style="margin:10px 0"><b>${g.label}</b>：${g.issue}<br><span style="color:#0EA66B">→ ${g.fix}</span></li>`).join('');
  const sig = r.signals || {};
  return `<!doctype html><html lang="zh"><head><meta charset="utf-8"><title>GEO 检测报告 - ${r.url}</title>
<style>body{font-family:-apple-system,'Segoe UI',Roboto,'PingFang SC','Microsoft YaHei',sans-serif;max-width:720px;margin:40px auto;padding:0 20px;color:#1f2937}</style></head>
<body>
  <h1 style="font-size:26px">GEO 生成式引擎优化检测报告</h1>
  <p style="color:#64748b">${r.url} · ${r.market}市场 · 生成时间 ${new Date().toLocaleString('zh-CN')}</p>
  <div style="font-size:60px;font-weight:800;color:${r.total >= 75 ? '#0EA66B' : r.total >= 55 ? '#D97706' : '#F15A29'}">${r.total}<span style="font-size:20px;color:#94a3b8"> / 100</span></div>
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
