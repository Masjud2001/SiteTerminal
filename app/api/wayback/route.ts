export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Paths that are particularly interesting if they were ever publicly accessible
const SENSITIVE_PATTERNS = [
    /\.env(\.|$)/i,
    /\.git\//i,
    /wp-config\.php/i,
    /config\.php/i,
    /phpinfo\.php/i,
    /admin\//i,
    /administrator\//i,
    /backup/i,
    /dump\.sql/i,
    /\.sql$/i,
    /\.bak$/i,
    /\.old$/i,
    /passwd/i,
    /id_rsa/i,
    /\.pem$/i,
    /credentials/i,
    /secret/i,
    /private/i,
    /\.htaccess/i,
    /server-status/i,
    /readme\.(txt|md)/i,
    /install\.(php|txt)/i,
    /setup\.(php|txt)/i,
    /debug/i,
    /console/i,
    /phpmyadmin/i,
    /\.DS_Store/i,
    /crossdomain\.xml/i,
];

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((session.user as any).role !== "ADMIN")
        return NextResponse.json({ error: "Admin access required." }, { status: 403 });

    const domain = req.nextUrl.searchParams.get("domain")?.trim().toLowerCase();
    if (!domain) return NextResponse.json({ error: "Missing domain parameter." }, { status: 400 });

    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

    try {
        // Query Wayback Machine CDX API
        const cdxUrl =
            `https://web.archive.org/cdx/search/cdx` +
            `?url=${encodeURIComponent(cleanDomain + "/*")}` +
            `&output=json` +
            `&fl=original,statuscode,timestamp,mimetype` +
            `&collapse=urlkey` +
            `&limit=500` +
            `&filter=statuscode:200`;

        const res = await fetch(cdxUrl, {
            headers: { "User-Agent": "SiteTerminal/1.0 Security Research" },
            signal: AbortSignal.timeout(20000),
        });

        if (!res.ok) throw new Error(`Wayback CDX API returned ${res.status}`);

        const rows: string[][] = await res.json();

        // First row is headers
        if (!rows.length || rows.length < 2) {
            return NextResponse.json({
                ok: true,
                domain: cleanDomain,
                totalSnapshots: 0,
                sensitiveUrls: [],
                allUrls: [],
                oldestSnapshot: null,
                newestSnapshot: null,
            });
        }

        const [_header, ...data] = rows;
        const allUrls = data.map(([original, statuscode, timestamp, mimetype]) => ({
            url: original,
            status: statuscode,
            timestamp,
            mimetype,
            date: timestamp
                ? `${timestamp.slice(0, 4)}-${timestamp.slice(4, 6)}-${timestamp.slice(6, 8)}`
                : "unknown",
        }));

        // Find sensitive paths
        const sensitiveUrls = allUrls.filter((entry) =>
            SENSITIVE_PATTERNS.some((pattern) => pattern.test(entry.url))
        );

        // Sort sensitive by potential severity
        const prioritized = sensitiveUrls.sort((a, b) => {
            const scoreOf = (url: string) => {
                if (/\.env|credentials|id_rsa|\.pem|secret/i.test(url)) return 100;
                if (/\.git\/|wp-config|config\.php|passwd/i.test(url)) return 90;
                if (/backup|dump\.sql|\.sql|\.bak/i.test(url)) return 80;
                if (/admin|phpmyadmin|console|debug/i.test(url)) return 70;
                return 50;
            };
            return scoreOf(b.url) - scoreOf(a.url);
        });

        // Stats
        const byType = allUrls.reduce<Record<string, number>>((acc, u) => {
            const ext = u.url.split(".").pop()?.split("?")[0]?.toLowerCase() ?? "other";
            const key = ["html", "php", "js", "css", "json", "xml", "txt", "pdf", "jpg", "png"].includes(ext)
                ? ext : "other";
            acc[key] = (acc[key] ?? 0) + 1;
            return acc;
        }, {});

        const timestamps = allUrls.map((u) => u.timestamp).filter(Boolean).sort();

        return NextResponse.json({
            ok: true,
            domain: cleanDomain,
            totalSnapshots: allUrls.length,
            sensitiveUrls: prioritized.slice(0, 50),
            allUrls: allUrls.slice(0, 30),
            byType,
            oldestSnapshot: timestamps[0]
                ? `${timestamps[0].slice(0, 4)}-${timestamps[0].slice(4, 6)}-${timestamps[0].slice(6, 8)}`
                : null,
            newestSnapshot: timestamps[timestamps.length - 1]
                ? `${timestamps.at(-1)!.slice(0, 4)}-${timestamps.at(-1)!.slice(4, 6)}-${timestamps.at(-1)!.slice(6, 8)}`
                : null,
        });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || "Wayback query failed" }, { status: 500 });
    }
}
