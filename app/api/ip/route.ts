import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, requireDomainParam } from "@/lib/apiGuards";
import { assertSafeHostname } from "@/lib/ssrfProtection";
import dns from "dns/promises";
import axios from "axios";

export async function GET(req: NextRequest) {
    const limitRes = enforceRateLimit(req);
    if (limitRes) return new NextResponse(JSON.stringify(limitRes.body), { status: limitRes.status, headers: limitRes.headers });

    try {
        const { domain } = requireDomainParam(req);
        await assertSafeHostname(domain);

        const lookup = await dns.lookup(domain);
        const ip = lookup.address;

        // Get IP Info from ip-api.com
        const ipInfoRes = await axios.get(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`);
        const ipInfo = ipInfoRes.data;

        return NextResponse.json({
            ok: true,
            domain,
            ip,
            info: ipInfo.status === "success" ? ipInfo : null
        });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
}
