export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { formatUid } from "@/lib/searchUid";


// GET /api/admin/searches  — admin sees ALL search records across all users
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const prisma = getPrisma();

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "500"), 2000);

    const records = await prisma.searchRecord.findMany({
        orderBy: { id: "desc" },
        take: limit,
        select: {
            id: true,
            command: true,
            target: true,
            createdAt: true,
            user: { select: { email: true, name: true } },
        },
    });

    return NextResponse.json({
        ok: true,
        searches: records.map((r) => ({ ...r, uid: formatUid(r.id) })),
    });
}
