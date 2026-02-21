# SiteTerminal
SiteTerminal/
│
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   │
│   ├── api/
│   │   ├── inspect/
│   │   │   └── route.ts
│   │   ├── status/
│   │   │   └── route.ts
│   │   ├── headers/
│   │   │   └── route.ts
│   │   ├── seo/
│   │   │   └── route.ts
│   │   ├── links/
│   │   │   └── route.ts
│   │   ├── robots/
│   │   │   └── route.ts
│   │   ├── sitemap/
│   │   │   └── route.ts
│   │   ├── dns/
│   │   │   └── route.ts
│   │   └── tls/
│   │       └── route.ts
│   │
│   └── globals.css
│
├── components/
│   ├── Terminal.tsx
│   ├── CommandInput.tsx
│   ├── OutputBlock.tsx
│   ├── LoadingSpinner.tsx
│   └── Disclaimer.tsx
│
├── lib/
│   ├── validateUrl.ts
│   ├── ssrfProtection.ts
│   ├── fetchWithLimit.ts
│   ├── securityHeadersAudit.ts
│   ├── dnsUtils.ts
│   ├── tlsUtils.ts
│   ├── cache.ts
│   └── rateLimiter.ts
│
├── styles/
│   └── terminalTheme.ts
│
├── types/
│   └── api.ts
│
├── public/
│   └── favicon.ico
│
├── .env.local
├── .gitignore
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
├── package.json
└── README.md
