// Passive technology fingerprinting with version detection and outdated-library flagging.

export type DetectedTech = {
    name: string;
    version: string | null;
    outdated: boolean;
    latestKnown: string | null;
    note: string | null;
};

// Known minimum safe versions (as of early 2026 — update periodically)
const KNOWN_SAFE_VERSIONS: Record<string, string> = {
    jquery: "3.7.0",
    bootstrap: "5.3.0",
    react: "18.0.0",
    vue: "3.3.0",
    angular: "17.0.0",
    lodash: "4.17.21",
    moment: "2.29.4",
};

function semverIsOlder(detected: string, minimum: string): boolean {
    const parse = (v: string) => v.replace(/[^0-9.]/g, "").split(".").map(Number);
    const d = parse(detected);
    const m = parse(minimum);
    for (let i = 0; i < Math.max(d.length, m.length); i++) {
        const a = d[i] ?? 0;
        const b = m[i] ?? 0;
        if (a < b) return true;
        if (a > b) return false;
    }
    return false;
}

function makeDetected(
    name: string,
    version: string | null,
): DetectedTech {
    const key = name.toLowerCase();
    const latestKnown = KNOWN_SAFE_VERSIONS[key] ?? null;
    const outdated = !!(version && latestKnown && semverIsOlder(version, latestKnown));
    const note = outdated
        ? `Detected version ${version} — minimum recommended is ${latestKnown}`
        : null;
    return { name, version, outdated, latestKnown, note };
}

// ── Regex patterns for version extraction ─────────────────────────────────

const PATTERNS: Array<{
    name: string;
    detect: RegExp;
    version: RegExp | null;
}> = [
        // CMS / platforms
        { name: "WordPress", detect: /wp-content|wp-includes/i, version: /<meta[^>]+name=["']generator["'][^>]+content=["']WordPress\s*([\d.]+)/i },
        { name: "Drupal", detect: /content=["']Drupal/i, version: /<meta[^>]+content=["']Drupal\s*([\d.]+)/i },
        { name: "Joomla", detect: /\/media\/jui\/|Joomla!/i, version: null },
        { name: "Shopify", detect: /cdn\.shopify\.com/i, version: null },
        { name: "Magento", detect: /mage\/|Magento/i, version: null },
        { name: "Wix", detect: /static\.wixstatic\.com/i, version: null },
        { name: "Squarespace", detect: /static\d*\.squarespace\.com/i, version: null },
        { name: "Webflow", detect: /webflow\.com\/css/i, version: null },
        { name: "Ghost", detect: /ghost\.io|ghost-sdk/i, version: null },

        // Frameworks (JS)
        { name: "Next.js", detect: /__NEXT_DATA__|_next\/static/i, version: null },
        { name: "React", detect: /react(?:\.min)?\.js|__reactFiber|__react/i, version: /react[@\/]+([\d.]+)/i },
        { name: "Vue", detect: /__vue_app__|vue(?:\.min)?\.js/i, version: /vue[@\/]([\d.]+)/i },
        { name: "Angular", detect: /ng-version=["']([\d.]+)|angular(?:\.min)?\.js/i, version: /ng-version=["']([\d.]+)/i },
        { name: "Svelte", detect: /svelte-scoped|__svelte/i, version: null },
        { name: "Nuxt", detect: /__NUXT__|_nuxt\//i, version: null },
        { name: "Gatsby", detect: /gatsby-runtime|___gatsby/i, version: null },

        // JS Libraries
        { name: "jQuery", detect: /jquery(?:\.min)?\.js|jquery@([\d.]+)/i, version: /jquery[\/\-]([\d.]+)(?:\.min)?\.js|jquery@([\d.]+)/i },
        { name: "Bootstrap", detect: /bootstrap(?:\.min)?\.css|bootstrap@/i, version: /bootstrap[@\/]([\d.]+)/i },
        { name: "Lodash", detect: /lodash(?:\.min)?\.js|lodash@/i, version: /lodash[@\/]([\d.]+)/i },
        { name: "Moment.js", detect: /moment(?:\.min)?\.js|moment@/i, version: /moment[@\/]([\d.]+)/i },
        { name: "D3.js", detect: /d3(?:\.min)?\.js|d3@/i, version: /d3[@\/]([\d.]+)/i },
        { name: "Chart.js", detect: /chart(?:\.min)?\.js|chart\.js@/i, version: /chart\.js@([\d.]+)/i },

        // Infra / CDN hints
        { name: "Cloudflare", detect: /cf-ray|__cfuid|cloudflare/i, version: null },
        { name: "Vercel", detect: /x-vercel|vercel\.app/i, version: null },
        { name: "AWS", detect: /amazonaws\.com|x-amz-/i, version: null },
        { name: "Fastly", detect: /fastly-io|x-fastly/i, version: null },
        { name: "Nginx", detect: /server:\s*nginx/i, version: /nginx\/([\d.]+)/i },
        { name: "Apache", detect: /server:\s*apache/i, version: /apache\/([\d.]+)/i },
        { name: "Litespeed", detect: /server:\s*litespeed/i, version: null },

        // Analytics / misc
        { name: "Google Analytics", detect: /google-analytics\.com|GA4|gtag\.js/i, version: null },
        { name: "Google Tag Manager", detect: /googletagmanager\.com/i, version: null },
        { name: "Hotjar", detect: /hotjar\.com/i, version: null },
        { name: "Intercom", detect: /intercom\.io|intercomcdn/i, version: null },
        { name: "HubSpot", detect: /hs-scripts\.com|hubspot/i, version: null },
        { name: "Stripe", detect: /js\.stripe\.com/i, version: null },
        { name: "reCAPTCHA", detect: /recaptcha\.net|recaptcha\/api/i, version: null },
    ];

// ── Main export ────────────────────────────────────────────────────────────

export function detectTechnologies(
    html: string,
    headers: Record<string, string>
): DetectedTech[] {
    // combine html + raw header dump for matching
    const headerBlob = Object.entries(headers)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n");
    const full = html + "\n" + headerBlob;

    const results: DetectedTech[] = [];

    for (const p of PATTERNS) {
        if (!p.detect.test(full)) continue;

        let version: string | null = null;
        if (p.version) {
            const m = full.match(p.version);
            if (m) {
                // pick first non-undefined capture group
                version = m.slice(1).find((g) => g !== undefined) ?? null;
            }
        }

        results.push(makeDetected(p.name, version));
    }

    return results;
}
