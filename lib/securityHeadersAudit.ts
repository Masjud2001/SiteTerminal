const CHECKS = [
  "content-security-policy",
  "strict-transport-security",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
] as const;

export function auditSecurityHeaders(headers: Record<string, string>) {
  const checks = CHECKS.map((name) => {
    const v = headers[name] ?? headers[name.toLowerCase()];
    return { name, present: Boolean(v), value: v };
  });

  const presentCount = checks.filter((c) => c.present).length;
  const score = Math.round((presentCount / CHECKS.length) * 100);

  return { score, checks };
}
