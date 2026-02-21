import dns from "dns/promises";
import ipaddr from "ipaddr.js";

const BLOCKED_V4: Array<[string, number]> = [
  ["127.0.0.0", 8],
  ["10.0.0.0", 8],
  ["172.16.0.0", 12],
  ["192.168.0.0", 16],
  ["169.254.0.0", 16],
  ["0.0.0.0", 8],
  ["100.64.0.0", 10],
  ["224.0.0.0", 4],
];

const BLOCKED_V6: string[] = ["::1", "fc00::", "fe80::"];

function inCidr(ip: ipaddr.IPv4 | ipaddr.IPv6, base: string, prefix: number): boolean {
  const parsedBase = ipaddr.parse(base);
  return ip.match([parsedBase, prefix]);
}

export async function assertSafeHostname(hostname: string) {
  const lower = hostname.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".localhost")) {
    throw new Error("Blocked hostname.");
  }

  const resolved = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!resolved.length) throw new Error("Could not resolve hostname.");

  for (const r of resolved) {
    const ip = ipaddr.parse(r.address);

    if (ip.kind() === "ipv4") {
      for (const [base, prefix] of BLOCKED_V4) {
        if (inCidr(ip, base, prefix)) throw new Error("Blocked IP range.");
      }
    }

    if (ip.kind() === "ipv6") {
      for (const base of BLOCKED_V6) {
        const parsedBase = ipaddr.parse(base);
        const prefix = base === "fc00::" ? 7 : base === "fe80::" ? 10 : 128;
        if (ip.match([parsedBase, prefix])) throw new Error("Blocked IP range.");
      }
      const ff = ipaddr.parse("ff00::");
      if (ip.match([ff, 8])) throw new Error("Blocked IP range.");
    }
  }
}
