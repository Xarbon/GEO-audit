// 匿名分析事件：PV / 检测点击 / 报告下载 / 停留时长
import { supabaseAdmin } from '@/lib/geo';

export async function POST(req: Request) {
  try {
    const { type, url, dwell_ms } = await req.json();
    if (!type) return Response.json({ error: 'type required' }, { status: 400 });
    const { error } = await supabaseAdmin()
      .from('analytics_events')
      .insert({ type, url: url || null, dwell_ms: typeof dwell_ms === 'number' ? dwell_ms : null });
    if (error) {
      console.error('track insert error:', error.message);
      return Response.json({ ok: false, error: error.message });
    }
    return Response.json({ ok: true });
  } catch (e) {
    // 分析表未建或写入失败，绝不阻断用户检测体验
    console.error('track failed:', e);
    return Response.json({ ok: false });
  }
}
