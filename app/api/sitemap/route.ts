import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, requireUrlParam } from "@/lib/apiGuards";
import { fetchTextWithLimits } from "@/lib/fetchWithLimit";
import { getCache, setCache } from "@/lib/cache";

function parseLocs(xml: string): string[] {
  return Array.from(xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)).map((m) => m[1].trim()).filter(Boolean);
}

export async function GET(req: NextRequest) {
  const rl = enforceRateLimit(req);
  if (rl) return NextResponse.json(rl.body, { status: rl.status, headers: rl.headers });

  try {
    const { url } = requireUrlParam(req);
    const key = `sitemap:${url}`;
    const cached = getCache<any>(key);
    if (cached) return NextResponse.json(cached);

    const u = new URL(url);

    const robotsUrl = new URL("/robots.txt", u).toString();
    let sitemapUrl: string | null = null;
    let discoveredFrom: "robots" | "common" | "none" = "none";

    try {
      const r = await fetchTextWithLimits(robotsUrl);
      if (r.status >= 200 && r.status < 300) {
        const candidates = parseLocs(r.bodyText);
        if (candidates.length) {
          sitemapUrl = candidates[0];
          discoveredFrom = "robots";
        }
      }
    } catch {}

    if (!sitemapUrl) {
      sitemapUrl = new URL("/sitemap.xml", u).toString();
      discoveredFrom = "common";
    }

    let urls: string[] = [];
    try {
      const s = await fetchTextWithLimits(sitemapUrl);
      if (s.status >= 200 && s.status < 300) {
        urls = parseLocs(s.bodyText).slice(0, 20);
      } else {
        sitemapUrl = null;
        discoveredFrom = "none";
      }
    } catch {
      sitemapUrl = null;
      discoveredFrom = "none";
    }

    const body = { ok: true, url, sitemapUrl, discoveredFrom, urls };
    setCache(key, body, 10 * 60_000);
    return NextResponse.json(body);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 400 });
  }
}
