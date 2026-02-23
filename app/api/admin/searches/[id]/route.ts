import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { formatUid } from "@/lib/searchUid";

// GET /api/admin/searches/[id] — admin sees FULL details of a specific search
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const prisma = getPrisma();
    const idInt = parseInt(params.id);

    if (isNaN(idInt)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const record = await prisma.searchRecord.findUnique({
        where: { id: idInt },
        include: {
            user: { select: { email: true, name: true } }
        }
    });

    if (!record) return NextResponse.json({ error: "Record not found" }, { status: 404 });

    return NextResponse.json({
        ok: true,
        search: {
            ...record,
            uid: formatUid(record.id)
        }
    });
}
