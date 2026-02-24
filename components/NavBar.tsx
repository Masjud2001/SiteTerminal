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
        <nav className="w-full border-b border-[#00ff41]/10 bg-black/60 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                {/* Left: Logo */}
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="w-8 h-8 rounded-sm bg-[#00ff41]/5 border border-[#00ff41]/30 flex items-center justify-center transition-all group-hover:border-[#00ff41] group-hover:shadow-[0_0_10px_rgba(0,255,65,0.2)]">
                        <span className="text-[#00ff41] font-mono text-sm font-bold">&gt;_</span>
                    </div>
                    <span className="font-mono text-lg font-black tracking-tighter text-[#00ff41] glow-text transition-all uppercase">SiteTerminal</span>
                </Link>

                {/* Right: Nav */}
                <div className="flex items-center gap-6">
                    <div className="hidden md:flex items-center gap-4">
                        <Link
                            href="/"
                            className={`text-[10px] uppercase tracking-[0.2em] transition-all hover:text-[#00ff41] ${pathname === "/" ? "text-[#00ff41] font-bold" : "text-[#00ff41]/40"
                                }`}
                        >
                            [ TERMINAL ]
                        </Link>

                        <Link
                            href="/inspector"
                            className={`text-[10px] uppercase tracking-[0.2em] transition-all hover:text-[#00ff41] ${pathname === "/inspector" ? "text-[#00ff41] font-bold" : "text-[#00ff41]/40"
                                }`}
                        >
                            [ INSPECTOR ]
                        </Link>

                        {isAdmin && (
                            <Link
                                href="/admin"
                                className={`text-[10px] uppercase tracking-[0.2em] transition-all hover:text-[#00ff41] ${pathname?.startsWith("/admin") ? "text-[#00ff41] font-bold" : "text-[#00ff41]/40"
                                    }`}
                            >
                                [ ADMIN_CORE ]
                            </Link>
                        )}
                    </div>

                    <div className="w-px h-6 bg-[#00ff41]/10 mx-2" />

                    {/* User Profile */}
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <div className="text-[10px] uppercase tracking-wider text-[#00ff41]/80 font-mono">
                                {user?.name || user?.email?.split("@")[0]}
                            </div>
                            <div className="text-[8px] tracking-[0.3em] font-mono text-[#00ff41]/30 uppercase">
                                {isAdmin ? "Clearance: L4" : "Clearance: L1"}
                            </div>
                        </div>

                        <div className={`w-9 h-9 border border-[#00ff41]/20 bg-[#00ff41]/5 flex items-center justify-center text-[10px] font-mono font-black ${isAdmin ? "text-amber-400 border-amber-500/30" : "text-[#00ff41] border-[#00ff41]/30"
                            }`}>
                            {(user?.name || user?.email || "U")[0].toUpperCase()}
                        </div>

                        <button
                            onClick={() => signOut({ callbackUrl: "/login" })}
                            className="p-2 text-[#00ff41]/30 hover:text-red-500 transition-all hover:bg-red-500/5 rounded-sm"
                            title="Abort Session"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
                                <path d="M112,40a8,8,0,0,0-8,8V208a8,8,0,0,0,16,0V48A8,8,0,0,0,112,40Zm109.66,82.34-40-40a8,8,0,0,0-11.32,11.32L204.69,128l-34.35,34.34a8,8,0,0,0,11.32,11.32l40-40A8,8,0,0,0,221.66,122.34ZM48,128a8,8,0,0,1-8,8H16a8,8,0,0,1,0-16H40A8,8,0,0,1,48,128Z"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
