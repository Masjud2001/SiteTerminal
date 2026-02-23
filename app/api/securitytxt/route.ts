import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, requireDomainParam } from "@/lib/apiGuards";
import { assertSafeHostname } from "@/lib/ssrfProtection";
import { getCache, setCache } from "@/lib/cache";

const PATHS = [
    "/.well-known/security.txt",
    "/security.txt",
];

async function fetchSecurityTxt(origin: string): Promise<{ found: boolean; path: string | null; content: string | null }> {
    for (const path of PATHS) {
        const url = `${origin}${path}`;
        try {
            const res = await fetch(url, {
                method: "GET",
                signal: AbortSignal.timeout(8_000),
                headers: { "User-Agent": "SiteTerminalBot/1.0 (+public-inspector)" },
            });
            if (res.status === 200) {
                const text = await res.text();
                // Basic sanity check — security.txt should have Contact: field
                if (text.length < 10_000) {
                    return { found: true, path, content: text.slice(0, 4_000) };
                }
            }
        } catch {
            continue;
        }
    }
    return { found: false, path: null, content: null };
}

export async function GET(req: NextRequest) {
    const rl = enforceRateLimit(req);
    if (rl) return NextResponse.json(rl.body, { status: rl.status, headers: rl.headers });

    try {
        const { domain } = requireDomainParam(req);
        const key = `securitytxt:${domain}`;
        const cached = getCache<any>(key);
        if (cached) return NextResponse.json(cached);

        await assertSafeHostname(domain);

        const result = await fetchSecurityTxt(`https://${domain}`);

        let hasContact = false;
        let hasExpires = false;
        let hasEncryption = false;
        let hasPolicy = false;
        let expired = false;
        const issues: string[] = [];

        if (result.found && result.content) {
            hasContact = /^Contact:/im.test(result.content);
            hasExpires = /^Expires:/im.test(result.content);
            hasEncryption = /^Encryption:/im.test(result.content);
            hasPolicy = /^Policy:/im.test(result.content);

            if (!hasContact) issues.push("Missing required 'Contact:' field (RFC 9116)");
            if (!hasExpires) issues.push("Missing 'Expires:' field (RFC 9116 requires it)");

            // Check if expires date has passed
            const expiresMatch = result.content.match(/^Expires:\s*(.+)$/im);
            if (expiresMatch) {
                const expiresDate = new Date(expiresMatch[1].trim());
                if (!isNaN(expiresDate.getTime()) && expiresDate < new Date()) {
                    expired = true;
                    issues.push(`security.txt has expired (Expires: ${expiresMatch[1].trim()})`);
                }
            }
        } else {
            issues.push("No security.txt found — responsible disclosure contact not defined (RFC 9116 best practice)");
        }

        const body = {
            ok: true,
            domain,
            found: result.found,
            path: result.path,
            content: result.content,
            hasContact,
            hasExpires,
            hasEncryption,
            hasPolicy,
            expired,
            issues,
            recommendation: result.found
                ? (issues.length === 0 ? "security.txt looks valid." : "Fix the issues listed above.")
                : "Add a security.txt at https://" + domain + "/.well-known/security.txt (see securitytxt.org)",
        };

        setCache(key, body, 10 * 60_000);
        return NextResponse.json(body);
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 400 });
    }
}
