import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, requireUrlParam } from "@/lib/apiGuards";
import { fetchTextWithLimits } from "@/lib/fetchWithLimit";
import { checkCors } from "@/lib/corsCheck";
import { getCache, setCache } from "@/lib/cache";

export async function GET(req: NextRequest) {
    const rl = enforceRateLimit(req);
    if (rl) return NextResponse.json(rl.body, { status: rl.status, headers: rl.headers });

    try {
        const { url } = requireUrlParam(req);
        const key = `cors:${url}`;
        const cached = getCache<any>(key);
        if (cached) return NextResponse.json(cached);

        const res = await fetchTextWithLimits(url);
        const headersObj: Record<string, string> = {};
        res.headers.forEach((v, k) => (headersObj[k.toLowerCase()] = v));

        const corsResult = checkCors(headersObj);
        const { ok: _ok, ...corsData } = corsResult;

        const body = {
            ok: true,
            url: res.finalUrl,
            status: res.status,
            ...corsData,
        };

        setCache(key, body, 10 * 60_000);
        return NextResponse.json(body);
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 400 });
    }
}
