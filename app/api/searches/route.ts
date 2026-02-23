export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { formatUid } from "@/lib/searchUid";

// POST /api/searches  — called by Terminal after each successful command
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { command, target, result } = await req.json();
        if (!command || !target) {
            return NextResponse.json({ error: "Missing fields." }, { status: 400 });
        }

        const prisma = getPrisma();
        const record = await prisma.searchRecord.create({
            data: {
                userId: (session.user as any).id,
                command: String(command).slice(0, 100),
                target: String(target).slice(0, 500),
                resultJson: JSON.stringify(result ?? {}),
            },
        });

        return NextResponse.json({ ok: true, uid: formatUid(record.id), id: record.id });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message }, { status: 500 });
    }
}

// GET /api/searches  — user sees their own search history
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const prisma = getPrisma();
    const records = await prisma.searchRecord.findMany({
        where: { userId: (session.user as any).id },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: { id: true, command: true, target: true, createdAt: true },
    });

    return NextResponse.json({
        ok: true,
        searches: records.map((r) => ({ ...r, uid: formatUid(r.id) })),
    });
}
