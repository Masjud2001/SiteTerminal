export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


function requireAdmin(session: any) {
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return null;
}

// GET /api/admin/users
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const guard = requireAdmin(session);
    if (guard) return guard;

    const users = await prisma.user.findMany({
        orderBy: { createdAt: "asc" },
        select: {
            id: true, email: true, name: true, role: true, createdAt: true,
            _count: { select: { logs: true } },
        },
    });

    return NextResponse.json({ ok: true, users });
}

// PATCH /api/admin/users  — change role
export async function PATCH(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const guard = requireAdmin(session);
    if (guard) return guard;

    const { userId, role } = await req.json();
    if (!userId || !["USER", "ADMIN"].includes(role)) {
        return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    // Prevent self-demotion
    if (userId === (session!.user as any).id && role !== "ADMIN") {
        return NextResponse.json({ error: "You cannot demote yourself." }, { status: 400 });
    }

    const updated = await prisma.user.update({
        where: { id: userId },
        data: { role },
        select: { id: true, email: true, role: true },
    });

    return NextResponse.json({ ok: true, user: updated });
}

// DELETE /api/admin/users  — delete a user
export async function DELETE(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const guard = requireAdmin(session);
    if (guard) return guard;

    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "Missing userId." }, { status: 400 });

    if (userId === (session!.user as any).id) {
        return NextResponse.json({ error: "You cannot delete your own account from here." }, { status: 400 });
    }

    await prisma.user.delete({ where: { id: userId } });
    return NextResponse.json({ ok: true });
}
