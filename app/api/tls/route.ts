import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, requireDomainParam } from "@/lib/apiGuards";
import { getCache, setCache } from "@/lib/cache";
import { auditTls } from "@/lib/tlsAudit";
import { assertSafeHostname } from "@/lib/ssrfProtection";

export async function GET(req: NextRequest) {
  const rl = enforceRateLimit(req);
  if (rl) return NextResponse.json(rl.body, { status: rl.status, headers: rl.headers });

  try {
    const { domain } = requireDomainParam(req);
    const key = `tls:${domain}`;
    const cached = getCache<any>(key);
    if (cached) return NextResponse.json(cached);

    await assertSafeHostname(domain);

    const audit = await auditTls(domain, 443);

    const body = { ok: true, ...audit };

    setCache(key, body, 10 * 60_000);
    return NextResponse.json(body);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 400 });
  }
}
