import whois from "whois-json";

export async function lookupWhois(domain: string) {
    try {
        const data = await whois(domain);
        return data;
    } catch (error) {
        console.error("WHOIS Lookup Error:", error);
        return { error: "WHOIS lookup failed" };
    }
}
