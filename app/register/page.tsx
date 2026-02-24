"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");

        if (password !== confirm) {
            setError("VALIDATION_ERROR: PASSWORDS_DO_NOT_MATCH");
            return;
        }

        setLoading(true);
        const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();
        setLoading(false);

        if (!res.ok) {
            setError(data.error || "REGISTRATION_FAILED: SYSTEM_REJECTION");
        } else {
            router.push("/login?registered=1");
        }
    }

    return (
        <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4 selection:bg-[#00ff41] selection:text-black font-mono">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 terminal-grid pointer-events-none" />
                <div className="scanline" />
                <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black opacity-60" />
            </div>

            <div className="relative z-10 w-full max-w-md my-12">
                {/* Brand */}
                <div className="text-center mb-10">
                    <div className="relative group inline-block mb-4">
                        <div className="w-16 h-16 rounded-sm bg-[#00ff41]/5 border border-[#00ff41]/30 flex items-center justify-center transition-all group-hover:border-[#00ff41] group-hover:shadow-[0_0_15px_rgba(0,255,65,0.2)]">
                            <span className="text-[#00ff41] text-2xl font-black">&gt;_</span>
                        </div>
                        <div className="absolute -inset-2 bg-[#00ff41]/10 blur-xl rounded-full opacity-50" />
                    </div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter text-[#00ff41] glow-text glitch" data-text="REGISTER">
                        Register
                    </h1>
                    <div className="mt-2 text-[#00ff41]/40 text-[10px] uppercase tracking-[0.3em]">
                        New Entity Entry // SiteTerminal v2.0
                    </div>
                </div>

                <div className="relative">
                    {/* Decorative corners */}
                    <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-[#00ff41] z-20" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-[#00ff41] z-20" />
                    <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-[#00ff41] z-20" />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-[#00ff41] z-20" />

                    <div className="bg-black/60 backdrop-blur-md border border-[#00ff41]/20 p-8 shadow-[0_0_30px_rgba(0,255,65,0.05)]">
                        {/* First-user notice */}
                        <div className="mb-6 px-4 py-3 bg-[#00ff41]/5 border border-[#00ff41]/20 text-[#00ff41] text-[9px] uppercase tracking-widest leading-none">
                            <span className="font-bold text-amber-400">[ NOTICE ]</span> FIRST REGISTERED ACCOUNT GRANTED ADMIN CLEARANCE.
                        </div>

                        {error && (
                            <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] uppercase tracking-widest font-bold">
                                [ ERROR ] {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[10px] uppercase tracking-[0.2em] text-[#00ff41]/60 mb-1.5" htmlFor="name">
                                    Entity_Alias <span className="text-[#00ff41]/20">(Optional)</span>
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-4 py-2 bg-[#00ff41]/5 border border-[#00ff41]/20 text-[#00ff41] placeholder:text-[#00ff41]/10 focus:outline-none focus:border-[#00ff41]/60 transition-all text-sm"
                                    placeholder="OPERATOR_NAME"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] uppercase tracking-[0.2em] text-[#00ff41]/60 mb-1.5" htmlFor="reg-email">
                                    Identity / Email
                                </label>
                                <input
                                    id="reg-email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-2 bg-[#00ff41]/5 border border-[#00ff41]/20 text-[#00ff41] placeholder:text-[#00ff41]/10 focus:outline-none focus:border-[#00ff41]/60 transition-all text-sm"
                                    placeholder="USER_ID@SITETERMINAL.SEC"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] uppercase tracking-[0.2em] text-[#00ff41]/60 mb-1.5" htmlFor="reg-password">
                                    Access_Key / Password
                                </label>
                                <input
                                    id="reg-password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-2 bg-[#00ff41]/5 border border-[#00ff41]/20 text-[#00ff41] placeholder:text-[#00ff41]/10 focus:outline-none focus:border-[#00ff41]/60 transition-all text-sm"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] uppercase tracking-[0.2em] text-[#00ff41]/60 mb-1.5" htmlFor="confirm">
                                    Confirm_Key
                                </label>
                                <input
                                    id="confirm"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    className="w-full px-4 py-2 bg-[#00ff41]/5 border border-[#00ff41]/20 text-[#00ff41] placeholder:text-[#00ff41]/10 focus:outline-none focus:border-[#00ff41]/60 transition-all text-sm"
                                    placeholder="••••••••"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-[#00ff41] hover:bg-[#00ff41]/80 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black uppercase tracking-[0.2em] transition-all hover:shadow-[0_0_20px_rgba(0,255,65,0.4)] relative group overflow-hidden mt-4"
                            >
                                <span className="relative z-10">{loading ? "Initializing..." : "Register Entity"}</span>
                                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                            </button>
                        </form>

                        <div className="mt-8 text-center text-[10px] text-[#00ff41]/40 uppercase tracking-[0.2em]">
                            Existing Entity? <Link href="/login" className="text-[#00ff41] hover:underline transition-all">[ Authorize ]</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
