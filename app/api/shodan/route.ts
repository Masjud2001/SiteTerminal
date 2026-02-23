export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Shodan Host Intelligence
 * Resolves domain to IP and queries Shodan for public port/service data.
 * Requires SHODAN_API_KEY in environment.
 */

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((session.user as any).role !== "ADMIN")
        return NextResponse.json({ error: "Admin access required." }, { status: 403 });

    const domain = req.nextUrl.searchParams.get("domain")?.trim().toLowerCase();
    if (!domain) return NextResponse.json({ error: "Missing domain parameter." }, { status: 400 });

    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    const apiKey = process.env.SHODAN_API_KEY;

    if (!apiKey) {
        return NextResponse.json({
            error: "Shodan API Key not configured. Please add SHODAN_API_KEY to environment variables."
        }, { status: 500 });
    }

    try {
        // 1. Resolve domain to IP (using Cloudflare DNS for speed)
        const dnsRes = await fetch(`https://cloudflare-dns.com/query?name=${cleanDomain}&type=A`, {
            headers: { "Accept": "application/dns-json" }
        });
        const dnsData = await dnsRes.json();
        const ip = dnsData.Answer?.[0]?.data;

        if (!ip) throw new Error("Could not resolve domain to an IP address.");

        // 2. Query Shodan
        const shodanRes = await fetch(`https://api.shodan.io/shodan/host/${ip}?key=${apiKey}`, {
            signal: AbortSignal.timeout(10000),
        });

        if (!shodanRes.ok) {
            if (shodanRes.status === 404) {
                return NextResponse.json({
                    ok: true,
                    ip,
                    message: "Host not found in Shodan database.",
                    ports: [],
                    vulns: []
                });
            }
            throw new Error(`Shodan API returned ${shodanRes.status}`);
        }

        const data = await shodanRes.json();

        return NextResponse.json({
            ok: true,
            ip: data.ip_str,
            org: data.org,
            isp: data.isp,
            os: data.os,
            ports: data.ports,
            vulns: data.vulns || [],
            tags: data.tags || [],
            lastUpdate: data.last_update,
            location: {
                city: data.city,
                country: data.country_name,
                code: data.country_code
            }
        });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || "Shodan check failed" }, { status: 500 });
    }
}
