import { PrismaClient } from "@prisma/client";

// ─── Lazy singleton ───────────────────────────────────────────────────────────
// PrismaClient is NEVER created at module-import time.
// It is only created on the first actual database call inside a request handler.
// This prevents Vercel's build step from crashing when DATABASE_URL is not set
// during static page-data collection.

const globalForPrisma = globalThis as unknown as { _prisma?: PrismaClient };

export function getPrisma(): PrismaClient {
    if (!globalForPrisma._prisma) {
        globalForPrisma._prisma = new PrismaClient({
            log:
                process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
        });
    }
    return globalForPrisma._prisma;
}

// Convenience re-export so existing `prisma.user.xxx` call-sites keep working
// without any changes — each property access defers to getPrisma().
export const prisma = new Proxy({} as PrismaClient, {
    get(_target, prop: string | symbol) {
        return (getPrisma() as any)[prop];
    },
});
