import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, requireUrlParam } from "@/lib/apiGuards";
import { checkExposures } from "@/lib/exposuresCheck";
import { getCache, setCache } from "@/lib/cache";

export async function GET(req: NextRequest) {
    const rl = enforceRateLimit(req);
    if (rl) return NextResponse.json(rl.body, { status: rl.status, headers: rl.headers });

    try {
        const { url } = requireUrlParam(req);
        const key = `exposures:${url}`;
        const cached = getCache<any>(key);
        if (cached) return NextResponse.json(cached);

        const result = await checkExposures(url);

        const body = {
            ok: true,
            url,
            ...result,
        };

        // Shorter cache for exposures so re-checks are fresher
        setCache(key, body, 5 * 60_000);
        return NextResponse.json(body);
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 400 });
    }
}
