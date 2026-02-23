import tls from "tls";

export type TlsIssue = {
    severity: "critical" | "high" | "medium" | "low";
    message: string;
};

export type TlsAuditResult = {
    grade: string;
    score: number;
    domain: string;
    port: number;
    subject: object | null;
    issuer: object | null;
    valid_from: string | null;
    valid_to: string | null;
    subjectaltname: string | null;
    daysUntilExpiry: number | null;
    expired: boolean;
    selfSigned: boolean;
    signatureAlgorithm: string | null;
    tlsVersion: string | null;
    issues: TlsIssue[];
};

function certToTlsAudit(domain: string, port: number, cert: any, socket: tls.TLSSocket): TlsAuditResult {
    const issues: TlsIssue[] = [];
    let score = 100;

    // ── Expiry check ────────────────────────────────────────────────────────
    let daysUntilExpiry: number | null = null;
    let expired = false;
    const validTo = cert?.valid_to ?? null;
    if (validTo) {
        const expMs = new Date(validTo).getTime() - Date.now();
        daysUntilExpiry = Math.floor(expMs / (1000 * 60 * 60 * 24));
        if (daysUntilExpiry < 0) {
            expired = true;
            score -= 40;
            issues.push({ severity: "critical", message: `Certificate expired ${Math.abs(daysUntilExpiry)} day(s) ago` });
        } else if (daysUntilExpiry <= 7) {
            score -= 30;
            issues.push({ severity: "critical", message: `Certificate expires in ${daysUntilExpiry} day(s) — renew immediately` });
        } else if (daysUntilExpiry <= 30) {
            score -= 15;
            issues.push({ severity: "high", message: `Certificate expires in ${daysUntilExpiry} day(s) — renew soon` });
        } else if (daysUntilExpiry <= 90) {
            score -= 5;
            issues.push({ severity: "medium", message: `Certificate expires in ${daysUntilExpiry} day(s)` });
        }
    }

    // ── Self-signed check ────────────────────────────────────────────────────
    let selfSigned = false;
    const subject = cert?.subject ?? null;
    const issuer = cert?.issuer ?? null;
    if (subject && issuer) {
        const subjectStr = JSON.stringify(subject);
        const issuerStr = JSON.stringify(issuer);
        if (subjectStr === issuerStr) {
            selfSigned = true;
            score -= 30;
            issues.push({ severity: "high", message: "Self-signed certificate — not trusted by browsers" });
        }
    }

    // ── Signature algorithm ──────────────────────────────────────────────────
    const sigAlg: string | null = cert?.sigalg ?? null;
    if (sigAlg) {
        if (/md5/i.test(sigAlg)) {
            score -= 40;
            issues.push({ severity: "critical", message: `Weak signature algorithm: ${sigAlg} (MD5 is broken — replace immediately)` });
        } else if (/sha1/i.test(sigAlg) && !/sha1withrsaencryption/i.test(sigAlg)) {
            // Some certs report "sha1WithRSAEncryption" — still weak
            score -= 20;
            issues.push({ severity: "high", message: `Weak signature algorithm: ${sigAlg} (SHA-1 deprecated since 2017)` });
        } else if (/sha1/i.test(sigAlg)) {
            score -= 20;
            issues.push({ severity: "high", message: `Weak signature algorithm: SHA-1 deprecated — upgrade to SHA-256+` });
        }
    }

    // ── TLS protocol version ─────────────────────────────────────────────────
    const tlsVersion: string | null = (socket as any).getProtocol?.() ?? null;
    if (tlsVersion) {
        if (tlsVersion === "TLSv1" || tlsVersion === "TLSv1.0") {
            score -= 25;
            issues.push({ severity: "high", message: "TLS 1.0 enabled — deprecated since 2021, disable immediately" });
        } else if (tlsVersion === "TLSv1.1") {
            score -= 15;
            issues.push({ severity: "high", message: "TLS 1.1 enabled — deprecated since 2021, disable immediately" });
        } else if (tlsVersion === "TLSv1.2") {
            issues.push({ severity: "low", message: "TLS 1.2 enabled — acceptable, but TLS 1.3 preferred" });
        }
    }

    score = Math.max(0, Math.min(100, score));

    const grade =
        score >= 90 ? "A" :
            score >= 80 ? "B" :
                score >= 65 ? "C" :
                    score >= 50 ? "D" : "F";

    return {
        grade,
        score,
        domain,
        port,
        subject,
        issuer,
        valid_from: cert?.valid_from ?? null,
        valid_to: validTo,
        subjectaltname: cert?.subjectaltname ?? null,
        daysUntilExpiry,
        expired,
        selfSigned,
        signatureAlgorithm: sigAlg,
        tlsVersion,
        issues,
    };
}

export async function auditTls(domain: string, port = 443): Promise<TlsAuditResult> {
    return new Promise((resolve, reject) => {
        let socketRef: tls.TLSSocket | null = null;

        const socket = tls.connect(
            { host: domain, port, servername: domain, rejectUnauthorized: false, timeout: 10_000 },
            () => {
                try {
                    const cert = socket.getPeerCertificate(true);
                    const result = certToTlsAudit(domain, port, cert, socket);
                    socket.end();
                    resolve(result);
                } catch (e) {
                    socket.destroy();
                    reject(e);
                }
            }
        );

        socketRef = socket;
        socket.on("error", (e) => reject(e));
        socket.on("timeout", () => {
            socket.destroy();
            reject(new Error("TLS connection timed out"));
        });
    });
}
