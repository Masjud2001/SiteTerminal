import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, requireUrlParam } from "@/lib/apiGuards";
import { fetchTextWithLimits } from "@/lib/fetchWithLimit";
import { auditSecurityHeaders } from "@/lib/securityHeadersAudit";
import { getCache, setCache } from "@/lib/cache";
import * as cheerio from "cheerio";

function techHints(html: string, headers: Record<string, string>): string[] {
  const hints = new Set<string>();

  const server = headers["server"];
  if (server) hints.add(`server:${server}`);

  const powered = headers["x-powered-by"];
  if (powered) hints.add(`powered:${powered}`);

  if (/wp-content|wp-includes/i.test(html)) hints.add("wordpress");
  if (/__NEXT_DATA__/i.test(html)) hints.add("nextjs");
  if (/cdn\.shopify\.com/i.test(html)) hints.add("shopify");

  return Array.from(hints).slice(0, 10);
}

export async function GET(req: NextRequest) {
  const rl = enforceRateLimit(req);
  if (rl) return NextResponse.json(rl.body, { status: rl.status, headers: rl.headers });

  try {
    const { url } = requireUrlParam(req);
    const key = `inspect:${url}`;
    const cached = getCache<any>(key);
    if (cached) return NextResponse.json(cached);

    const res = await fetchTextWithLimits(url);
    const headersObj: Record<string, string> = {};
    res.headers.forEach((v, k) => (headersObj[k.toLowerCase()] = v));

    const securityAudit = auditSecurityHeaders(headersObj);

    const $ = cheerio.load(res.bodyText);
    const title = $("title").first().text().trim() || null;
    const metaDescription = $('meta[name="description"]').attr("content")?.trim() || null;

    let linkCount = 0;
    $("a[href]").each(() => { linkCount++; });

    const body = {
      ok: true,
      inputUrl: url,
      finalUrl: res.finalUrl,
      status: res.status,
      redirects: res.redirects,
      timingMs: res.timingMs,
      title,
      metaDescription,
      linkCount,
      securityAudit,
      techHints: techHints(res.bodyText, headersObj),
    };

    setCache(key, body, 10 * 60_000);
    return NextResponse.json(body);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 400 });
  }
}
