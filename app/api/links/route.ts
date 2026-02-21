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
    const key = `links:${url}`;
    const cached = getCache<any>(key);
    if (cached) return NextResponse.json(cached);

    const res = await fetchTextWithLimits(url);
    const base = new URL(res.finalUrl);
    const $ = cheerio.load(res.bodyText);

    const internal = new Set<string>();
    const external = new Set<string>();

    $("a[href]").each((_, el) => {
      const href = $(el).attr("href")?.trim();
      if (!href) return;
      if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return;

      try {
        const abs = new URL(href, base).toString();
        const u = new URL(abs);
        if (u.hostname === base.hostname) internal.add(abs);
        else external.add(abs);
      } catch {}
    });

    const body = {
      ok: true,
      url: res.finalUrl,
      internalCount: internal.size,
      externalCount: external.size,
      sampleInternal: Array.from(internal).slice(0, 20),
      sampleExternal: Array.from(external).slice(0, 20),
    };

    setCache(key, body, 10 * 60_000);
    return NextResponse.json(body);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 400 });
  }
}
