import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, requireUrlParam } from "@/lib/apiGuards";
import { fetchTextWithLimits } from "@/lib/fetchWithLimit";
import { getCache, setCache } from "@/lib/cache";

export async function GET(req: NextRequest) {
  const rl = enforceRateLimit(req);
  if (rl) return NextResponse.json(rl.body, { status: rl.status, headers: rl.headers });

  try {
    const { url } = requireUrlParam(req);
    const key = `status:${url}`;
    const cached = getCache<any>(key);
    if (cached) return NextResponse.json(cached);

    const res = await fetchTextWithLimits(url);
    const body = {
      ok: true,
      inputUrl: url,
      finalUrl: res.finalUrl,
      status: res.status,
      redirects: res.redirects,
      timingMs: res.timingMs,
    };

    setCache(key, body, 10 * 60_000);
    return NextResponse.json(body);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 400 });
  }
}
