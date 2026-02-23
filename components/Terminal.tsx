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

// Map command → pretty formatter (fallback = raw JSON)
const FORMATTERS: Record<string, (d: any) => string> = {
  "headers-grade": fmtHeadersGrade,
  tls: fmtTls,
  exposures: fmtExposures,
  securitytxt: fmtSecurityTxt,
  cors: fmtCors,
  tech: fmtTech,
  inspect: fmtInspect,
};

// ── help text ────────────────────────────────────────────────────────────────

const HELP_TEXT = `
╔══════════════════════════════════════════════════════════════╗
║                 SiteTerminal — Command Reference             ║
╚══════════════════════════════════════════════════════════════╝

── Core Inspection ─────────────────────────────────────────────
  inspect  <url>          Full site overview (status, SEO, tech, security)
  status   <url>          HTTP status code & redirect chain
  headers  <url>          Raw HTTP response headers + security audit
  seo      <url>          Meta title, description, canonical, OG tags
  links    <url>          All <a href> links on the page

── Security Analysis ────────────────────────────────────────────
  headers-grade <url>     Deep security header audit with grade (A–F)
  tls           <domain>  TLS/SSL certificate audit — grade, expiry, weaknesses
  cors          <url>     CORS misconfiguration check
  exposures     <url>     Sensitive file & path exposure check (25 paths)
  securitytxt   <domain>  Check for RFC 9116 security.txt

── Technology ───────────────────────────────────────────────────
  tech     <url>          Full tech fingerprint — 35+ patterns, outdated libs

── DNS & Network ────────────────────────────────────────────────
  dns      <domain>       DNS records (A, AAAA, MX, TXT, NS, CNAME)
  robots   <url>          robots.txt content
  sitemap  <url>          sitemap.xml content

── Terminal ─────────────────────────────────────────────────────
  help                    Show this help
  clear                   Clear the terminal

All commands only fetch publicly available data.
No vulnerability exploitation or active scanning is performed.
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
        "help", "clear",
        "inspect", "status", "headers", "seo", "links", "robots", "sitemap",
        "headers-grade", "tls", "cors", "exposures", "securitytxt",
        "tech", "dns",
      ]),
    []
  );

  // Commands that take a domain (not a URL)
  const domainCommands = useMemo(() => new Set(["dns", "tls", "securitytxt"]), []);

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
