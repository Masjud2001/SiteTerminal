import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, requireUrlParam } from "@/lib/apiGuards";
import { fetchTextWithLimits } from "@/lib/fetchWithLimit";
import { gradeSecurityHeaders } from "@/lib/securityGrade";
import { detectTechnologies } from "@/lib/techFingerprint";
import { getCache, setCache } from "@/lib/cache";
import * as cheerio from "cheerio";

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

    const securityGrade = gradeSecurityHeaders(headersObj);
    const technologies = detectTechnologies(res.bodyText, headersObj);

    const $ = cheerio.load(res.bodyText);
    const title = $("title").first().text().trim() || null;
    const metaDescription = $('meta[name="description"]').attr("content")?.trim() || null;

    let linkCount = 0;
    $("a[href]").each(() => { linkCount++; });

    // Directory listing detection
    const dirListing = /Index of\/|Parent Directory|\[DIR\]/i.test(res.bodyText);

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
      dirListingDetected: dirListing,
      securityScore: securityGrade.score,
      securityGrade: securityGrade.grade,
      securityIssueCount: securityGrade.issues.length,
      technologies,
      outdatedLibraries: technologies.filter((t) => t.outdated),
    };

    setCache(key, body, 10 * 60_000);
    return NextResponse.json(body);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 400 });
  }
}
