export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import tls from "tls";

/**
 * SSL/TLS Certificate Chain Analysis
 * Connects to the host and retrieves the full certificate chain.
 */

export async function GET(req: NextRequest): Promise<NextResponse> {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((session.user as any).role !== "ADMIN")
        return NextResponse.json({ error: "Admin access required." }, { status: 403 });

    const domain = req.nextUrl.searchParams.get("domain")?.trim().toLowerCase();
    if (!domain) return NextResponse.json({ error: "Missing domain parameter." }, { status: 400 });

    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

    return new Promise((resolve) => {
        try {
            const socket = tls.connect({
                host: cleanDomain,
                port: 443,
                servername: cleanDomain,
                rejectUnauthorized: false // We want to inspect even if invalid
            }, () => {
                const cert = socket.getPeerCertificate(true); // true to get the full chain
                if (!cert || Object.keys(cert).length === 0) {
                    socket.destroy();
                    resolve(NextResponse.json({ error: "No certificate found." }, { status: 404 }));
                    return;
                }

                const chain = [];
                let currentCert: any = cert;
                while (currentCert) {
                    chain.push({
                        subject: currentCert.subject,
                        issuer: currentCert.issuer,
                        valid_from: currentCert.valid_from,
                        valid_to: currentCert.valid_to,
                        serialNumber: currentCert.serialNumber,
                        fingerprint: currentCert.fingerprint,
                    });
                    currentCert = currentCert.issuerCertificate && currentCert.issuerCertificate !== currentCert
                        ? currentCert.issuerCertificate
                        : null;
                }

                socket.destroy();
                resolve(NextResponse.json({
                    ok: true,
                    domain: cleanDomain,
                    authorized: socket.authorized,
                    authorizationError: socket.authorizationError,
                    protocol: socket.getProtocol(),
                    cipher: socket.getCipher(),
                    chain
                }));
            });

            socket.on('error', (err) => {
                socket.destroy();
                resolve(NextResponse.json({ error: err.message }, { status: 500 }));
            });

            // Timeout after 10 seconds
            socket.setTimeout(10000, () => {
                socket.destroy();
                resolve(NextResponse.json({ error: "Connection timed out." }, { status: 504 }));
            });

        } catch (e: any) {
            resolve(NextResponse.json({ error: e?.message || "SSL check failed" }, { status: 500 }));
        }
    });
}
