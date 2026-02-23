import NavBar from "@/components/NavBar";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

export default async function InspectorPage() {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    return (
        <main className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
            <NavBar user={user} />

            <div className="flex-1 max-w-5xl mx-auto px-6 py-12">
                <div className="flex flex-col md:flex-row gap-12 items-center">
                    <div className="flex-1 space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            Official Desktop Companion
                        </div>

                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                            Local Security <span className="text-emerald-400">Inspector</span>
                        </h1>

                        <p className="text-lg text-zinc-400 leading-relaxed">
                            A premium Windows desktop utility for auditing local system security.
                            Complementing SiteTerminal's web-based analysis with deep-dive local inspection.
                        </p>

                        <div className="grid grid-cols-2 gap-4 pt-4">
                            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
                                <div className="text-emerald-400 font-bold text-xl mb-1">0%</div>
                                <div className="text-xs text-zinc-500 uppercase tracking-wider">Invasive Techniques</div>
                            </div>
                            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
                                <div className="text-emerald-400 font-bold text-xl mb-1">100%</div>
                                <div className="text-xs text-zinc-500 uppercase tracking-wider">User Confirmed Actions</div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4 pt-6">
                            <button className="px-6 py-3 bg-emerald-500 text-zinc-950 font-bold rounded-lg hover:bg-emerald-400 transition-all transform hover:scale-105">
                                Download for Windows (v1.0.0)
                            </button>
                            <Link href="https://github.com" className="px-6 py-3 border border-zinc-700 text-zinc-300 font-medium rounded-lg hover:bg-zinc-800 transition-all">
                                View Source
                            </Link>
                        </div>
                    </div>

                    <div className="flex-1 w-full max-w-md">
                        <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-2xl shadow-emerald-500/10">
                            <div className="h-6 bg-zinc-800 border-b border-zinc-700 flex items-center px-4 gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/40" />
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/40" />
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="space-y-2">
                                    <div className="h-2 w-24 bg-zinc-800 rounded" />
                                    <div className="h-4 w-full bg-zinc-700 rounded-lg animate-pulse" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="h-20 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex flex-col items-center justify-center">
                                        <span className="text-emerald-400 text-sm font-mono font-bold">SHA256</span>
                                        <span className="text-[10px] text-emerald-600 uppercase font-bold tracking-tighter">Verified</span>
                                    </div>
                                    <div className="h-20 bg-zinc-800/50 border border-zinc-700/50 rounded-xl flex flex-col items-center justify-center">
                                        <span className="text-zinc-500 text-sm font-mono font-bold">PORT</span>
                                        <span className="text-[10px] text-zinc-600 uppercase font-bold tracking-tighter">Closed</span>
                                    </div>
                                </div>
                                <div className="space-y-2 pt-4">
                                    <div className="h-1.5 w-full bg-zinc-800 rounded" />
                                    <div className="h-1.5 w-3/4 bg-zinc-800 rounded" />
                                    <div className="h-1.5 w-1/2 bg-zinc-800 rounded" />
                                </div>
                                <div className="pt-2 text-center">
                                    <span className="text-[10px] font-mono text-emerald-500/50">SYSTEM_HEALTH: STABLE: 99.8%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-3">
                        <h3 className="text-zinc-100 font-bold text-lg">Process Auditor</h3>
                        <p className="text-sm text-zinc-500">Live detection of unsigned processes and background signatures without kernel drivers.</p>
                    </div>
                    <div className="space-y-3">
                        <h3 className="text-zinc-100 font-bold text-lg">Safe Quarantine</h3>
                        <p className="text-sm text-zinc-500">Isolate suspicious files in a restricted storage environment with one-click restoration.</p>
                    </div>
                    <div className="space-y-3">
                        <h3 className="text-zinc-100 font-bold text-lg">PDF Audit Reports</h3>
                        <p className="text-sm text-zinc-500">Generate professional system health reports including network listening audits and startup items.</p>
                    </div>
                </div>
            </div>
        </main>
    );
}
