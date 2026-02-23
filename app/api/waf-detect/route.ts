export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// ── WAF / CDN signatures ─────────────────────────────────────────────────────
const WAF_SIGNATURES: Array<{
    name: string;
    type: "WAF" | "CDN" | "Proxy" | "Security";
    match: (headers: Record<string, string>, body: string, cookies: string) => boolean;
}> = [
        {
            name: "Cloudflare",
            type: "CDN",
            match: (h) =>
                !!h["cf-ray"] || h["server"] === "cloudflare" || !!h["cf-cache-status"],
        },
        {
            name: "AWS CloudFront",
            type: "CDN",
            match: (h) =>
                !!h["x-amz-cf-id"] || !!h["x-amz-cf-pop"] ||
                (h["via"] ?? "").includes("CloudFront"),
        },
        {
            name: "AWS WAF",
            type: "WAF",
            match: (h) =>
                !!h["x-amzn-requestid"] || !!h["x-amzn-trace-id"],
        },
        {
            name: "Akamai",
            type: "CDN",
            match: (h) =>
                (h["server"] ?? "").includes("AkamaiGHost") ||
                !!h["x-akamai-transformed"] || !!h["x-check-cacheable"],
        },
        {
            name: "Fastly",
            type: "CDN",
            match: (h) =>
                !!h["x-served-by"] && (h["x-served-by"] ?? "").includes("cache") ||
                (h["via"] ?? "").includes("varnish") && !!h["x-fastly-request-id"],
        },
        {
            name: "Varnish",
            type: "Proxy",
            match: (h) =>
                !!h["x-varnish"] || (h["via"] ?? "").toLowerCase().includes("varnish"),
        },
        {
            name: "Sucuri",
            type: "WAF",
            match: (h, _, cookies) =>
                !!h["x-sucuri-id"] || !!h["x-sucuri-cache"] || cookies.includes("sucuri_cloudproxy"),
        },
        {
            name: "Imperva / Incapsula",
            type: "WAF",
            match: (h, _, cookies) =>
                !!h["x-iinfo"] || cookies.includes("incap_ses") || cookies.includes("visid_incap"),
        },
        {
            name: "F5 BIG-IP ASM",
            type: "WAF",
            match: (h, _, cookies) =>
                !!h["x-wa-info"] || cookies.includes("TS") && (h["server"] ?? "").includes("BigIP"),
        },
        {
            name: "Barracuda",
            type: "WAF",
            match: (_, __, cookies) => cookies.includes("barra_counter"),
        },
        {
            name: "ModSecurity",
            type: "WAF",
            match: (h) =>
                (h["server"] ?? "").toLowerCase().includes("mod_security"),
        },
        {
            name: "Nginx",
            type: "Proxy",
            match: (h) =>
                (h["server"] ?? "").toLowerCase().startsWith("nginx"),
        },
        {
            name: "Apache",
            type: "Proxy",
            match: (h) =>
                (h["server"] ?? "").toLowerCase().startsWith("apache"),
        },
        {
            name: "Wordfence",
            type: "WAF",
            match: (h, body) =>
                body.includes("wordfence") || !!h["x-wordfence-firewall"],
        },
        {
            name: "Cloudflare DDoS Protection",
            type: "WAF",
            match: (h, body) =>
                body.includes("Checking if the site connection is secure") &&
                !!h["cf-ray"],
        },
        {
            name: "Squarespace",
            type: "CDN",
            match: (h) =>
                (h["server"] ?? "").includes("Squarespace"),
        },
        {
            name: "Vercel",
            type: "CDN",
            match: (h) =>
                !!h["x-vercel-id"] || (h["server"] ?? "").includes("Vercel"),
        },
        {
            name: "Netlify",
            type: "CDN",
            match: (h) =>
                !!h["x-nf-request-id"] || h["server"] === "Netlify",
        },
        {
            name: "Shopify",
            type: "CDN",
            match: (h) =>
                (h["x-shopid"] ?? "").length > 0 || (h["x-shardid"] ?? "").length > 0,
        },
        {
            name: "Reblaze",
            type: "WAF",
            match: (_, __, cookies) => cookies.includes("rbzid"),
        },
        {
            name: "Pantheon",
            type: "CDN",
            match: (h) => !!(h["x-pantheon-endpoint"] ?? h["x-styx-req-id"]),
        },
        {
            name: "Azure Front Door",
            type: "CDN",
            match: (h) =>
                !!h["x-azure-ref"] || !!h["x-ms-ref"],
        },
        {
            name: "Google Cloud CDN",
            type: "CDN",
            match: (h) =>
                (h["via"] ?? "").includes("google") ||
                (h["server"] ?? "").includes("gws") ||
                (h["server"] ?? "").includes("ESF"),
        },
    ];

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((session.user as any).role !== "ADMIN")
        return NextResponse.json({ error: "Admin access required." }, { status: 403 });

    const url = req.nextUrl.searchParams.get("url")?.trim();
    if (!url) return NextResponse.json({ error: "Missing url parameter." }, { status: 400 });

    const target = url.startsWith("http") ? url : `https://${url}`;

    try {
        const res = await fetch(target, {
            method: "GET",
            redirect: "follow",
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; SiteTerminal Security Scanner/1.0)",
                Accept: "text/html,application/xhtml+xml",
            },
            signal: AbortSignal.timeout(12000),
        });

        const rawHeaders: Record<string, string> = {};
        res.headers.forEach((v, k) => { rawHeaders[k.toLowerCase()] = v; });

        const body = await res.text().catch(() => "");
        const cookies = rawHeaders["set-cookie"] ?? "";

        const detected = WAF_SIGNATURES.filter((sig) =>
            sig.match(rawHeaders, body.slice(0, 5000), cookies)
        ).map((sig) => ({ name: sig.name, type: sig.type }));

        // Security headers present
        const secHeaders = {
            hsts: !!rawHeaders["strict-transport-security"],
            csp: !!rawHeaders["content-security-policy"],
            xfo: !!rawHeaders["x-frame-options"],
            xcto: !!rawHeaders["x-content-type-options"],
            rp: !!rawHeaders["referrer-policy"],
            pp: !!rawHeaders["permissions-policy"],
        };

        const interestingHeaders = Object.fromEntries(
            Object.entries(rawHeaders).filter(([k]) =>
                ["server", "x-powered-by", "via", "x-generator", "x-drupal-cache",
                    "x-wp-total", "x-shopify-stage", "cf-ray", "x-amz-cf-id",
                    "x-vercel-id", "x-nf-request-id"].includes(k)
            )
        );

        return NextResponse.json({
            ok: true,
            url: target,
            statusCode: res.status,
            detected,
            protected: detected.some((d) => d.type === "WAF"),
            cdn: detected.filter((d) => d.type === "CDN").map((d) => d.name),
            wafs: detected.filter((d) => d.type === "WAF").map((d) => d.name),
            securityHeaders: secHeaders,
            interestingHeaders,
        });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || "Fetch failed" }, { status: 500 });
    }
}
