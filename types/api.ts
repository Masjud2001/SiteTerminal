export type ApiError = { ok: false; error: string };

export type StatusResult = {
  ok: true;
  inputUrl: string;
  finalUrl: string;
  status: number;
  redirects: Array<{ from: string; to: string; status: number }>;
  timingMs: number;
};

export type HeadersResult = {
  ok: true;
  url: string;
  status: number;
  headers: Record<string, string>;
  securityAudit: {
    score: number; // 0-100
    checks: Array<{ name: string; present: boolean; value?: string }>;
  };
};

export type SeoResult = {
  ok: true;
  url: string;
  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  og: Record<string, string>;
  twitter: Record<string, string>;
  headings: Array<{ tag: string; text: string }>;
};

export type LinksResult = {
  ok: true;
  url: string;
  internalCount: number;
  externalCount: number;
  sampleInternal: string[];
  sampleExternal: string[];
};

export type RobotsResult = {
  ok: true;
  url: string;
  robotsUrl: string;
  found: boolean;
  content: string | null;
  sitemaps: string[];
};

export type SitemapResult = {
  ok: true;
  url: string;
  sitemapUrl: string | null;
  discoveredFrom: "robots" | "common" | "none";
  urls: string[];
};

export type DnsResult = {
  ok: true;
  domain: string;
  records: {
    A: string[];
    AAAA: string[];
    CNAME: string[];
    MX: Array<{ exchange: string; priority: number }>;
    TXT: string[];
    NS: string[];
  };
};

export type TlsResult = {
  ok: true;
  domain: string;
  servername: string;
  port: number;
  subject?: Record<string, string>;
  issuer?: Record<string, string>;
  valid_from?: string;
  valid_to?: string;
  subjectaltname?: string;
};
