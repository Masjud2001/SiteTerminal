export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


// POST /api/logs  — called by Terminal after each command
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { command, target, success } = await req.json();
        if (!command || !target) return NextResponse.json({ error: "Missing fields." }, { status: 400 });

        await prisma.commandLog.create({
            data: {
                userId: (session.user as any).id,
                command: String(command).slice(0, 100),
                target: String(target).slice(0, 500),
                success: success !== false,
            },
        });

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message }, { status: 500 });
    }
}

// GET /api/logs  — user sees their own history
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const logs = await prisma.commandLog.findMany({
        where: { userId: (session.user as any).id },
        orderBy: { createdAt: "desc" },
        take: 50,
    });

    return NextResponse.json({ ok: true, logs });
}
