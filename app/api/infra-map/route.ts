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

        // 1. IP and ASN/Org/Hosting Info
        const ipInfoRes = await axios.get(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,isp,org,as,query`);
        const ipInfo = ipInfoRes.data;

        // 2. Reverse IP (using HackerTarget or similar - note: might have rate limits)
        let reverseIp: string[] = [];
        try {
            const revRes = await axios.get(`https://api.hackertarget.com/reverseiplookup/?q=${ip}`, { timeout: 5000 });
            if (revRes.data && typeof revRes.data === 'string' && !revRes.data.includes("error")) {
                reverseIp = revRes.data.split('\n').filter(d => d.trim() !== "");
            }
        } catch (e) {
            console.error("Reverse IP error:", e);
        }

        // 3. CDN Detection (Basic)
        const cdnKeywords = ["cloudflare", "akamai", "fastly", "cloudfront", "incapsula", "sucuri", "bunny", "netlify", "vercel"];
        const isp = (ipInfo.isp || "").toLowerCase();
        const org = (ipInfo.org || "").toLowerCase();
        const detectedCdn = cdnKeywords.find(k => isp.includes(k) || org.includes(k)) || "Generic / None detected";

        return NextResponse.json({
            ok: true,
            domain,
            ip,
            asn: ipInfo.as,
            isp: ipInfo.isp,
            org: ipInfo.org,
            location: `${ipInfo.city || ""}, ${ipInfo.country || ""}`.trim(),
            cdn: detectedCdn,
            reverseIp: reverseIp.slice(0, 10), // Limit to top 10
            reverseIpCount: reverseIp.length
        });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
}
