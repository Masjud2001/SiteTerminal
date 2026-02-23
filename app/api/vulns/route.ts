export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Passive CVE check.
 * Since most CVE APIs require software names/versions, this tool:
 * 1. Performs a quick tech fingerprint of the target
 * 2. Queries the CIRCL CVE API for known vulnerabilities in those technologies
 */

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((session.user as any).role !== "ADMIN")
        return NextResponse.json({ error: "Admin access required." }, { status: 403 });

    const url = req.nextUrl.searchParams.get("url")?.trim();
    if (!url) return NextResponse.json({ error: "Missing url parameter." }, { status: 400 });

    const target = url.startsWith("http") ? url : `https://${url}`;

    try {
        // 1. Get tech stack (proxied through our own internal logic/API for speed)
        // For this implementation, we'll do a quick fetch to get headers/basic body
        const headRes = await fetch(target, {
            method: "GET",
            headers: { "User-Agent": "SiteTerminal/1.0 Security Recon" },
            signal: AbortSignal.timeout(8000),
        });

        const server = headRes.headers.get("server");
        const poweredBy = headRes.headers.get("x-powered-by");

        const techs = [];
        if (server) techs.push(server);
        if (poweredBy) techs.push(poweredBy);

        // If we have nothing from headers, we'd normally parse the body (skipping for brevity in this passive check)

        if (techs.length === 0) {
            return NextResponse.json({
                ok: true,
                target,
                techs: [],
                vulnerabilities: [],
                message: "No specific technologies identified from headers to check against CVE database."
            });
        }

        // 2. Query CVE database (CIRCL)
        const vulns = [];
        for (const tech of techs) {
            // Split "Nginx/1.18.0" -> "Nginx"
            const techName = tech.split("/")[0].split(" ")[0].toLowerCase();

            const cveRes = await fetch(`https://cve.circl.lu/api/search/${techName}`, {
                signal: AbortSignal.timeout(10000),
            });

            if (cveRes.ok) {
                const results = await cveRes.json();
                if (Array.isArray(results)) {
                    // Take top 5 most recent for each tech
                    vulns.push({
                        technology: tech,
                        findings: results.slice(0, 5).map(v => ({
                            id: v.id,
                            summary: v.summary,
                            cvss: v.cvss,
                            published: v.Published
                        }))
                    });
                }
            }
        }

        return NextResponse.json({
            ok: true,
            target,
            techs,
            vulnerabilities: vulns,
        });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || "CVE check failed" }, { status: 500 });
    }
}
