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

// Map command → pretty formatter (fallback = raw JSON)
const FORMATTERS: Record<string, (d: any) => string> = {
  "headers-grade": fmtHeadersGrade,
  tls: fmtTls,
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
};

// ── help text ────────────────────────────────────────────────────────────────

const HELP_TEXT = `
[ ACCESS_GRANTED ] ══════════════════════════════════════════════════
 
 > CORE_MODULES
 ---------------------------------------------------------------------
  inspect    <url>      FULL SYSTEM AUDIT (STATUS/SEO/TECH/SEC)
  status     <url>      HTTP STATE & REDIRECT_MAP
  headers    <url>      RAW_HEADER_STREAM + SECURITY_AUDIT
  seo        <url>      METADATA_EXTRACTOR (OG/META/CANONICAL)
  links      <url>      NAV_MAP_CRAWLER
 
 > SECURITY_VULN_SCAN
 ---------------------------------------------------------------------
  headers-grade <url>   DEEP_SEC_AUDIT (GRADE: A-F)
  tls           <dom>   SSL_CERT_VALIDATOR (EXPIRY/WEAKNESS)
  cors          <url>   CROSS_ORIGIN_POL_CHECK
  exposures     <url>   SENSITIVE_PATH_DISCOVERY
  securitytxt   <dom>   RFC_9116_CHECK
 
 > TECH_STACK
 ---------------------------------------------------------------------
  tech       <url>      FINGERPRINT_DATABASE (35+ PATTERNS)
 
 > NETWORK_RECON
 ---------------------------------------------------------------------
  dns        <dom>      DNS_RESOLVER (A/MX/TXT/NS)
  robots     <url>      CRAWL_RULES (ROBOTS_TXT)
  sitemap    <url>      SITE_MAP_STREAM
 
 > ADMIN_PROTOCOL (AUTH_REQ)
 ---------------------------------------------------------------------
  subdomains <dom>      CERT_TRANSPARENCY_ENUM
  waf-detect <url>      FIREWALL_FINGERPRINT
  wayback    <dom>      HISTORICAL_PATH_EXPOSURE
  vulns      <url>      CVE_TECH_CROSSREF
  shodan     <dom>      HOST_INTEL (PORTS/ORG)
  breach     <dom>      HIBP_DOMAIN_SCAN
  ssl-chain  <dom>      CHAIN_INTEGRITY_AUDIT
  open-ports <dom>      SERVICE_PORT_DISCOVERY
 
 > SYSTEM
 ---------------------------------------------------------------------
  help                  DISPLAY_THIS_MAP
  clear                 WIPE_BUFFER
 
 ---------------------------------------------------------------------
 [!!] PASSIVE_MODE: ACTIVE // NO_PROBING_DETECTED
 ---------------------------------------------------------------------
`.trim();

// ── Terminal component ───────────────────────────────────────────────────────

export default function Terminal({ userId }: { userId?: string }) {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState<number>(-1);
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<OutputItem[]>(() => [
    {
      id: uid(),
      kind: "info",
      text: `
 ██████╗██╗████████╗███████╗████████╗███████╗██████╗ ███╗   ███╗██╗███╗   ██╗ █████╗ ██╗     
██╔════╝██║╚══██╔══╝██╔════╝╚══██╔══╝██╔════╝██╔══██╗████╗ ████║██║████╗  ██║██╔══██╗██║     
╚█████╗ ██║   ██║   █████╗     ██║   █████╗  ██████╔╝██╔████╔██║██║██╔██╗ ██║███████║██║     
 ╚═══██╗██║   ██║   ██╔══╝     ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║██║██║╚██╗██║██╔══██║██║     
██████╔╝██║   ██║   ███████╗   ██║   ███████╗██║  ██║██║ ╚═╝ ██║██║██║ ╚████║██║  ██║███████╗
╚═════╝ ╚═╝   ╚═╝   ╚══════╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝
                                                                                          
SITE-TERMINAL v2.0 // CORE_INIT: SUCCESS // TYPE 'HELP' FOR COMMANDS
`
    },
  ]);

  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const commands = useMemo(
    () =>
      new Set([
        "help", "clear",
        "inspect", "status", "headers", "seo", "links", "robots", "sitemap",
        "headers-grade", "tls", "cors", "exposures", "securitytxt",
        "tech", "dns",
        "subdomains", "waf-detect", "wayback",
        "vulns", "shodan", "breach",
        "ssl-chain", "open-ports",
      ]),
    []
  );

  // Commands that take a domain (not a URL)
  const domainCommands = useMemo(() => new Set(["dns", "tls", "securitytxt", "subdomains", "wayback", "shodan", "breach", "ssl-chain", "open-ports"]), []);

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

    if (cmd === "clear") {
      setOut([{
        id: uid(),
        kind: "info",
        text: `
 ██████╗██╗████████╗███████╗████████╗███████╗██████╗ ███╗   ███╗██╗███╗   ██╗ █████╗ ██╗     
██╔════╝██║╚══██╔══╝██╔════╝╚══██╔══╝██╔════╝██╔══██╗████╗ ████║██║████╗  ██║██╔══██╗██║     
╚█████╗ ██║   ██║   █████╗     ██║   █████╗  ██████╔╝██╔████╔██║██║██╔██╗ ██║███████║██║     
 ╚═══██╗██║   ██║   ██╔══╝     ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║██║██║╚██╗██║██╔══██║██║     
██████╔╝██║   ██║   ███████╗   ██║   ███████╗██║  ██║██║ ╚═╝ ██║██║██║ ╚████║██║  ██║███████╗
╚═════╝ ╚═╝   ╚═╝   ╚══════╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝
                                                                                          
SITE-TERMINAL v2.0 // CORE_INIT: SUCCESS // TYPE 'HELP' FOR COMMANDS
`
      }]);
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
    <div className="w-full max-w-4xl mx-auto px-4 md:px-0">
      <div className="rounded-xl border border-zinc-800/50 bg-black/80 backdrop-blur-md shadow-2xl overflow-hidden relative">
        {/* Title bar */}
        <div className="px-5 py-4 border-b border-emerald-900/20 flex items-center justify-between bg-emerald-950/20 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-900 animate-pulse" />
              <div className="w-3 h-3 rounded-full bg-emerald-800" />
            </div>
            <div className="text-emerald-400 font-terminal text-lg tracking-widest glow-text">SHODAN-OS // SITE-TERMINAL v2.0</div>
          </div>
          <div className="text-emerald-900 font-terminal text-sm hidden sm:block">SYS_AUTH: ADMIN // ENCRYPTION: AES-256</div>
        </div>

        {/* Output */}
        <div className="p-6 h-[72vh] overflow-y-auto font-terminal text-xl crt-curve">
          {out.map((item) => (
            <pre
              key={item.id}
              className={`glow-text ${item.kind === "command"
                ? "text-zinc-100 opacity-90"
                : item.kind === "error"
                  ? "text-red-500"
                  : item.kind === "info"
                    ? "text-emerald-400"
                    : "text-emerald-300"
                }`}
              style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", marginBottom: "1rem" }}
            >
              {item.text}
            </pre>
          ))}

          {busy && (
            <div className="flex items-center gap-3 text-emerald-500 font-terminal text-xl glow-text">
              <span className="animate-bounce">_</span>
              <span className="animate-pulse">PROCESSING DATA...</span>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input area */}
        <div className="px-6 py-4 border-t border-emerald-900/20 flex items-center gap-3 font-terminal text-xl bg-emerald-950/10">
          <span className="text-emerald-600 shrink-0 glow-text">{PROMPT}</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            className="flex-1 bg-transparent outline-none text-emerald-400 placeholder:text-emerald-900/50 glow-text"
            placeholder="ENTER COMMAND"
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>
      </div>
      <div className="mt-4 text-center">
        <p className="text-emerald-900 font-terminal text-sm uppercase tracking-[0.2em]">Authorized Personnel Only // Private Security Suite</p>
      </div>
    </div>
  );
}
