import { scoreSite } from '@/lib/geo';

export async function POST(req: Request) {
  try {
    const { url, market } = await req.json();
    if (!/^https?:\/\/[^\s/]+\.[^\s/]+/.test(url || '')) {
      return Response.json({ error: 'invalid_url' }, { status: 400 });
    }
    const res = await scoreSite(url, market || '欧美');
    return Response.json(res);
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
