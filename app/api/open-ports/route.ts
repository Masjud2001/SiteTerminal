export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import net from "net";

/**
 * Passive Port Discovery
 * Checks common ports on the target host.
 */

const COMMON_PORTS = [
    { port: 21, service: "FTP" },
    { port: 22, service: "SSH" },
    { port: 23, service: "Telnet" },
    { port: 25, service: "SMTP" },
    { port: 53, service: "DNS" },
    { port: 80, service: "HTTP" },
    { port: 110, service: "POP3" },
    { port: 143, service: "IMAP" },
    { port: 443, service: "HTTPS" },
    { port: 445, service: "SMB" },
    { port: 3306, service: "MySQL" },
    { port: 3389, service: "RDP" },
    { port: 5432, service: "PostgreSQL" },
    { port: 8080, service: "HTTP-Alt" },
    { port: 8443, service: "HTTPS-Alt" },
];

async function checkPort(host: string, port: number, timeout = 2000): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        let status = false;

        socket.setTimeout(timeout);
        socket.once('connect', () => {
            status = true;
            socket.destroy();
        });
        socket.once('timeout', () => {
            socket.destroy();
        });
        socket.once('error', () => {
            socket.destroy();
        });
        socket.once('close', () => {
            resolve(status);
        });

        socket.connect(port, host);
    });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((session.user as any).role !== "ADMIN")
        return NextResponse.json({ error: "Admin access required." }, { status: 403 });

    const domain = req.nextUrl.searchParams.get("domain")?.trim().toLowerCase();
    if (!domain) return NextResponse.json({ error: "Missing domain parameter." }, { status: 400 });

    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

    try {
        const results = await Promise.all(
            COMMON_PORTS.map(async (p) => ({
                port: p.port,
                service: p.service,
                open: await checkPort(cleanDomain, p.port)
            }))
        );

        const openPorts = results.filter(r => r.open);

        return NextResponse.json({
            ok: true,
            domain: cleanDomain,
            totalChecked: COMMON_PORTS.length,
            openCount: openPorts.length,
            ports: results,
        });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || "Port scan failed" }, { status: 500 });
    }
}
