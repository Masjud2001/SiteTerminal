import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, requireDomainParam } from "@/lib/apiGuards";
import { assertSafeHostname } from "@/lib/ssrfProtection";
import { lookupDns } from "@/lib/dnsUtils";
import axios from "axios";

export async function GET(req: NextRequest) {
    const limitRes = enforceRateLimit(req);
    if (limitRes) return new NextResponse(JSON.stringify(limitRes.body), { status: limitRes.status, headers: limitRes.headers });

    try {
        const { domain } = requireDomainParam(req);
        await assertSafeHostname(domain);

        // Run basic checks in parallel
        const [dnsData, httpData] = await Promise.allSettled([
            lookupDns(domain),
            axios.head(`https://${domain}`, { timeout: 5000 }).catch(() => axios.head(`http://${domain}`, { timeout: 5000 }))
        ]);

        const res: any = {
            ok: true,
            domain,
            timestamp: new Date().toISOString(),
            dns: dnsData.status === "fulfilled" ? dnsData.value : null,
            http: {
                reachable: httpData.status === "fulfilled",
                status: httpData.status === "fulfilled" ? (httpData.value as any).status : null,
                server: httpData.status === "fulfilled" ? (httpData.value as any).headers["server"] : null,
            }
        };

        return NextResponse.json(res);
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
}
