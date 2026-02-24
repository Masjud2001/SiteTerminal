import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, requireDomainParam } from "@/lib/apiGuards";
import { assertSafeHostname } from "@/lib/ssrfProtection";
import dns from "dns/promises";

export async function GET(req: NextRequest) {
    const limitRes = enforceRateLimit(req);
    if (limitRes) return new NextResponse(JSON.stringify(limitRes.body), { status: limitRes.status, headers: limitRes.headers });

    try {
        const { domain } = requireDomainParam(req);
        // Don't assertSafeHostname on domain itself if we just want DNS, 
        // but good practice to keep it for domain sanitization.

        let cname: string[] = [];
        try {
            cname = await dns.resolveCname(domain);
        } catch (e) {
            // No CNAME, not necessarily an error for takeover check
        }

        const checks = [
            { name: "GitHub Pages", pattern: /\.github\.io$/i, service: "github" },
            { name: "Heroku", pattern: /\.herokuapp\.com$/i, service: "heroku" },
            { name: "Amazon S3", pattern: /\.s3\.amazonaws\.com$/i, service: "s3" },
            { name: "Azure Websites", pattern: /\.azurewebsites\.net$/i, service: "azure" },
            { name: "Fastly", pattern: /\.fastly\.net$/i, service: "fastly" },
            { name: "Ghost", pattern: /\.ghost\.io$/i, service: "ghost" },
            { name: "Netlify", pattern: /\.netlify\.app$/i, service: "netlify" },
            { name: "Vercel", pattern: /\.vercel\.app$/i, service: "vercel" },
        ];

        const results = [];
        let isVulnerable = false;

        for (const record of cname) {
            const match = checks.find(c => c.pattern.test(record));

            let reachable = true;
            try {
                await dns.lookup(record);
            } catch (e: any) {
                if (e.code === 'ENOTFOUND' || e.code === 'ENODATA') {
                    reachable = false;
                }
            }

            if (match) {
                const vulnerable = !reachable; // If CNAME points to something that doesn't resolve, it's a high risk of takeover
                if (vulnerable) isVulnerable = true;

                results.push({
                    target: record,
                    service: match.name,
                    reachable,
                    vulnerable,
                    severity: vulnerable ? "high" : "low"
                });
            }
        }

        // Also check for NXDOMAIN response for the domain itself if it has no A/AAAA but has a CNAME
        let hasAddress = false;
        try {
            const addr = await dns.lookup(domain);
            if (addr.address) hasAddress = true;
        } catch (e) { }

        return NextResponse.json({
            ok: true,
            domain,
            cname,
            takeoverRisks: results,
            isVulnerable,
            summary: results.length > 0
                ? `${results.length} cloud service CNAMEs detected.`
                : "No obvious dangling CNAMEs to known vulnerable services found."
        });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
}
