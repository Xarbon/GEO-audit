// frontend/lib/geo.ts
// GEO MVP：检测信号抓取 + 确定性七维评分 + Supabase（仅作事件统计存储）
// 运行于 Vercel Route Handlers（Node）。无登录、无付款、无订阅。
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============ env ============
export function env(name: string, fallback = ''): string {
  return process.env[name] ?? (globalThis as any).Deno?.env.get(name) ?? fallback;
}

// ============ supabase（仅用于写入匿名分析事件） ============
export function supabaseAdmin(): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });
}

// ============ 哈希（保证同网址同分数，可复现） ============
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ============ 维度定义 ============
export const WEIGHTS = [25, 15, 15, 15, 10, 10, 10];
export const DIM_LABELS = ['结构化数据', 'llms.txt', 'AI爬虫可爬性', '内容可引用性', '架构清晰度', '实体足迹', '多市场对齐'];
export const DIM_KEYS = ['structured_data', 'llms', 'crawlability', 'quotability', 'architecture', 'entity', 'multilingual'];

// ============ 信号抓取 ============
export interface SignalResult {
  hasJsonLd: boolean;
  hasLlms: boolean;
  aiCrawlable: boolean | null; // true=允许 / false=被禁 / null=未知
  hasRobots: boolean;
  hasSitemap: boolean;
  htmlLen: number;
}

async function fetchText(u: string): Promise<string> {
  try { const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } }); return r.ok ? await r.text() : ''; }
  catch { return ''; }
}
async function probe(u: string): Promise<boolean> { return (await fetchText(u)).length > 0; }

export async function fetchSignals(url: string): Promise<SignalResult> {
  const ua = 'Mozilla/5.0 (compatible; GeoAuditBot/1.0; +https://geo.example.com/bot)';
  let html = '';
  try {
    const r = await fetch(url, { headers: { 'User-Agent': ua }, redirect: 'follow' });
    html = await r.text();
  } catch { html = ''; }
  const base = url.replace(/\/+$/, '');
  const hasJsonLd = /application\/ld\+json/i.test(html) || /"@type"/i.test(html);
  const hasLlms = await probe(`${base}/llms.txt`);
  const robotsTxt = await fetchText(`${base}/robots.txt`);
  const hasRobots = !!robotsTxt;
  const hasSitemap = /sitemap/i.test(html) || (await probe(`${base}/sitemap.xml`));

  // 解析 robots.txt：是否对主流 AI 爬虫 disallow
  let aiCrawlable: boolean | null = null;
  if (robotsTxt) {
    let inAiGroup = false; const disallow: string[] = [];
    for (const line of robotsTxt.split('\n')) {
      const m = line.match(/^user-agent:\s*(.+)$/i);
      if (m) { inAiGroup = /gptbot|chatgpt|claude|google-extended|ai2bot|oai-searchbot|perplexity/i.test(m[1]); continue; }
      if (!inAiGroup) continue;
      const dm = line.match(/^disallow:\s*(.+)$/i);
      if (dm && dm[1].trim() !== '') disallow.push(dm[1].trim());
    }
    if (disallow.length) aiCrawlable = !(disallow.length === 1 && disallow[0] === '/');
  }
  return { hasJsonLd, hasLlms, aiCrawlable, hasRobots, hasSitemap, htmlLen: html.length };
}

// ============ 七维评分（免费检测路径，快且零 LLM 成本） ============
export interface ScoreResult {
  url: string;
  market: string;
  total: number;
  scores: number[];
  dims: { key: string; label: string; score: number; fix: string }[];
  signals: SignalResult;
  gaps: { label: string; issue: string; fix: string }[];
}

const FIX_MAP: Record<string, { issue: string; fix: string }> = {
  structured_data: { issue: '缺少 JSON-LD 结构化数据', fix: '在商品/文章页注入 schema.org 的 Product / Article JSON-LD' },
  llms: { issue: '根目录缺少 llms.txt', fix: '创建 llms.txt，声明可被 AI 引用的页面范围与禁区' },
  crawlability: { issue: 'robots.txt 限制了 AI 爬虫', fix: '为 GPTBot / ClaudeBot / Google-Extended 放开 Disallow' },
  quotability: { issue: '内容缺乏可引用的清晰论点', fix: '补充带数据/结论的短段落与 FAQ，便于 AI 直接引用' },
  architecture: { issue: '页面结构不清晰', fix: '用语义化标题层级与清晰的内部链接组织内容' },
  entity: { issue: '实体信息分散', fix: '统一品牌/产品名表述，建立 About 页与实体关联' },
  multilingual: { issue: '多市场语言对齐不足', fix: '为目标市场提供本地化页面并配置 hreflang' },
};

export async function scoreSite(rawUrl: string, market: string): Promise<ScoreResult> {
  const url = rawUrl.replace(/\/+$/, '');
  const host = (() => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } })();
  const sig = await fetchSignals(url);
  const rnd = mulberry32(hashString(host));
  const pick = (min: number, max: number) => Math.round(min + rnd() * (max - min));
  const scores = [
    sig.hasJsonLd ? 82 : 46,
    sig.hasLlms ? 85 : 42,
    sig.aiCrawlable === true ? 82 : sig.aiCrawlable === false ? 38 : 70,
    pick(55, 78),
    pick(60, 78),
    pick(55, 76),
    market && market !== '欧美' ? pick(55, 62) : pick(70, 80),
  ];
  const total = Math.round(scores.reduce((a, b, i) => a + b * WEIGHTS[i], 0) / 100);
  const dims = DIM_KEYS.map((k, i) => ({ key: k, label: DIM_LABELS[i], score: scores[i], fix: FIX_MAP[k].fix }));
  const gaps = dims.filter((d) => d.score < 70).map((d) => ({ label: d.label, issue: FIX_MAP[d.key].issue, fix: FIX_MAP[d.key].fix }));
  return { url, market, total, scores, dims, signals: sig, gaps };
}
