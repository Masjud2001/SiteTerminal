"use client";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavBarProps = {
    user: { name?: string; email?: string; role?: string } | null;
};

export default function NavBar({ user }: NavBarProps) {
    const pathname = usePathname();
    const isAdmin = user?.role === "ADMIN";

    return (
        <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
                {/* Left: Logo */}
                <Link href="/" className="flex items-center gap-2.5 group">
                    <div className="w-7 h-7 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <span className="text-emerald-400 font-mono text-xs font-bold">&gt;_</span>
                    </div>
                    <span className="font-semibold text-zinc-200 group-hover:text-white transition-colors">SiteTerminal</span>
                </Link>

                {/* Right: Nav */}
                <div className="flex items-center gap-3">
                    {/* Terminal link */}
                    <Link
                        href="/"
                        className={`text-sm px-3 py-1.5 rounded-md transition-colors ${pathname === "/" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
                            }`}
                    >
                        Terminal
                    </Link>

                    {/* Local Inspector link */}
                    <Link
                        href="/inspector"
                        className={`text-sm px-3 py-1.5 rounded-md transition-colors ${pathname === "/inspector" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
                            }`}
                    >
                        Local Inspector
                    </Link>

                    {/* Admin link — only visible to admins */}
                    {isAdmin && (
                        <Link
                            href="/admin"
                            className={`text-sm px-3 py-1.5 rounded-md transition-colors ${pathname?.startsWith("/admin") ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
                                }`}
                        >
                            Admin
                        </Link>
                    )}

                    {/* Divider */}
                    <div className="w-px h-5 bg-zinc-800" />

                    {/* User badge */}
                    <div className="flex items-center gap-2">
                        <div className="text-right hidden sm:block">
                            <div className="text-xs font-medium text-zinc-300 leading-tight">
                                {user?.name || user?.email?.split("@")[0]}
                            </div>
                            <div className="text-[10px] leading-tight">
                                {isAdmin ? (
                                    <span className="text-amber-400 font-medium">Admin</span>
                                ) : (
                                    <span className="text-zinc-500">User</span>
                                )}
                            </div>
                        </div>

                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isAdmin ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            }`}>
                            {(user?.name || user?.email || "U")[0].toUpperCase()}
                        </div>
                    </div>

                    {/* Sign out */}
                    <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="text-xs text-zinc-500 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
                    >
                        Sign out
                    </button>
                </div>
            </div>
        </nav>
    );
}
