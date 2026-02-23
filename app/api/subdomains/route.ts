export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((session.user as any).role !== "ADMIN")
        return NextResponse.json({ error: "Admin access required." }, { status: 403 });

    const domain = req.nextUrl.searchParams.get("domain")?.trim().toLowerCase();
    if (!domain) return NextResponse.json({ error: "Missing domain parameter." }, { status: 400 });

    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

    try {
        const url = `https://crt.sh/?q=%25.${encodeURIComponent(cleanDomain)}&output=json`;
        const res = await fetch(url, {
            headers: { "User-Agent": "SiteTerminal/1.0 Security Research" },
            signal: AbortSignal.timeout(15000),
        });

        if (!res.ok) throw new Error(`crt.sh returned ${res.status}`);

        const raw: any[] = await res.json();

        // Deduplicate and clean subdomains
        const seen = new Set<string>();
        const subdomains: string[] = [];

        for (const cert of raw) {
            const names: string[] = (cert.name_value ?? "").split("\n");
            for (const name of names) {
                const sub = name.trim().toLowerCase().replace(/^\*\./, "");
                if (
                    sub &&
                    sub.endsWith(cleanDomain) &&
                    !seen.has(sub) &&
                    !sub.includes("?") &&
                    sub.length < 253
                ) {
                    seen.add(sub);
                    subdomains.push(sub);
                }
            }
        }

        subdomains.sort();

        // Classify by type
        const apex = subdomains.filter((s) => s === cleanDomain);
        const www = subdomains.filter((s) => s.startsWith("www."));
        const mail = subdomains.filter((s) => /^(mail|smtp|mx|webmail|imap|pop)\./i.test(s));
        const dev = subdomains.filter((s) => /^(dev|staging|test|beta|uat|qa|demo|sandbox)\./i.test(s));
        const api = subdomains.filter((s) => /^(api|gateway|rest|graphql|v\d)\./i.test(s));
        const admin = subdomains.filter((s) => /^(admin|panel|dashboard|cp|control|manage|portal|back|cms|login)\./i.test(s));
        const cdn = subdomains.filter((s) => /^(cdn|static|assets|media|img|images|files|s3|storage)\./i.test(s));
        const other = subdomains.filter(
            (s) =>
                !apex.includes(s) && !www.includes(s) && !mail.includes(s) &&
                !dev.includes(s) && !api.includes(s) && !admin.includes(s) && !cdn.includes(s)
        );

        return NextResponse.json({
            ok: true,
            domain: cleanDomain,
            total: subdomains.length,
            certCount: raw.length,
            subdomains,
            classified: { apex, www, mail, dev, api, admin, cdn, other },
        });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || "Failed to query crt.sh" }, { status: 500 });
    }
}
