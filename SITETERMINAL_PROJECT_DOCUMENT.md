# SiteTerminal — Project Document

> **Document Date:** February 22, 2026  
> **Version:** 0.1.0  
> **Repository:** `Masjud2001/SiteTerminal`  
> **Stack:** Next.js 14 · TypeScript · Tailwind CSS · Node.js  

---

## Table of Contents

1. [What Is SiteTerminal?](#1-what-is-siteterminal)
2. [Why We Built It](#2-why-we-built-it)
3. [Architecture Overview](#3-architecture-overview)
4. [What We Built — Feature Breakdown](#4-what-we-built--feature-breakdown)
   - 4.1 [Terminal UI Component](#41-terminal-ui-component)
   - 4.2 [API Routes](#42-api-routes)
   - 4.3 [Security & Infrastructure Library](#43-security--infrastructure-library)
5. [Security Model](#5-security-model)
6. [Known Limitations (Current State)](#6-known-limitations-current-state)
7. [Future Roadmap](#7-future-roadmap)
   - 7.1 [Short-Term (Next Sprint)](#71-short-term-next-sprint)
   - 7.2 [Medium-Term (3 Months)](#72-medium-term-3-months)
   - 7.3 [Long-Term Vision (6–12 Months)](#73-long-term-vision-612-months)
8. [Tech Debt & Refactoring Notes](#8-tech-debt--refactoring-notes)
9. [Deployment Notes](#9-deployment-notes)

---

## 1. What Is SiteTerminal?

**SiteTerminal** is a terminal-style, browser-based website inspector. It lets users type commands into a hacker-aesthetic terminal interface and get back **publicly available** diagnostic data about any website or domain — instantly, without installing anything.

Think of it as a lightweight, privacy-safe alternative to running `curl`, `dig`, `nslookup`, or online SEO tools — all unified under a single clean terminal window running in a Next.js web application.

> **Core principle:** SiteTerminal only fetches public data. It does NOT perform vulnerability scanning, exploit detection, or any form of penetration testing.

---

## 2. Why We Built It

Developers, site owners, and tech-savvy users often need quick answers to questions like:

- *"Is my site returning the right HTTP status code?"*
- *"Do I have the correct security headers set?"*
- *"What does my DNS look like right now?"*
- *"Is my TLS certificate still valid?"*
- *"Does my robots.txt or sitemap.xml look correct?"*

Normally you'd need multiple tools, browser extensions, or command-line utilities. SiteTerminal brings all of these into one clean, zero-setup interface — accessible from any browser.

---

## 3. Architecture Overview

```
[ Browser ]
     │
     ▼
[ Next.js App (app/page.tsx) ]
     │
     ▼
[ Terminal Component (components/Terminal.tsx) ]
     │   ← user types a command (e.g. "inspect https://example.com")
     │
     ▼
[ Next.js API Routes (app/api/<command>/route.ts) ]
     │
     ├── /api/inspect    → full site overview
     ├── /api/status     → HTTP status code check
     ├── /api/headers    → raw HTTP response headers
     ├── /api/seo        → meta title, description, canonical, OG tags
     ├── /api/links      → all anchor links on the page
     ├── /api/robots     → robots.txt content
     ├── /api/sitemap    → sitemap.xml content
     ├── /api/dns        → DNS records (A, AAAA, MX, TXT, NS, CNAME)
     └── /api/tls        → TLS/SSL certificate info
          │
          ▼
[ lib/ — shared utilities ]
     ├── apiGuards.ts          → rate limiting + URL param validation
     ├── cache.ts              → in-memory TTL cache (10 min)
     ├── dnsUtils.ts           → DNS lookup utility
     ├── fetchWithLimit.ts     → safe HTTP fetcher with timeout, size, redirect limits
     ├── rateLimiter.ts        → per-IP sliding window rate limiter
     ├── securityHeadersAudit.ts → security header presence checker + score
     ├── ssrfProtection.ts     → SSRF guard (blocks private IP ranges)
     ├── tlsUtils.ts           → TLS certificate inspector
     └── validateUrl.ts        → URL validation + normalization
```

---

## 4. What We Built — Feature Breakdown

### 4.1 Terminal UI Component

**File:** `components/Terminal.tsx`

The core user-facing interface is a React client component styled to look like a real terminal window:

| Feature | Details |
|---|---|
| **Command input** | Monospace input at the bottom with a `user@siteterminal:~$` prompt |
| **Output display** | Color-coded output: white for commands, green for results, red for errors, emerald for info |
| **Command history** | Arrow Up / Arrow Down to cycle through past commands (like a real terminal) |
| **Auto-scroll** | Output automatically scrolls to the latest line |
| **Busy state indicator** | Shows `running…` while the API call is in-flight |
| **Help command** | Built-in `help` lists all available commands |
| **Error handling** | Unknown commands and missing arguments show descriptive error messages |

**Supported commands:**
```
help
inspect  <url>
status   <url>
headers  <url>
seo      <url>
links    <url>
robots   <url>
sitemap  <url>
dns      <domain>
tls      <domain>
```

---

### 4.2 API Routes

Each command maps to a dedicated **Next.js App Router API route** under `app/api/`. Every route follows the same pattern:
1. Enforce rate limiting (reject if > 30 req/min from same IP)
2. Validate & normalize the URL/domain parameter
3. Check in-memory cache (return instantly if hit)
4. Perform the actual operation (fetch, DNS lookup, TLS handshake)
5. Cache the result for 10 minutes
6. Return JSON

| Route | What It Does |
|---|---|
| `/api/inspect` | Full overview: HTTP status, redirect chain, timing, page title, meta description, link count, security header audit score, and tech-stack hints (WordPress, Next.js, Shopify, etc.) |
| `/api/status` | HTTP status code and final URL after redirects |
| `/api/headers` | All raw HTTP response headers returned by the server |
| `/api/seo` | SEO metadata: `<title>`, meta description, canonical URL, Open Graph tags |
| `/api/links` | All `<a href>` links found on the page |
| `/api/robots` | Raw content of the site's `robots.txt` file |
| `/api/sitemap` | Raw content of the site's `sitemap.xml` file |
| `/api/dns` | DNS records: A, AAAA, CNAME, MX, TXT, NS |
| `/api/tls` | TLS/SSL certificate details: issuer, subject, expiry, validity dates |

---

### 4.3 Security & Infrastructure Library

**Directory:** `lib/`

We built a dedicated library of shared utilities powering all nine API routes:

#### `fetchWithLimit.ts` — Safe HTTP Fetcher
- Configurable **timeout** (default: 10 seconds)  
- **Response size cap** (default: 2 MB) — prevents memory exhaustion attacks  
- **Redirect limit** (default: 5 redirects) — prevents redirect loops  
- Custom **User-Agent** header: `SiteTerminalBot/1.0 (+public-inspector)`  
- Tracks the full **redirect chain** (from → to → status) for display  
- Measures **timing in milliseconds**  
- SSRF check is run at EVERY redirect hop (not just the first URL)

#### `ssrfProtection.ts` — SSRF Guard
Prevents the server from being used to probe internal services. Blocks:
- `localhost` and `*.localhost`  
- IPv4 private ranges: `127.x`, `10.x`, `172.16–31.x`, `192.168.x`, `169.254.x`, CGNAT `100.64.x`, multicast  
- IPv6 private ranges: `::1`, `fc00::/7`, `fe80::/10`, multicast `ff00::/8`  
- Uses actual **DNS resolution** to check IPs — not just string matching (prevents DNS rebinding bypass)

#### `rateLimiter.ts` — Per-IP Rate Limiter
- Sliding window: **30 requests per 60 seconds** per IP  
- Returns `X-RateLimit-Remaining` and `X-RateLimit-Reset` response headers  
- HTTP 429 when exceeded  
- In-memory Map (no Redis dependency for now)

#### `cache.ts` — In-Memory TTL Cache
- Simple key-value store with expiry timestamps  
- Default TTL: **10 minutes** per result  
- Prevents hammering the same target site repeatedly  

#### `securityHeadersAudit.ts` — Security Header Scorer
Checks for the presence of 6 critical HTTP security headers and returns a score out of 100:
- `Content-Security-Policy`
- `Strict-Transport-Security`
- `X-Frame-Options`
- `X-Content-Type-Options`
- `Referrer-Policy`
- `Permissions-Policy`

#### `dnsUtils.ts` — DNS Lookup
Runs parallel DNS queries for: `A`, `AAAA`, `CNAME`, `MX`, `TXT`, `NS` records using Node's `dns/promises`.

#### `tlsUtils.ts` — TLS Inspector
Opens a raw TLS socket to port 443, retrieves the full peer certificate chain, then closes the connection. Works even if the certificate is self-signed (`rejectUnauthorized: false` for inspection purposes).

#### `apiGuards.ts` — Request Guards
Central place for:
- Extracting client IP (respects `X-Forwarded-For` for proxies/Vercel)
- Enforcing rate limits in one call
- Validating and normalizing URL/domain query parameters

#### `validateUrl.ts` — URL Validation & Normalization
- Ensures URLs start with `http://` or `https://`  
- Rejects non-HTTP protocols (no `file://`, `ftp://`, etc.)  
- Normalizes the URL before use

---

## 5. Security Model

SiteTerminal is designed to be safely exposed to the public internet. The security posture:

| Threat | Mitigation |
|---|---|
| **SSRF attacks** | DNS resolution check + blocked private IP ranges (IPv4 + IPv6) |
| **DNS rebinding** | SSRF check runs after every redirect, not just on the first URL |
| **Memory exhaustion** | 2 MB response size cap, stream-based reading |
| **Timeout / CPU exhaustion** | 10-second per-request timeout with AbortController |
| **Redirect loops** | Maximum 5 redirects enforced |
| **Abuse / DDoS** | Per-IP rate limit: 30 requests/minute |
| **Cache stampede** | 10-minute cache prevents repeated requests to the same URL |
| **Protocol confusion** | Only `http://` and `https://` URLs are accepted |
| **Vulnerability scanning** | No exploit checks, port scans, or auth bypass attempts — by design |

---

## 6. Known Limitations (Current State)

These are known limitations of the current v0.1.0:

1. **In-memory rate limiter** — state is lost on server restart; not shared across multiple server instances. Fine for single-instance deployments, not for horizontally scaled production.
2. **In-memory cache** — same issue as above. Works well locally, unsuitable for multi-instance deployment.
3. **No persistent history** — command history lives only in React state; cleared on page refresh.
4. **No authentication or user accounts** — it's fully anonymous and public.
5. **No export feature** — output can only be read/copied manually.
6. **Tech-stack detection is basic** — only identifies WordPress, Next.js, and Shopify. Many more fingerprints could be added.
7. **TLS cert info is raw** — returned as a raw certificate object, not formatted for human readability.
8. **No mobile-optimized layout** — the terminal is functional on mobile but not specifically designed for small screens.
9. **No dark/light mode toggle** — currently fixed to dark terminal theme only.
10. **No keyboard shortcut to clear the terminal** — (e.g. `Ctrl+L` or a `clear` command).

---

## 7. Future Roadmap

### 7.1 Short-Term (Next Sprint)

These are quick wins and bug fixes that should be done immediately:

- [ ] **Add `clear` command** — clears the terminal output (`Ctrl+L` support too)
- [ ] **Add `whois` command** — query WHOIS registration data for a domain
- [ ] **Improve TLS output formatting** — display issuer, subject, valid-from, valid-to, SANs in a clean human-readable format instead of raw certificate object
- [ ] **Better tech detection** — expand fingerprinting to detect: Wix, Squarespace, Webflow, Cloudflare, Vercel, AWS, Gatsby, Nuxt, Angular, React, Vue, Laravel, Django, Rails
- [ ] **Add `ping` command (HTTP)** — measure latency to a URL across multiple attempts
- [ ] **Mobile layout improvements** — make the terminal usable on phones (larger touch targets, better font scaling)
- [ ] **Favicon in browser tab** — add a terminal-icon favicon
- [ ] **Add `open <url>` command** — opens the inspected URL in a new tab from within the terminal

---

### 7.2 Medium-Term (3 Months)

Feature additions that significantly increase the value of the tool:

- [ ] **Redis-backed rate limiter & cache** — replace in-memory state with Redis for production-ready, multi-instance support
- [ ] **Session history persistence** — store command history in `localStorage` so it persists across page refreshes
- [ ] **Export output** — add a button to copy or download the current terminal session as `.txt` or `.json`
- [ ] **Shareable links** — generate a URL like `/s/abc123` that lets others see a snapshot of an inspection (store results in a database)
- [ ] **`screenshot` command** — use a headless browser (Playwright/Puppeteer) to capture a screenshot of a URL and display it in the terminal output
- [ ] **`perf` command** — measure Core Web Vitals or simple page load metrics
- [ ] **`redirect-chain` command** — clearly visualize the full redirect chain with each hop's status code
- [ ] **`headers-grade` command** — give a letter grade (A+/B/C/F) based on security headers, with detailed explanations
- [ ] **`carbon` mode** — display output in a stylized code-block for easy sharing on social media
- [ ] **Dark/light theme toggle** — let users switch between dark terminal mode and a light IDE-style mode
- [ ] **Keyboard shortcuts panel** — show available shortcuts (history navigation, clear, etc.) in a help overlay
- [ ] **Improved error messages** — categorize errors (DNS failure, timeout, blocked, invalid) with actionable suggestions

---

### 7.3 Long-Term Vision (6–12 Months)

These features transform SiteTerminal from a dev tool into a full platform:

- [ ] **User Accounts & Dashboard** — allow users to sign up, save sites, and track them over time
- [ ] **Site Monitoring (Scheduled Checks)** — let users register a URL and get alerts when status changes, TLS expires soon, or headers change. Think uptime monitoring as a feature, not a product.
- [ ] **Historical Snapshots** — store inspection results over time so users can see how a site changes
- [ ] **Team Workspaces** — share inspection results and reports within a team
- [ ] **API Access** — expose SiteTerminal's checks as a public or authenticated REST/JSON API for developers to integrate into their own tools
- [ ] **CLI tool** — publish an `npm` package (`npx siteterminal inspect https://example.com`) that mirrors the web tool from the command line
- [ ] **Browser Extension** — a Chrome/Firefox extension that shows SiteTerminal data for the currently active tab in a sidebar
- [ ] **Bulk inspect** — paste a list of URLs and inspect all of them, with a summary table of results
- [ ] **AI-powered analysis** — integrate an LLM to provide natural-language summaries and recommendations based on inspection results (e.g. "Your security headers score is 33%. Here's what to add and why.")
- [ ] **Plugin system** — allow community-contributed inspection modules (e.g. accessibility check, cookie audit, GDPR compliance check, performance budget)
- [ ] **Internationalization (i18n)** — translate the UI and output into multiple languages

---

## 8. Tech Debt & Refactoring Notes

| Area | Issue | Suggested Fix |
|---|---|---|
| **Rate limiter** | In-memory, single-instance only | Replace with Redis (`ioredis`) + sliding window Lua script |
| **Cache** | In-memory, not shared across instances | Replace with Redis cache with same TTL |
| **TLS output** | Raw Node.js cert object returned as-is | Write a `formatCert()` utility to extract and display key fields |
| **`app/api/*/route.ts` pattern** | All routes repeat the same guard + cache + error pattern | Extract a `withGuards(handler)` higher-order function to reduce boilerplate |
| **No test coverage** | Zero unit or integration tests | Add Vitest + `msw` (Mock Service Worker) for API route tests |
| **No CI/CD** | No automated build or deployment pipeline | Add GitHub Actions: lint → build → test on every PR |
| **`cheerio` dependency** | Heavy for just parsing HTML | Consider keeping for now; worth revisiting if bundle size becomes an issue |

---

## 9. Deployment Notes

### Running Locally

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Open in browser
# http://localhost:3000
```

### Production Build

```bash
npm run build
npm run start
```

### Recommended Production Setup

| Concern | Recommendation |
|---|---|
| **Hosting** | Vercel (zero-config Next.js deployment) or any Node.js server |
| **Rate limiting** | Replace `lib/rateLimiter.ts` with Redis-backed solution |
| **Caching** | Replace `lib/cache.ts` with Redis |
| **Environment variables** | Add `REDIS_URL`, `NODE_ENV` |
| **Custom domain** | Point to Vercel or self-hosted instance |
| **HTTPS** | Enforced by Vercel automatically; self-hosted requires Nginx/Caddy with TLS |

---

*Document prepared: February 22, 2026*  
*Author: SiteTerminal Development Team*  
*Repository: `Masjud2001/SiteTerminal`*
