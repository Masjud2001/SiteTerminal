export function isValidHttpUrl(input: string): boolean {
  try {
    const u = new URL(input);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeUrl(input: string): string {
  const u = new URL(input);
  u.hash = "";
  return u.toString();
}

export function getDomain(input: string): string {
  const u = new URL(input);
  return u.hostname;
}
