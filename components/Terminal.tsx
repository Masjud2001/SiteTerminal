"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type OutputItem = {
  id: string;
  kind: "command" | "output" | "error" | "info";
  text: string;
};

const PROMPT = "user@siteterminal:~$";

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function formatJson(obj: any) {
  return JSON.stringify(obj, null, 2);
}

// ── pretty formatters for each command ──────────────────────────────────────

function fmtHeadersGrade(d: any): string {
  const bar = (score: number) => {
    const filled = Math.round(score / 5);
    return "[" + "█".repeat(filled) + "░".repeat(20 - filled) + "]";
  };
  const lines: string[] = [
    `Security Score: ${d.securityScore}%  ${bar(d.securityScore)}`,
    `Grade: ${d.grade}   (${d.passCount}/${d.totalCount} checks passed)`,
    `URL: ${d.url}`,
    ``,
    `── Checks ─────────────────────────────────────────────`,
  ];
  for (const c of d.checks ?? []) {
    const icon = c.passed ? "✓" : c.present ? "⚠" : "✗";
    lines.push(`  ${icon}  ${c.name}${c.value ? `: ${c.value.slice(0, 80)}` : ""}`);
  }
  if (d.issues?.length) {
    lines.push(``, `── Issues ─────────────────────────────────────────────`);
    for (const i of d.issues) {
      const prefix = i.severity === "critical" ? "[CRITICAL]" : i.severity === "high" ? "[HIGH]    " : i.severity === "medium" ? "[MEDIUM]  " : "[LOW]     ";
      lines.push(`  ${prefix} ${i.message}`);
    }
  } else {
    lines.push(``, `  ✓  No issues detected — excellent security posture!`);
  }
  return lines.join("\n");
}

function fmtTls(d: any): string {
  const bar = (score: number) => {
    const filled = Math.round(score / 5);
    return "[" + "█".repeat(filled) + "░".repeat(20 - filled) + "]";
  };
  const lines: string[] = [
    `TLS Grade: ${d.grade}   Score: ${d.score}/100  ${bar(d.score ?? 0)}`,
    `Domain:    ${d.domain}:${d.port}`,
    `Protocol:  ${d.tlsVersion ?? "unknown"}`,
    `Subject:   ${d.subject?.CN ?? JSON.stringify(d.subject ?? {})}`,
    `Issuer:    ${d.issuer?.O ?? d.issuer?.CN ?? JSON.stringify(d.issuer ?? {})}`,
    `Valid From:${d.valid_from ?? "N/A"}`,
    `Valid To:  ${d.valid_to ?? "N/A"}`,
    `Expires In:${d.daysUntilExpiry != null ? `${d.daysUntilExpiry} day(s)` : "N/A"}`,
    `Self-Signed: ${d.selfSigned ? "YES ⚠" : "No"}`,
    `Sig Algo:  ${d.signatureAlgorithm ?? "N/A"}`,
  ];
  if (d.issues?.length) {
    lines.push(``, `── Issues ─────────────────────────────────────────────`);
    for (const i of d.issues) {
      const prefix = i.severity === "critical" ? "[CRITICAL]" : i.severity === "high" ? "[HIGH]    " : "[MEDIUM]  ";
      lines.push(`  ${prefix} ${i.message}`);
    }
  } else {
    lines.push(``, `  ✓  No TLS issues detected.`);
  }
  return lines.join("\n");
}

function fmtExposures(d: any): string {
  const lines: string[] = [
    `Exposure Check — ${d.url}`,
    `Checked: ${d.checkedPaths} paths   Exposed: ${d.exposedCount}`,
    d.dirListingDetected ? `⚠  Directory listing DETECTED on root!` : `✓  No directory listing on root.`,
    ``,
    `── Results ─────────────────────────────────────────────`,
  ];
  for (const e of d.exposures ?? []) {
    if (e.exposed) {
      const sev = e.severity === "critical" ? "[CRITICAL]" : e.severity === "high" ? "[HIGH]    " : "[MEDIUM]  ";
      lines.push(`  ${sev} ${e.path}  (HTTP ${e.status}) — ${e.description}`);
    }
  }
  if (d.exposedCount === 0) {
    lines.push(`  ✓  No exposed sensitive paths detected.`);
  }
  const others = d.exposures?.filter((e: any) => !e.exposed) ?? [];
  if (others.length) {
    lines.push(``, `  ${others.length} path(s) returned 404/closed — not exposed.`);
  }
  return lines.join("\n");
}

function fmtSecurityTxt(d: any): string {
  const lines: string[] = [
    `security.txt — ${d.domain}`,
    `Found: ${d.found ? "Yes ✓ at " + d.path : "No ✗"}`,
  ];
  if (d.found) {
    lines.push(
      `Contact Present:    ${d.hasContact ? "Yes ✓" : "No ✗"}`,
      `Expires Present:    ${d.hasExpires ? "Yes ✓" : "No ✗"}`,
      `Encryption Present: ${d.hasEncryption ? "Yes ✓" : "No"}`,
      `Policy Present:     ${d.hasPolicy ? "Yes ✓" : "No"}`,
      `File Expired:       ${d.expired ? "YES ⚠" : "No"}`,
    );
  }
  if (d.issues?.length) {
    lines.push(``, `── Issues ─────────────────────────────────────────────`);
    for (const i of d.issues) lines.push(`  ✗  ${i}`);
  }
  lines.push(``, `Recommendation: ${d.recommendation}`);
  if (d.content) {
    lines.push(``, `── Content ─────────────────────────────────────────────`, d.content);
  }
  return lines.join("\n");
}

function fmtCors(d: any): string {
  const lines: string[] = [
    `CORS Analysis — ${d.url}`,
    `Status: ${d.ok ? "✓ OK" : "⚠ Issues Found"}`,
    ``,
    `Access-Control-Allow-Origin:      ${d.allowOrigin ?? "(not set)"}`,
    `Access-Control-Allow-Credentials: ${d.allowCredentials ?? "(not set)"}`,
    `Access-Control-Allow-Methods:     ${d.allowMethods ?? "(not set)"}`,
    `Access-Control-Allow-Headers:     ${d.allowHeaders ?? "(not set)"}`,
    `Access-Control-Expose-Headers:    ${d.exposeHeaders ?? "(not set)"}`,
  ];
  if (d.issues?.length) {
    lines.push(``, `── Issues ─────────────────────────────────────────────`);
    for (const i of d.issues) {
      const prefix = i.severity === "critical" ? "[CRITICAL]" : i.severity === "high" ? "[HIGH]    " : "[MEDIUM]  ";
      lines.push(`  ${prefix} ${i.message}`);
    }
  } else {
    lines.push(``, `  ✓  ${d.summary}`);
  }
  return lines.join("\n");
}

function fmtTech(d: any): string {
  const lines: string[] = [
    `Technology Fingerprint — ${d.url}`,
    `Detected: ${d.technologies?.length ?? 0} technolog${d.technologies?.length === 1 ? "y" : "ies"}   Outdated: ${d.outdatedCount ?? 0}`,
    ``,
    `── Detected Technologies ────────────────────────────────`,
  ];
  for (const t of d.technologies ?? []) {
    const version = t.version ? ` v${t.version}` : "";
    const flag = t.outdated ? ` ⚠ OUTDATED (min: ${t.latestKnown})` : "";
    lines.push(`  ${t.outdated ? "⚠" : "✓"}  ${t.name}${version}${flag}`);
    if (t.note) lines.push(`      → ${t.note}`);
  }
  if (!d.technologies?.length) lines.push(`  No technologies detected.`);
  return lines.join("\n");
}

function fmtInspect(d: any): string {
  const lines: string[] = [
    `Inspect — ${d.inputUrl}`,
    `Final URL:  ${d.finalUrl}`,
    `Status:     ${d.status}   Timing: ${d.timingMs}ms`,
    `Redirects:  ${d.redirects?.length ?? 0}`,
    `Title:      ${d.title ?? "(none)"}`,
    `Meta Desc:  ${d.metaDescription ?? "(none)"}`,
    `Links:      ${d.linkCount}`,
    `Dir Listing:${d.dirListingDetected ? " ⚠ DETECTED" : " No"}`,
    ``,
    `Security Score: ${d.securityScore}%  Grade: ${d.securityGrade}   Issues: ${d.securityIssueCount}`,
    ``,
    `── Technologies (${d.technologies?.length ?? 0}) ───────────────────────────────`,
  ];
  for (const t of d.technologies ?? []) {
    const v = t.version ? ` v${t.version}` : "";
    const flag = t.outdated ? " ⚠" : "";
    lines.push(`  ${t.outdated ? "⚠" : "•"}  ${t.name}${v}${flag}`);
  }
  if (!d.technologies?.length) lines.push(`  None detected.`);
  if (d.outdatedLibraries?.length) {
    lines.push(``, `── Outdated Libraries ──────────────────────────────────`);
    for (const t of d.outdatedLibraries) {
      lines.push(`  ⚠  ${t.name} v${t.version} — ${t.note}`);
    }
  }
  return lines.join("\n");
}

function fmtVulns(d: any): string {
  const lines: string[] = [
    `CVE Vulnerability Audit — ${d.target}`,
    `Technologies identified: ${d.techs.join(", ") || "None"}`,
    ``,
  ];

  if (d.vulnerabilities?.length) {
    for (const vGroup of d.vulnerabilities) {
      lines.push(`── ${vGroup.technology} ─────────────────────────────────`);
      vGroup.findings.forEach((f: any) => {
        const severity = f.cvss ? `[CVSS ${f.cvss}]` : "[INFO]";
        lines.push(`  ⚠ ${severity} ${f.id}`);
        lines.push(`    ${f.summary.slice(0, 100)}...`);
      });
      lines.push(``);
    }
  } else {
    lines.push(d.message || `✓ No known CVEs found for the identified tech stack in recent database records.`);
  }

  return lines.join("\n");
}

function fmtShodan(d: any): string {
  const lines: string[] = [
    `Shodan Intelligence — ${d.ip}`,
    `Organization: ${d.org || "Unknown"}`,
    `ISP:          ${d.isp || "Unknown"}`,
    `Location:     ${d.location.city}, ${d.location.country}`,
    `OS:           ${d.os || "Unknown"}`,
    ``,
    `Open Ports:   ${d.ports.join(", ") || "None found"}`,
  ];

  if (d.vulns?.length) {
    lines.push(``, `── Vulnerabilities ─────────────────────────────────────`);
    d.vulns.forEach((v: string) => lines.push(`  ⚠ ${v}`));
  }

  if (d.tags?.length) {
    lines.push(``, `Tags: ${d.tags.join(", ")}`);
  }

  return lines.join("\n");
}

function fmtBreach(d: any): string {
  const lines: string[] = [
    `Domain Breach Audit — ${d.domain}`,
    ``,
  ];

  if (d.breaches?.length) {
    lines.push(`── Known Breaches ──────────────────────────────────────`);
    d.breaches.forEach((b: any) => {
      lines.push(`  ⚠ ${b.Title} (${b.BreachDate})`);
      lines.push(`    Data: ${b.DataClasses.join(", ")}`);
    });
  } else {
    lines.push(d.message || `✓ No public breach data found for this domain.`);
  }

  return lines.join("\n");
}

function fmtSubdomains(d: any): string {
  const lines: string[] = [
    `Subdomain Enumeration — ${d.domain}`,
    `Total Found: ${d.total}   (via Certificate Transparency)`,
    ``,
  ];

  const categories = [
    { label: "Admin/Panels", items: d.classified.admin },
    { label: "API/Gateways", items: d.classified.api },
    { label: "Dev/Staging", items: d.classified.dev },
    { label: "Mail Servers", items: d.classified.mail },
    { label: "CDN/Assets", items: d.classified.cdn },
  ];

  for (const cat of categories) {
    if (cat.items?.length) {
      lines.push(`── ${cat.label} ─────────────────────────────────`);
      cat.items.forEach((s: string) => lines.push(`  • ${s}`));
      lines.push(``);
    }
  }

  if (d.classified.other?.length) {
    lines.push(`── Other Subdomains ──────────────────────────────`);
    const others = d.classified.other.slice(0, 30);
    others.forEach((s: string) => lines.push(`  • ${s}`));
    if (d.classified.other.length > 30) {
      lines.push(`    ... and ${d.classified.other.length - 30} more`);
    }
  }

  return lines.join("\n");
}

function fmtWaf(d: any): string {
  const lines: string[] = [
    `WAF/CDN Detection — ${d.url}`,
    `Status: ${d.protected ? "🛡 Protected" : "⚠ Directly Exposed"}`,
    ``,
  ];

  if (d.wafs?.length) lines.push(`WAF:  ${d.wafs.join(", ")}`);
  if (d.cdn?.length) lines.push(`CDN:  ${d.cdn.join(", ")}`);
  if (!d.wafs?.length && !d.cdn?.length) lines.push(`Detected: None (Server appears to be origin-exposed)`);

  lines.push(``, `── Security Headers ────────────────────────────────────`);
  lines.push(`  HSTS:                ${d.securityHeaders.hsts ? "✓ Yes" : "✗ No"}`);
  lines.push(`  CSP:                 ${d.securityHeaders.csp ? "✓ Yes" : "✗ No"}`);
  lines.push(`  X-Frame-Options:     ${d.securityHeaders.xfo ? "✓ Yes" : "✗ No"}`);
  lines.push(`  X-Content-Type:      ${d.securityHeaders.xcto ? "✓ Yes" : "✗ No"}`);

  if (Object.keys(d.interestingHeaders ?? {}).length) {
    lines.push(``, `── Fingerprint ─────────────────────────────────────────`);
    for (const [k, v] of Object.entries(d.interestingHeaders)) {
      lines.push(`  ${k}: ${v}`);
    }
  }

  return lines.join("\n");
}

function fmtWayback(d: any): string {
  const lines: string[] = [
    `Wayback Machine Analysis — ${d.domain}`,
    `Total Snapshots Index: ${d.totalSnapshots}`,
    `Time Range: ${d.oldestSnapshot} to ${d.newestSnapshot}`,
    ``,
  ];

  if (d.sensitiveUrls?.length) {
    lines.push(`── Sensitive Paths Found (Historical) ──────────────────`);
    d.sensitiveUrls.forEach((u: any) => {
      lines.push(`  ⚠ [${u.date}] ${u.url}`);
    });
    lines.push(``);
  } else {
    lines.push(`✓ No sensitive paths found in historical index (first 500).`, ``);
  }

  if (d.allUrls?.length) {
    lines.push(`── Recent Crawl Samples ──────────────────────────────`);
    d.allUrls.forEach((u: any) => {
      lines.push(`  • [${u.date}] ${u.url}`);
    });
  }

  return lines.join("\n");
}

function fmtSslChain(d: any): string {
  const lines: string[] = [
    `SSL/TLS Certificate Chain — ${d.domain}`,
    `Protocol: ${d.protocol}`,
    `Cipher:   ${d.cipher.name} (${d.cipher.version})`,
    `Status:   ${d.authorized ? "✓ Valid Chain" : "✗ Unauthorized (" + d.authorizationError + ")"}`,
    ``,
  ];

  d.chain.forEach((c: any, i: number) => {
    lines.push(`── Certificate ${i} ─────────────────────────────────────`);
    lines.push(`  Subject: ${c.subject.CN || "Unknown"}`);
    lines.push(`  Issuer:  ${c.issuer.CN || "Unknown"}`);
    lines.push(`  Valid:   ${new Date(c.valid_from).toLocaleDateString()} to ${new Date(c.valid_to).toLocaleDateString()}`);
    lines.push(`  Serial:  ${c.serialNumber}`);
    lines.push(``);
  });

  return lines.join("\n");
}

function fmtOpenPorts(d: any): string {
  const lines: string[] = [
    `Port Discovery — ${d.domain}`,
    `Total Checked: ${d.totalChecked} ports`,
    `Found Open:    ${d.openCount}`,
    ``,
    `── Service Check ──────────────────────────────────────`,
  ];

  d.ports.forEach((p: any) => {
    const status = p.open ? "○ OPEN  " : "  closed";
    const color = p.open ? "emerald" : "zinc"; // Logical mapping for potential future styling
    lines.push(`  ${p.port.toString().padEnd(5)} ${p.service.padEnd(12)} [${status}]`);
  });

  return lines.join("\n");
}


function fmtWhois(d: any): string {
  const lines: string[] = [
    `WHOIS Record — ${d.domain}`,
    `Registrar:  ${d.registrar || d.registrarName || "N/A"}`,
    `Creation:   ${d.creationDate || d.created || "N/A"}`,
    `Expiry:     ${d.expiryDate || d.expires || d.registryExpiryDate || "N/A"}`,
    `Updated:    ${d.updatedDate || d.updated || "N/A"}`,
    `Status:     ${Array.isArray(d.domainStatus) ? d.domainStatus.join(", ") : d.domainStatus || "N/A"}`,
    ``,
    `── Name Servers ────────────────────────────────────────`,
  ];
  const ns = Array.isArray(d.nameServer) ? d.nameServer : (d.nameServer || "").split(" ");
  ns.filter(Boolean).forEach((s: string) => lines.push(`  • ${s}`));
  return lines.join("\n");
}

function fmtIp(d: any): string {
  const i = d.info;
  if (!i) return `IP: ${d.ip}\nNo additional info found.`;
  return [
    `IP Intelligence — ${d.domain}`,
    `IP Address: ${d.ip}`,
    `ASN:        ${i.as}`,
    `ISP:        ${i.isp}`,
    `Org:        ${i.org}`,
    `Location:   ${i.city}, ${i.regionName}, ${i.country}`,
    `Lat/Lon:    ${i.lat}, ${i.lon}`,
    `Timezone:   ${i.timezone}`,
  ].join("\n");
}

function fmtInfraMap(d: any): string {
  const lines: string[] = [
    `Infrastructure Map — ${d.domain}`,
    `Resolved IP: ${d.ip}`,
    `ASN:         ${d.asn}`,
    `ISP/Hosting: ${d.isp}`,
    `Organization: ${d.org}`,
    `Location:    ${d.location}`,
    `CDN Detect:  ${d.cdn}`,
    ``,
    `── Reverse IP Lookup (${d.reverseIpCount} domains total) ──────────`,
  ];
  if (d.reverseIp?.length) {
    d.reverseIp.forEach((dom: string) => lines.push(`  • ${dom}`));
    if (d.reverseIpCount > 10) lines.push(`    ... and ${d.reverseIpCount - 10} more`);
  } else {
    lines.push(`  No other domains found on this IP.`);
  }
  return lines.join("\n");
}

function fmtTakeover(d: any): string {
  const lines: string[] = [
    `Subdomain Takeover Audit — ${d.domain}`,
    `Status: ${d.isVulnerable ? "⚠ VULNERABLE" : "✓ Secure (Passive)"}`,
    ``,
  ];
  if (d.cname?.length) {
    lines.push(`CNAME Records:`);
    d.cname.forEach((c: string) => lines.push(`  → ${c}`));
    lines.push(``);
  }
  if (d.takeoverRisks?.length) {
    lines.push(`── Findings ──────────────────────────────────────────`);
    d.takeoverRisks.forEach((r: any) => {
      const icon = r.vulnerable ? "⚠" : "✓";
      lines.push(`  ${icon} [${r.service}] ${r.target}`);
      lines.push(`    Status: ${r.reachable ? "Resolving" : "NXDOMAIN (Dangling!)"}`);
      if (r.vulnerable) lines.push(`    Action: Claim this resource or remove CNAME!`);
    });
  } else {
    lines.push(d.summary);
  }
  return lines.join("\n");
}

function fmtScan(d: any): string {
  const lines: string[] = [
    `Quick Scan — ${d.domain}`,
    `Timestamp: ${d.timestamp}`,
    ``,
    `── Network ────────────────────────────────────────────`,
    `  Status:   ${d.http.reachable ? "UP ✓" : "DOWN ✗"}`,
    `  Code:     ${d.http.status || "N/A"}`,
    `  Server:   ${d.http.server || "Unknown"}`,
    ``,
    `── DNS Records ────────────────────────────────────────`,
  ];
  if (d.dns) {
    if (d.dns.A?.length) lines.push(`  A:     ${d.dns.A.join(", ")}`);
    if (d.dns.AAAA?.length) lines.push(`  AAAA:  ${d.dns.AAAA.join(", ")}`);
    if (d.dns.CNAME?.length) lines.push(`  CNAME: ${d.dns.CNAME.join(", ")}`);
    if (d.dns.MX?.length) lines.push(`  MX:    ${d.dns.MX.map((m: any) => m.exchange).join(", ")}`);
  }
  return lines.join("\n");
}

// Map command → pretty formatter (fallback = raw JSON)
const FORMATTERS: Record<string, (d: any) => string> = {
  "headers-grade": fmtHeadersGrade,
  tls: fmtTls,
  ssl: fmtTls,
  exposures: fmtExposures,
  securitytxt: fmtSecurityTxt,
  cors: fmtCors,
  tech: fmtTech,
  inspect: fmtInspect,
  subdomains: fmtSubdomains,
  "waf-detect": fmtWaf,
  wayback: fmtWayback,
  vulns: fmtVulns,
  shodan: fmtShodan,
  breach: fmtBreach,
  "ssl-chain": fmtSslChain,
  "open-ports": fmtOpenPorts,
  whois: fmtWhois,
  ip: fmtIp,
  "infra-map": fmtInfraMap,
  "takeover-check": fmtTakeover,
  scan: fmtScan,
};

// ── help text ────────────────────────────────────────────────────────────────

const HELP_TEXT = `
╔══════════════════════════════════════════════════════════════╗
║                 SiteTerminal — Command Reference             ║
╚══════════════════════════════════════════════════════════════╝

── Core Inspection ─────────────────────────────────────────────
  scan     <domain>       Quick domain overview (DNS, HTTP status)
  inspect  <url>          Full site overview (status, SEO, tech, security)
  status   <url>          HTTP status code & redirect chain
  headers  <url>          Raw HTTP response headers + security audit
  seo      <url>          Meta title, description, canonical, OG tags
  links    <url>          All <a href> links on the page

── Security Analysis ────────────────────────────────────────────
  takeover-check <domain> Dangling DNS & CNAME takeover detection
  headers-grade  <url>    Deep security header audit with grade (A–F)
  tls            <domain> TLS/SSL certificate audit — grade, expiry
  ssl            <domain> (alias for tls)
  cors           <url>    CORS misconfiguration check
  exposures      <url>    Sensitive file & path exposure check
  securitytxt    <domain> Check for RFC 9116 security.txt

── Intelligence & Recon ─────────────────────────────────────────
  infra-map  <domain>     IP, ASN, Hosting, CDN, and Reverse IP Map
  whois      <domain>     WHOIS record lookup
  ip         <domain>     IP geolocation and ISP intelligence
  tech       <url>        Full tech fingerprint — 35+ patterns

── DNS & Network ────────────────────────────────────────────────
  dns      <domain>       DNS records (A, AAAA, MX, TXT, NS, CNAME)
  robots   <url>          robots.txt content
  sitemap  <url>          sitemap.xml content

── Admin Tools (Auth Required) ──────────────────────────────────
  subdomains <domain>     Passive subdomain enumeration (crt.sh)
  waf-detect <url>        WAF, CDN, and Proxy fingerprinting
  wayback    <domain>     Find historical sensitive file exposures
  vulns      <url>        Check technology stack against CVE database
  shodan     <domain>     Shodan host intelligence (ports, org, vuln)
  breach     <domain>     Search for known domain-associated breaches
  ssl-chain  <domain>     Validate full certificate chain integrity
  open-ports <domain>     Check for common open service ports

── Terminal ─────────────────────────────────────────────────────
  help                    Show this help
  clear                   Clear the terminal
  local                   Learn about the Windows Local Security Inspector
`.trim();

// ── Terminal component ───────────────────────────────────────────────────────

export default function Terminal({ userId }: { userId?: string }) {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState<number>(-1);
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<OutputItem[]>(() => [
    { id: uid(), kind: "info", text: "SiteTerminal ready. Type `help` to see all commands." },
  ]);

  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const commands = useMemo(
    () =>
      new Set([
        "help", "clear", "local",
        "inspect", "status", "headers", "seo", "links", "robots", "sitemap",
        "headers-grade", "tls", "ssl", "cors", "exposures", "securitytxt",
        "tech", "dns",
        "subdomains", "waf-detect", "wayback",
        "vulns", "shodan", "breach",
        "ssl-chain", "open-ports",
        "whois", "ip", "infra-map", "takeover-check", "scan",
      ]),
    []
  );

  // Commands that take a domain (not a URL)
  const domainCommands = useMemo(() => new Set(["dns", "tls", "ssl", "securitytxt", "subdomains", "wayback", "shodan", "breach", "ssl-chain", "open-ports", "whois", "ip", "infra-map", "takeover-check", "scan", "headers", "tech"]), []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [out, busy]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function runCommand(line: string) {
    const trimmed = line.trim();
    if (!trimmed) return;

    setHistory((h) => [trimmed, ...h]);
    setHistIdx(-1);
    setOut((o) => [...o, { id: uid(), kind: "command", text: `${PROMPT} ${trimmed}` }]);

    const [cmdRaw, ...rest] = trimmed.split(/\s+/);
    const cmd = cmdRaw.toLowerCase();

    if (!commands.has(cmd)) {
      setOut((o) => [...o, { id: uid(), kind: "error", text: `Unknown command: '${cmd}'. Type 'help' to list commands.` }]);
      return;
    }

    if (cmd === "help") {
      setOut((o) => [...o, { id: uid(), kind: "info", text: HELP_TEXT }]);
      return;
    }

    if (cmd === "local") {
      setOut((o) => [...o, {
        id: uid(),
        kind: "info",
        text: `
[Local Security Inspector]
A premium Windows desktop companion for auditing local system health.
Features: File Hashing, Process Signature Analysis, Registry Startup Audit, & Port Scanning.

To learn more or download:
Visit: /inspector
Status: v1.0.0 Stable
`.trim()
      }]);
      return;
    }

    if (cmd === "clear") {
      setOut([{ id: uid(), kind: "info", text: "SiteTerminal ready. Type `help` to see all commands." }]);
      return;
    }

    const arg = rest.join(" ").trim();
    if (!arg) {
      const example = domainCommands.has(cmd) ? `${cmd} example.com` : `${cmd} https://example.com`;
      setOut((o) => [...o, { id: uid(), kind: "error", text: `Usage: ${example}` }]);
      return;
    }

    setBusy(true);
    let cmdSuccess = false;
    let resultData: any = null;
    try {
      const params = new URLSearchParams();
      if (domainCommands.has(cmd)) params.set("domain", arg);
      else params.set("url", arg);

      const res = await fetch(`/api/${cmd}?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || data?.ok === false) {
        const msg = data?.error || `Request failed (${res.status})`;
        setOut((o) => [...o, { id: uid(), kind: "error", text: msg }]);
      } else {
        cmdSuccess = true;
        resultData = data;
        const formatter = FORMATTERS[cmd];
        const text = formatter ? formatter(data) : formatJson(data);
        setOut((o) => [...o, { id: uid(), kind: "output", text }]);
      }
    } catch (e: any) {
      setOut((o) => [...o, { id: uid(), kind: "error", text: e?.message || "Network error" }]);
    } finally {
      setBusy(false);
      if (userId) {
        // Log command entry (fast, minimal)
        fetch("/api/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command: cmd, target: arg, success: cmdSuccess }),
        }).catch(() => { });

        // Store full search record with result JSON and show UID
        if (cmdSuccess && resultData) {
          fetch("/api/searches", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ command: cmd, target: arg, result: resultData }),
          })
            .then((r) => r.json())
            .then((r) => {
              if (r?.uid) {
                setOut((o) => [
                  ...o,
                  { id: uid(), kind: "info", text: `Saved as ${r.uid}  ·  stored in database` },
                ]);
              }
            })
            .catch(() => { });
        }
      }
    }
  }


  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      const line = input;
      setInput("");
      runCommand(line);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHistIdx((idx) => {
        const next = Math.min(idx + 1, history.length - 1);
        if (history[next]) setInput(history[next]);
        return next;
      });
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHistIdx((idx) => {
        const next = Math.max(idx - 1, -1);
        setInput(next === -1 ? "" : history[next] ?? "");
        return next;
      });
    }

    // Ctrl+L to clear
    if (e.ctrlKey && e.key === "l") {
      e.preventDefault();
      setOut([{ id: uid(), kind: "info", text: "SiteTerminal ready. Type `help` to see all commands." }]);
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="rounded-xl border border-zinc-800 bg-black shadow-lg">
        {/* Title bar */}
        <div className="px-4 py-3 border-b border-zinc-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500 opacity-80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500 opacity-80" />
              <div className="w-3 h-3 rounded-full bg-green-500 opacity-80" />
            </div>
            <div className="text-zinc-200 font-mono text-sm">SiteTerminal</div>
          </div>
          <div className="text-zinc-500 text-xs">Public data only • No exploitation</div>
        </div>

        {/* Output */}
        <div className="p-4 h-[70vh] overflow-y-auto font-mono text-sm">
          {out.map((item) => (
            <pre
              key={item.id}
              className={
                item.kind === "command"
                  ? "text-zinc-200"
                  : item.kind === "error"
                    ? "text-red-400"
                    : item.kind === "info"
                      ? "text-emerald-300"
                      : "text-emerald-200"
              }
              style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", marginBottom: "0.5rem" }}
            >
              {item.text}
            </pre>
          ))}

          {busy && (
            <div className="flex items-center gap-2 text-zinc-400">
              <span className="animate-pulse">▋</span>
              <span>running…</span>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-zinc-900 flex items-center gap-2 font-mono">
          <span className="text-zinc-300 shrink-0">{PROMPT}</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            className="flex-1 bg-transparent outline-none text-emerald-200 placeholder:text-zinc-700"
            placeholder="help"
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>
      </div>
    </div>
  );
}
