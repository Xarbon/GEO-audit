// 统计聚合：供 /stats 页读取漏斗数据
import { supabaseAdmin, env } from '@/lib/geo';

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get('key');
  const sk = env('STATS_KEY');
  if (sk && key !== sk) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const sb = supabaseAdmin();
  const { data, error } = await sb.from('analytics_events').select('type, dwell_ms');
  if (error) {
    // 最常见：analytics_events 表未建（请执行 supabase/migrations/0002_analytics.sql）
    return Response.json({ error: 'analytics_table_not_ready', hint: '在 Supabase SQL Editor 执行 supabase/migrations/0002_analytics.sql 建表' });
  }

  const counts: Record<string, number> = {};
  let dwellSum = 0, dwellN = 0;
  for (const r of data || []) {
    counts[r.type] = (counts[r.type] || 0) + 1;
    if (r.type === 'dwell' && r.dwell_ms) { dwellSum += r.dwell_ms; dwellN++; }
  }
  const detect = counts['detect'] || 0;
  const download = counts['download'] || 0;
  return Response.json({
    pv: counts['pv'] || 0,
    detect,
    download,
    avgDwellSec: dwellN ? Math.round(dwellSum / dwellN / 1000) : 0,
    detectRate: counts['pv'] ? Math.round((detect / counts['pv']) * 100) : 0,
    downloadRate: detect ? Math.round((download / detect) * 100) : 0,
    totalEvents: (data || []).length,
  });
}
