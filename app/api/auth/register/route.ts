export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";


export async function POST(req: NextRequest) {
    try {
        const { email, password, name } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase().trim();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
        }

        const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (existing) {
            return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
        }

        // First user ever becomes ADMIN
        const userCount = await prisma.user.count();
        const role = userCount === 0 ? "ADMIN" : "USER";

        const hashed = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: {
                email: normalizedEmail,
                name: name?.trim() || null,
                password: hashed,
                role,
            },
        });

        return NextResponse.json({
            ok: true,
            id: user.id,
            email: user.email,
            role: user.role,
            message: role === "ADMIN"
                ? "Admin account created — you are the first user."
                : "Account created successfully.",
        });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || "Registration failed." }, { status: 500 });
    }
}
