export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { formatUid } from "@/lib/searchUid";


// GET /api/admin/export?filter=all|command|user
// Returns a CSV file of all search records
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const prisma = getPrisma();

    const { searchParams } = new URL(req.url);
    const commandFilter = searchParams.get("command") || undefined;
    const userFilter = searchParams.get("userId") || undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "10000"), 50000);

    const records = await prisma.searchRecord.findMany({
        where: {
            ...(commandFilter ? { command: commandFilter } : {}),
            ...(userFilter ? { userId: userFilter } : {}),
        },
        orderBy: { id: "asc" },
        take: limit,
        include: { user: { select: { email: true, name: true } } },
    });

    // ── Build CSV ─────────────────────────────────────────────────────────────
    const escape = (v: unknown) => {
        const s = String(v ?? "").replace(/"/g, '""');
        return `"${s}"`;
    };

    const headers = ["UID", "Timestamp (UTC)", "User Email", "User Name", "Command", "Target", "Result JSON"];
    const rows = records.map((r) => [
        escape(formatUid(r.id)),
        escape(r.createdAt.toISOString()),
        escape(r.user.email),
        escape(r.user.name ?? ""),
        escape(r.command),
        escape(r.target),
        escape(r.resultJson),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    const filename = `siteterminal-searches-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
        status: 200,
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "no-store",
        },
    });
}
