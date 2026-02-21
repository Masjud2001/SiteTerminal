import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, requireUrlParam } from "@/lib/apiGuards";
import { fetchTextWithLimits } from "@/lib/fetchWithLimit";
import { getCache, setCache } from "@/lib/cache";

function extractSitemaps(robots: string): string[] {
  const lines = robots.split(/\r?\n/);
  const s: string[] = [];
  for (const ln of lines) {
    const m = ln.match(/^\s*sitemap\s*:\s*(.+)\s*$/i);
    if (m?.[1]) s.push(m[1].trim());
  }
  return Array.from(new Set(s));
}

export async function GET(req: NextRequest) {
  const rl = enforceRateLimit(req);
  if (rl) return NextResponse.json(rl.body, { status: rl.status, headers: rl.headers });

  try {
    const { url } = requireUrlParam(req);
    const key = `robots:${url}`;
    const cached = getCache<any>(key);
    if (cached) return NextResponse.json(cached);

    const u = new URL(url);
    const robotsUrl = new URL("/robots.txt", u).toString();

    let found = false;
    let content: string | null = null;
    let sitemaps: string[] = [];

    try {
      const r = await fetchTextWithLimits(robotsUrl);
      if (r.status >= 200 && r.status < 300) {
        found = true;
        content = r.bodyText;
        sitemaps = extractSitemaps(r.bodyText);
      }
    } catch {}

    const body = { ok: true, url, robotsUrl, found, content, sitemaps };
    setCache(key, body, 10 * 60_000);
    return NextResponse.json(body);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 400 });
  }
}
