import { NextRequest } from "next/server";
import { isValidHttpUrl, normalizeUrl } from "./validateUrl";
import { rateLimit } from "./rateLimiter";

export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return "unknown";
}

export function enforceRateLimit(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed, remaining, resetAt } = rateLimit(ip, 30, 60_000);
  if (!allowed) {
    return {
      ok: false as const,
      status: 429,
      body: { ok: false as const, error: `Rate limit exceeded. Try again later.` },
      headers: {
        "x-ratelimit-remaining": String(remaining),
        "x-ratelimit-reset": String(resetAt),
      },
    };
  }
  return null;
}

export function requireUrlParam(req: NextRequest): { url: string } {
  const url = req.nextUrl.searchParams.get("url") || "";
  if (!isValidHttpUrl(url)) throw new Error("Invalid URL. Must start with http:// or https://");
  return { url: normalizeUrl(url) };
}

export function requireDomainParam(req: NextRequest): { domain: string } {
  const domain = (req.nextUrl.searchParams.get("domain") || "").trim();
  if (!domain || domain.includes("/") || domain.includes("://")) throw new Error("Invalid domain.");
  return { domain };
}
