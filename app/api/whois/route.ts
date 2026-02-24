import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, requireDomainParam } from "@/lib/apiGuards";
import { assertSafeHostname } from "@/lib/ssrfProtection";
import { lookupWhois } from "@/lib/whoisUtils";

export async function GET(req: NextRequest) {
    const limitRes = enforceRateLimit(req);
    if (limitRes) return new NextResponse(JSON.stringify(limitRes.body), { status: limitRes.status, headers: limitRes.headers });

    try {
        const { domain } = requireDomainParam(req);
        await assertSafeHostname(domain);

        const data = await lookupWhois(domain);

        return NextResponse.json({
            ok: true,
            domain,
            ...data
        });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
}
