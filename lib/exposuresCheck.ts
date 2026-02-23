// Checks publicly accessible sensitive paths on a site.
// This is passive recon — we only request the path and check the HTTP status.
// We do NOT read/download/exfiltrate file contents.

import { assertSafeHostname } from "./ssrfProtection";

export type ExposurePath = {
    path: string;
    status: number | null;
    exposed: boolean;
    severity: "critical" | "high" | "medium" | "low";
    description: string;
};

export type ExposuresResult = {
    checkedPaths: number;
    exposedCount: number;
    exposures: ExposurePath[];
    dirListingDetected: boolean;
};

// Paths to probe, ordered by severity
const EXPOSURE_TARGETS: Array<{ path: string; severity: ExposurePath["severity"]; description: string }> = [
    { path: "/.env", severity: "critical", description: "Environment file — may contain API keys, DB credentials, secrets" },
    { path: "/.env.local", severity: "critical", description: "Local environment file — may contain secrets" },
    { path: "/.env.production", severity: "critical", description: "Production environment file" },
    { path: "/.git/config", severity: "critical", description: "Git repository config — may expose remote URLs and credentials" },
    { path: "/.git/HEAD", severity: "high", description: "Git HEAD file — confirms exposed .git directory" },
    { path: "/wp-config.php", severity: "critical", description: "WordPress config — contains DB credentials if exposed" },
    { path: "/wp-config.php.bak", severity: "critical", description: "WordPress config backup" },
    { path: "/wp-config.old", severity: "critical", description: "WordPress config old backup" },
    { path: "/phpinfo.php", severity: "high", description: "PHP info page — leaks server config and installed extensions" },
    { path: "/server-status", severity: "high", description: "Apache/Nginx server status — leaks request data and server info" },
    { path: "/server-info", severity: "high", description: "Apache server info endpoint" },
    { path: "/admin/", severity: "medium", description: "Admin panel accessible — check if authentication required" },
    { path: "/administrator/", severity: "medium", description: "Joomla/generic admin panel" },
    { path: "/phpmyadmin/", severity: "high", description: "phpMyAdmin — database admin interface publicly reachable" },
    { path: "/backup.zip", severity: "critical", description: "Backup archive — may contain full site source code and data" },
    { path: "/backup.tar.gz", severity: "critical", description: "Backup archive" },
    { path: "/backup.sql", severity: "critical", description: "SQL dump — may contain all database data" },
    { path: "/db.sql", severity: "critical", description: "SQL dump" },
    { path: "/.DS_Store", severity: "medium", description: "macOS .DS_Store — reveals directory structure" },
    { path: "/composer.json", severity: "low", description: "PHP Composer manifest — reveals dependency names/versions" },
    { path: "/package.json", severity: "low", description: "Node.js package manifest — reveals dependency names/versions" },
    { path: "/.htaccess", severity: "medium", description: "Apache .htaccess — may reveal rewrite rules and access controls" },
    { path: "/web.config", severity: "medium", description: "IIS web.config — may reveal server configuration" },
    { path: "/crossdomain.xml", severity: "low", description: "Flash crossdomain policy — outdated but may indicate permissive CORS-like config" },
    { path: "/clientaccesspolicy.xml", severity: "low", description: "Silverlight client access policy" },
];

// Treat these statuses as "exposed" (publicly accessible)
function isExposed(status: number | null): boolean {
    if (!status) return false;
    // 200 = found; 403 = found but forbidden (path exists); 301/302 = redirect to content
    return status === 200 || status === 403;
}

async function probeUrl(url: string, timeoutMs = 8_000): Promise<number | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            method: "GET",
            redirect: "manual",
            signal: controller.signal,
            headers: { "User-Agent": "SiteTerminalBot/1.0 (+public-inspector)" },
        });
        return res.status;
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

const DIR_LISTING_PATTERNS = [
    /Index of \//i,
    /Directory Listing/i,
    /Parent Directory/i,
    /\[DIR\]/i,
    /<title>[^<]*Index of[^<]*<\/title>/i,
];

async function detectDirectoryListing(baseUrl: string): Promise<boolean> {
    try {
        const res = await fetch(baseUrl, {
            method: "GET",
            signal: AbortSignal.timeout(8_000),
            headers: { "User-Agent": "SiteTerminalBot/1.0 (+public-inspector)" },
        });
        const text = await res.text().catch(() => "");
        return DIR_LISTING_PATTERNS.some((p) => p.test(text));
    } catch {
        return false;
    }
}

export async function checkExposures(baseUrl: string): Promise<ExposuresResult> {
    const url = new URL(baseUrl);

    // SSRF guard on the host
    await assertSafeHostname(url.hostname);

    const origin = url.origin; // e.g. https://example.com

    // Run all probes in parallel (capped batches to avoid hammering servers)
    const BATCH_SIZE = 6;
    const results: ExposurePath[] = [];

    for (let i = 0; i < EXPOSURE_TARGETS.length; i += BATCH_SIZE) {
        const batch = EXPOSURE_TARGETS.slice(i, i + BATCH_SIZE);
        const statuses = await Promise.all(
            batch.map((t) => probeUrl(`${origin}${t.path}`))
        );
        for (let j = 0; j < batch.length; j++) {
            const t = batch[j];
            const status = statuses[j];
            results.push({
                path: t.path,
                status,
                exposed: isExposed(status),
                severity: t.severity,
                description: t.description,
            });
        }
    }

    // Check for directory listing on the root
    const dirListingDetected = await detectDirectoryListing(origin + "/");

    const exposedCount = results.filter((r) => r.exposed).length;

    return {
        checkedPaths: EXPOSURE_TARGETS.length,
        exposedCount,
        exposures: results,
        dirListingDetected,
    };
}
