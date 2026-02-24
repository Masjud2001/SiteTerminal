import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, requireUrlParam } from "@/lib/apiGuards";
import { fetchTextWithLimits } from "@/lib/fetchWithLimit";
import { detectTechnologies } from "@/lib/techFingerprint";
import { getCache, setCache } from "@/lib/cache";

export async function GET(req: NextRequest) {
    const rl = enforceRateLimit(req);
    if (rl) return NextResponse.json(rl.body, { status: rl.status, headers: rl.headers });

    try {
        let url = req.nextUrl.searchParams.get("url") || "";
        const domain = req.nextUrl.searchParams.get("domain") || "";

        if (!url && domain) {
            url = `https://${domain}`;
        }

        if (!url) throw new Error("URL or Domain required");

        const key = `tech:${url}`;
        const cached = getCache<any>(key);
        if (cached) return NextResponse.json(cached);

        const res = await fetchTextWithLimits(url);
        const headersObj: Record<string, string> = {};
        res.headers.forEach((v, k) => (headersObj[k.toLowerCase()] = v));

        const techs = detectTechnologies(res.bodyText, headersObj);
        const outdated = techs.filter((t) => t.outdated);

        const body = {
            ok: true,
            url: res.finalUrl,
            status: res.status,
            timingMs: res.timingMs,
            technologies: techs,
            outdatedCount: outdated.length,
            outdatedLibraries: outdated,
        };

        setCache(key, body, 10 * 60_000);
        return NextResponse.json(body);
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 400 });
    }
}
