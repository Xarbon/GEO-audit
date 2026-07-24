// 冒烟测试：验证 A/B/C 三组配置已真实可用（Supabase 连通 + 表是否存在、DeepSeek key 是否有效）
// 用法（在 frontend 目录）：node --env-file=.env.local scripts/smoke.mjs
import { createClient } from '@supabase/supabase-js';

// ---- B. Supabase 连通 + schema 检查 ----
try {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { data, error } = await sb.from('audits').select('count', { count: 'exact', head: true });
  if (error) {
    console.log('SUPABASE: 连通 OK，但 audits 表不存在或不可读 →', error.message);
    console.log('          （需在 Supabase 后台 SQL Editor 执行 migrations/0001_init.sql，或用 supabase db push）');
  } else {
    console.log('SUPABASE: 连通 OK，audits 表存在，当前行数 =', data);
  }
} catch (e) {
  console.log('SUPABASE: 连接失败 →', e.message);
}

// ---- C. DeepSeek key 校验 ----
try {
  const r = await fetch(`${process.env.DEEPSEEK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL,
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 5,
    }),
  });
  const j = await r.json().catch(() => ({}));
  console.log('DEEPSEEK: status', r.status, r.ok ? 'OK（key 有效）' : 'FAIL → ' + JSON.stringify(j).slice(0, 200));
} catch (e) {
  console.log('DEEPSEEK: 请求失败 →', e.message);
}
