type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(
  ip: string,
  max: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const b = buckets.get(ip);

  if (!b || now > b.resetAt) {
    const next: Bucket = { count: 1, resetAt: now + windowMs };
    buckets.set(ip, next);
    return { allowed: true, remaining: max - 1, resetAt: next.resetAt };
  }

  if (b.count >= max) {
    return { allowed: false, remaining: 0, resetAt: b.resetAt };
  }

  b.count += 1;
  buckets.set(ip, b);
  return { allowed: true, remaining: max - b.count, resetAt: b.resetAt };
}
