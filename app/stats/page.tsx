'use client';
import { useEffect, useState } from 'react';

export default function Stats() {
  const [s, setS] = useState<any>(null);
  const [err, setErr] = useState('');
  async function load() {
    setErr('');
    const r = await fetch('/api/stats');
    const d = await r.json();
    if (d?.error === 'analytics_table_not_ready') { setErr('统计表尚未创建：请在 Supabase SQL Editor 执行 supabase/migrations/0002_analytics.sql 建表'); return; }
    if (!r.ok) { setErr(d.error || '加载失败'); return; }
    setS(d);
  }
  useEffect(() => { load(); }, []);
  if (err) return <main style={{ maxWidth: 720, margin: '0 auto', padding: 40 }}><p style={{ color: '#F15A29' }}>{err}</p></main>;
  if (!s) return <main style={{ maxWidth: 720, margin: '0 auto', padding: 40 }}><p>加载中…</p></main>;

  const cards = [
    { label: '页面访问 PV', value: s.pv, sub: '独立打开次数' },
    { label: '检测点击', value: s.detect, sub: `点击率 ${s.detectRate}%` },
    { label: '报告下载', value: s.download, sub: `占检测 ${s.downloadRate}%` },
    { label: '平均停留', value: s.avgDwellSec + 's', sub: '页面停留时长' },
  ];
  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 26 }}>GEO 检测漏斗统计</h1>
        <button onClick={load} style={{ border: '1px solid #E7E7E4', background: '#fff', borderRadius: 999, padding: '8px 18px', fontWeight: 600 }}>刷新</button>
      </div>
      <p style={{ color: '#64748B', fontSize: 13, marginTop: 6 }}>验证「多少人会主动检测并下载报告」</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 14, marginTop: 20 }}>
        {cards.map((c) => (
          <div key={c.label} style={{ border: '1px solid #E7E7E4', borderRadius: 16, background: '#fff', padding: 18 }}>
            <div style={{ fontSize: 13, color: '#64748B' }}>{c.label}</div>
            <div style={{ fontSize: 32, fontWeight: 700, margin: '8px 0' }}>{c.value}</div>
            <div style={{ fontSize: 12, color: '#94A3B8' }}>{c.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 28, border: '1px solid #E7E7E4', borderRadius: 16, background: '#fff', padding: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>转化漏斗</div>
        <Funnel label="访问 PV" value={s.pv} max={s.pv} color="#2D6CDF" />
        <Funnel label="点击检测" value={s.detect} max={s.pv} color="#0EA66B" />
        <Funnel label="下载报告" value={s.download} max={s.pv} color="#F15A29" />
        <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 10 }}>下载率（下载/检测）：{s.downloadRate}%　·　检测率（检测/访问）：{s.detectRate}%</div>
      </div>
    </main>
  );
}

function Funnel({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
        <span>{label}</span><span style={{ fontWeight: 600 }}>{value}</span>
      </div>
      <div style={{ height: 10, background: '#F1F5F9', borderRadius: 999, marginTop: 4, overflow: 'hidden' }}>
        <div style={{ width: pct + '%', height: '100%', background: color, borderRadius: 999 }} />
      </div>
    </div>
  );
}
