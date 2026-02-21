# SiteTerminal

Terminal-style website inspector (public data only).  
No vulnerability scanning is performed.

## Run locally

```bash
npm install
npm run dev
```

Open: http://localhost:3000

## Commands

- help
- inspect <url>
- status <url>
- headers <url>
- seo <url>
- links <url>
- robots <url>
- sitemap <url>
- dns <domain>
- tls <domain>

## Security notes

Includes basic protections:
- Only http/https URLs
- SSRF protection by DNS resolution + blocked IP ranges
- Redirect limit (5)
- Timeout (10s)
- Response size cap (2MB)
- Simple per-IP rate limiting (30/min)
- 10 minute in-memory caching

For production, replace in-memory rate limit + cache with Redis.
