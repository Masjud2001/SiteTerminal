import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, requireUrlParam } from "@/lib/apiGuards";
import { fetchTextWithLimits } from "@/lib/fetchWithLimit";
import { getCache, setCache } from "@/lib/cache";
import * as cheerio from "cheerio";

export async function GET(req: NextRequest) {
  const rl = enforceRateLimit(req);
  if (rl) return NextResponse.json(rl.body, { status: rl.status, headers: rl.headers });

  try {
    const { url } = requireUrlParam(req);
    const key = `seo:${url}`;
    const cached = getCache<any>(key);
    if (cached) return NextResponse.json(cached);

    const res = await fetchTextWithLimits(url);
    const $ = cheerio.load(res.bodyText);

    const title = $("title").first().text().trim() || null;
    const metaDescription = $('meta[name="description"]').attr("content")?.trim() || null;
    const canonical = $('link[rel="canonical"]').attr("href")?.trim() || null;

    const og: Record<string, string> = {};
    $('meta[property^="og:"]').each((_, el) => {
      const p = $(el).attr("property");
      const c = $(el).attr("content");
      if (p && c) og[p] = c;
    });

    const twitter: Record<string, string> = {};
    $('meta[name^="twitter:"]').each((_, el) => {
      const n = $(el).attr("name");
      const c = $(el).attr("content");
      if (n && c) twitter[n] = c;
    });

    const headings: Array<{ tag: string; text: string }> = [];
    $("h1, h2, h3").each((_, el) => {
      const tag = el.tagName.toLowerCase();
      const text = $(el).text().replace(/\s+/g, " ").trim();
      if (text) headings.push({ tag, text });
    });

    const body = { ok: true, url: res.finalUrl, title, metaDescription, canonical, og, twitter, headings };
    setCache(key, body, 10 * 60_000);
    return NextResponse.json(body);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 400 });
  }
}
