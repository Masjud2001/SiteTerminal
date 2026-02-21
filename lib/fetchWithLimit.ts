import { assertSafeHostname } from "./ssrfProtection";

export type FetchResult = {
  finalUrl: string;
  status: number;
  headers: Headers;
  bodyText: string;
  redirects: Array<{ from: string; to: string; status: number }>;
  timingMs: number;
};

export async function fetchTextWithLimits(
  inputUrl: string,
  opts?: { timeoutMs?: number; maxBytes?: number; maxRedirects?: number; userAgent?: string }
): Promise<FetchResult> {
  const timeoutMs = opts?.timeoutMs ?? 10000;
  const maxBytes = opts?.maxBytes ?? 2_000_000;
  const maxRedirects = opts?.maxRedirects ?? 5;
  const userAgent = opts?.userAgent ?? "SiteTerminalBot/1.0 (+public-inspector)";

  const start = Date.now();
  let current = new URL(inputUrl);
  let redirects: Array<{ from: string; to: string; status: number }> = [];

  for (let i = 0; i <= maxRedirects; i++) {
    await assertSafeHostname(current.hostname);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let res: Response;
    try {
      res = await fetch(current.toString(), {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": userAgent,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });
    } finally {
      clearTimeout(timer);
    }

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get("location");
      if (!loc) break;
      const next = new URL(loc, current);
      redirects.push({ from: current.toString(), to: next.toString(), status: res.status });
      current = next;
      continue;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      const timingMs = Date.now() - start;
      return { finalUrl: current.toString(), status: res.status, headers: res.headers, bodyText: "", redirects, timingMs };
    }

    let received = 0;
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        received += value.byteLength;
        if (received > maxBytes) {
          controller.abort();
          throw new Error("Response too large (limit 2MB).");
        }
        chunks.push(value);
      }
    }

    const bodyText = new TextDecoder("utf-8").decode(concat(chunks));
    const timingMs = Date.now() - start;

    return { finalUrl: current.toString(), status: res.status, headers: res.headers, bodyText, redirects, timingMs };
  }

  throw new Error("Too many redirects.");
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, c) => sum + c.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}
