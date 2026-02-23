export type HeaderIssue = {
    header: string;
    severity: "critical" | "high" | "medium" | "low" | "info";
    message: string;
};

export type HeaderCheck = {
    name: string;
    present: boolean;
    value?: string;
    passed: boolean;
    issues: string[];
};

export type SecurityGradeResult = {
    score: number;         // 0–100
    grade: string;         // A+ / A / B+ / B / B- / C / D / F
    checks: HeaderCheck[];
    issues: HeaderIssue[];
    passCount: number;
    totalCount: number;
};

// ── helpers ────────────────────────────────────────────────────────────────

function parseDirectives(value: string): Map<string, string | true> {
    const map = new Map<string, string | true>();
    value.split(/;/).forEach((part) => {
        const [k, ...rest] = part.trim().split(/\s+/);
        if (k) map.set(k.toLowerCase(), rest.length ? rest.join(" ") : true);
    });
    return map;
}

// ── per-header validators ──────────────────────────────────────────────────

function checkCsp(value: string | undefined): { passed: boolean; issues: string[] } {
    if (!value) return { passed: false, issues: ["Missing Content-Security-Policy"] };
    const issues: string[] = [];
    const v = value.toLowerCase();

    if (v.includes("unsafe-inline")) issues.push("CSP allows 'unsafe-inline' — XSS protection weakened");
    if (v.includes("unsafe-eval")) issues.push("CSP allows 'unsafe-eval' — arbitrary code execution risk");
    if (v.includes("*")) issues.push("CSP contains wildcard (*) source — overly permissive");
    if (!v.includes("default-src") && !v.includes("script-src"))
        issues.push("CSP missing 'default-src' or 'script-src' directive");

    return { passed: issues.length === 0, issues };
}

function checkHsts(value: string | undefined): { passed: boolean; issues: string[] } {
    if (!value) return { passed: false, issues: ["Missing Strict-Transport-Security"] };
    const issues: string[] = [];
    const dirs = parseDirectives(value);

    const maxAgeRaw = dirs.get("max-age");
    const maxAge = typeof maxAgeRaw === "string" ? parseInt(maxAgeRaw, 10) : NaN;
    const SIX_MONTHS = 15_552_000;
    const ONE_YEAR = 31_536_000;

    if (isNaN(maxAge)) {
        issues.push("HSTS missing max-age directive");
    } else if (maxAge < SIX_MONTHS) {
        issues.push(`HSTS max-age too low (${maxAge}s — minimum recommended is 6 months / 15552000s)`);
    } else if (maxAge < ONE_YEAR) {
        issues.push(`HSTS max-age is acceptable but recommend ≥ 1 year (${maxAge}s)`);
    }

    if (!dirs.has("includesubdomains")) issues.push("HSTS missing 'includeSubDomains'");
    if (!dirs.has("preload")) issues.push("HSTS missing 'preload' (optional but recommended for HSTS preload list)");

    return { passed: issues.length === 0, issues };
}

function checkXFrameOptions(value: string | undefined): { passed: boolean; issues: string[] } {
    if (!value) return { passed: false, issues: ["Missing X-Frame-Options — clickjacking risk"] };
    const v = value.toUpperCase().trim();
    if (v === "DENY" || v === "SAMEORIGIN") return { passed: true, issues: [] };
    if (v.startsWith("ALLOW-FROM"))
        return { passed: false, issues: ["X-Frame-Options ALLOW-FROM is deprecated; use CSP frame-ancestors instead"] };
    return { passed: false, issues: [`X-Frame-Options has unexpected value: '${value}'`] };
}

function checkXContentType(value: string | undefined): { passed: boolean; issues: string[] } {
    if (!value) return { passed: false, issues: ["Missing X-Content-Type-Options — MIME sniffing enabled"] };
    if (value.toLowerCase().trim() === "nosniff") return { passed: true, issues: [] };
    return { passed: false, issues: [`X-Content-Type-Options unexpected value: '${value}' (expected 'nosniff')`] };
}

const SAFE_REFERRER_POLICIES = new Set([
    "no-referrer",
    "no-referrer-when-downgrade",
    "origin",
    "origin-when-cross-origin",
    "same-origin",
    "strict-origin",
    "strict-origin-when-cross-origin",
]);

function checkReferrerPolicy(value: string | undefined): { passed: boolean; issues: string[] } {
    if (!value) return { passed: false, issues: ["Missing Referrer-Policy — referrer data may leak to third parties"] };
    const v = value.toLowerCase().trim();
    if (v === "unsafe-url") return { passed: false, issues: ["Referrer-Policy is 'unsafe-url' — leaks full URL including sensitive query params"] };
    if (v === "") return { passed: false, issues: ["Referrer-Policy is empty — behaves as 'no-referrer-when-downgrade'"] };
    if (!SAFE_REFERRER_POLICIES.has(v))
        return { passed: false, issues: [`Referrer-Policy unknown value: '${value}'`] };
    return { passed: true, issues: [] };
}

function checkPermissionsPolicy(value: string | undefined): { passed: boolean; issues: string[] } {
    if (!value) return { passed: false, issues: ["Missing Permissions-Policy — browser features unrestricted"] };
    const issues: string[] = [];
    const v = value.toLowerCase();

    // flag permissive wildcards
    if (/camera=\*/.test(v) || /camera=\(not-parsed/.test(v)) issues.push("Permissions-Policy allows camera to all origins");
    if (/microphone=\*/.test(v)) issues.push("Permissions-Policy allows microphone to all origins");
    if (/geolocation=\*/.test(v)) issues.push("Permissions-Policy allows geolocation to all origins");

    return { passed: issues.length === 0, issues };
}

function checkCors(headers: Record<string, string>): { passed: boolean; issues: string[] } {
    const issues: string[] = [];
    const acao = headers["access-control-allow-origin"];
    const acac = headers["access-control-allow-credentials"];

    if (acao === "*" && acac === "true") {
        issues.push("CORS misconfiguration: Access-Control-Allow-Origin=* combined with Allow-Credentials=true is invalid and dangerous");
    } else if (acao === "*") {
        issues.push("Access-Control-Allow-Origin=* — allows any origin to read responses (acceptable for public APIs, dangerous otherwise)");
    }
    return { passed: issues.length === 0, issues };
}

// ── weight table (points per header) ─────────────────────────────────────

const WEIGHTS: Record<string, number> = {
    "Content-Security-Policy": 25,
    "Strict-Transport-Security": 20,
    "X-Frame-Options": 15,
    "X-Content-Type-Options": 15,
    "Referrer-Policy": 10,
    "Permissions-Policy": 10,
    "CORS": 5,
};

// ── grade thresholds ──────────────────────────────────────────────────────

function scoreToGrade(score: number): string {
    if (score >= 97) return "A+";
    if (score >= 90) return "A";
    if (score >= 85) return "B+";
    if (score >= 80) return "B";
    if (score >= 75) return "B-";
    if (score >= 65) return "C";
    if (score >= 50) return "D";
    return "F";
}

// ── main export ───────────────────────────────────────────────────────────

export function gradeSecurityHeaders(headers: Record<string, string>): SecurityGradeResult {
    const h = headers; // already lowercase keys

    const rawChecks: Array<{
        name: string;
        value: string | undefined;
        result: { passed: boolean; issues: string[] };
        severity: HeaderIssue["severity"];
        weight: number;
    }> = [
            { name: "Content-Security-Policy", value: h["content-security-policy"], result: checkCsp(h["content-security-policy"]), severity: "critical", weight: WEIGHTS["Content-Security-Policy"] },
            { name: "Strict-Transport-Security", value: h["strict-transport-security"], result: checkHsts(h["strict-transport-security"]), severity: "high", weight: WEIGHTS["Strict-Transport-Security"] },
            { name: "X-Frame-Options", value: h["x-frame-options"], result: checkXFrameOptions(h["x-frame-options"]), severity: "high", weight: WEIGHTS["X-Frame-Options"] },
            { name: "X-Content-Type-Options", value: h["x-content-type-options"], result: checkXContentType(h["x-content-type-options"]), severity: "medium", weight: WEIGHTS["X-Content-Type-Options"] },
            { name: "Referrer-Policy", value: h["referrer-policy"], result: checkReferrerPolicy(h["referrer-policy"]), severity: "medium", weight: WEIGHTS["Referrer-Policy"] },
            { name: "Permissions-Policy", value: h["permissions-policy"], result: checkPermissionsPolicy(h["permissions-policy"]), severity: "low", weight: WEIGHTS["Permissions-Policy"] },
            { name: "CORS", value: h["access-control-allow-origin"], result: checkCors(h), severity: "high", weight: WEIGHTS["CORS"] },
        ];

    const totalWeight = rawChecks.reduce((s, c) => s + c.weight, 0);
    let earnedWeight = 0;
    const checks: HeaderCheck[] = [];
    const issues: HeaderIssue[] = [];

    for (const c of rawChecks) {
        const present = c.value !== undefined;
        checks.push({ name: c.name, present, value: c.value, passed: c.result.passed, issues: c.result.issues });
        if (c.result.passed) {
            earnedWeight += c.weight;
        } else {
            for (const msg of c.result.issues) {
                issues.push({ header: c.name, severity: c.severity, message: msg });
            }
        }
    }

    // partial credit: present but with issues gets 40% of weight
    for (const c of rawChecks) {
        if (!c.result.passed && c.value !== undefined) {
            earnedWeight += c.weight * 0.4;
        }
    }

    const score = Math.min(100, Math.round((earnedWeight / totalWeight) * 100));
    const grade = scoreToGrade(score);
    const passCount = checks.filter(c => c.passed).length;

    return { score, grade, checks, issues, passCount, totalCount: checks.length };
}
