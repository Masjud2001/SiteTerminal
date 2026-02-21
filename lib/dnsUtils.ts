import dns from "dns/promises";

export async function lookupDns(domain: string) {
  const [A, AAAA, CNAME, MX, TXT, NS] = await Promise.allSettled([
    dns.resolve4(domain),
    dns.resolve6(domain),
    dns.resolveCname(domain),
    dns.resolveMx(domain),
    dns.resolveTxt(domain),
    dns.resolveNs(domain),
  ]);

  return {
    A: A.status === "fulfilled" ? A.value : [],
    AAAA: AAAA.status === "fulfilled" ? AAAA.value : [],
    CNAME: CNAME.status === "fulfilled" ? CNAME.value : [],
    MX: MX.status === "fulfilled" ? MX.value : [],
    TXT: TXT.status === "fulfilled" ? TXT.value.flat().map(String) : [],
    NS: NS.status === "fulfilled" ? NS.value : [],
  };
}
