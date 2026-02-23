import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const [totalUsers, totalCommands, adminCount, recentLogs, topCommands] = await Promise.all([
        prisma.user.count(),
        prisma.commandLog.count(),
        prisma.user.count({ where: { role: "ADMIN" } }),
        prisma.commandLog.findMany({
            orderBy: { createdAt: "desc" },
            take: 20,
            include: { user: { select: { email: true, name: true } } },
        }),
        prisma.commandLog.groupBy({
            by: ["command"],
            _count: { command: true },
            orderBy: { _count: { command: "desc" } },
            take: 10,
        }),
    ]);

    return NextResponse.json({
        ok: true,
        stats: {
            totalUsers,
            totalCommands,
            adminCount,
            regularUserCount: totalUsers - adminCount,
        },
        recentLogs,
        topCommands: topCommands.map((c) => ({ command: c.command, count: c._count.command })),
    });
}
