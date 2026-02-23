// Passive CORS misconfiguration detector.
// Only reads headers — never makes credentialed requests.

export type CorsIssue = {
    severity: "critical" | "high" | "medium" | "low" | "info";
    message: string;
};

export type CorsCheckResult = {
    ok: boolean;
    allowOrigin: string | null;
    allowCredentials: string | null;
    allowMethods: string | null;
    allowHeaders: string | null;
    exposeHeaders: string | null;
    issues: CorsIssue[];
    summary: string;
};

export function checkCors(headers: Record<string, string>): CorsCheckResult {
    const allowOrigin = headers["access-control-allow-origin"] ?? null;
    const allowCredentials = headers["access-control-allow-credentials"] ?? null;
    const allowMethods = headers["access-control-allow-methods"] ?? null;
    const allowHeaders = headers["access-control-allow-headers"] ?? null;
    const exposeHeaders = headers["access-control-expose-headers"] ?? null;

    const issues: CorsIssue[] = [];

    if (!allowOrigin) {
        return {
            ok: true,
            allowOrigin, allowCredentials, allowMethods, allowHeaders, exposeHeaders,
            issues,
            summary: "No CORS headers present — cross-origin requests blocked by default.",
        };
    }

    // ── wildcard + credentials ─────────────────────────────────────────────
    if (allowOrigin === "*" && allowCredentials?.toLowerCase() === "true") {
        issues.push({
            severity: "critical",
            message:
                "CRITICAL: Access-Control-Allow-Origin=* cannot be combined with Allow-Credentials=true. " +
                "Browsers reject this, but some server misconfigurations try to do it — indicates poor CORS setup.",
        });
    }

    // ── wildcard alone ─────────────────────────────────────────────────────
    if (allowOrigin === "*") {
        issues.push({
            severity: "medium",
            message:
                "Access-Control-Allow-Origin=* — any origin can read responses. " +
                "Fine for public APIs, dangerous for authenticated or private data.",
        });
    }

    // ── null origin ────────────────────────────────────────────────────────
    if (allowOrigin === "null") {
        issues.push({
            severity: "high",
            message:
                "Access-Control-Allow-Origin: 'null' — attackers can abuse this via sandboxed iframes to bypass same-origin policy.",
        });
    }

    // ── credentials: true (non-wildcard) ──────────────────────────────────
    if (allowCredentials?.toLowerCase() === "true" && allowOrigin !== "*") {
        issues.push({
            severity: "medium",
            message:
                "Access-Control-Allow-Credentials=true — cookies and auth headers will be sent cross-origin. " +
                "Ensure the allowed origin is strictly validated server-side.",
        });
    }

    // ── overly permissive methods ──────────────────────────────────────────
    if (allowMethods) {
        const methods = allowMethods.toUpperCase().split(/,\s*/);
        if (methods.includes("DELETE") || methods.includes("PUT") || methods.includes("PATCH")) {
            issues.push({
                severity: "low",
                message: `CORS allows ${methods.filter(m => ["DELETE", "PUT", "PATCH"].includes(m)).join(", ")} methods cross-origin — ensure this is intentional.`,
            });
        }
    }

    // ── expose sensitive headers ───────────────────────────────────────────
    if (exposeHeaders) {
        const sensitiveHeaders = ["authorization", "set-cookie", "x-api-key", "x-auth-token"];
        const exposed = exposeHeaders.toLowerCase().split(/,\s*/);
        const bad = sensitiveHeaders.filter(s => exposed.includes(s));
        if (bad.length > 0) {
            issues.push({
                severity: "high",
                message: `Sensitive header(s) exposed via Access-Control-Expose-Headers: ${bad.join(", ")}`,
            });
        }
    }

    const ok = issues.every(i => i.severity === "low" || i.severity === "info");
    const summary = issues.length === 0
        ? "CORS configuration looks reasonable."
        : `${issues.length} CORS issue(s) detected.`;

    return {
        ok,
        allowOrigin, allowCredentials, allowMethods, allowHeaders, exposeHeaders,
        issues,
        summary,
    };
}
