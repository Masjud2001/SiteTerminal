import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Terminal from "@/components/Terminal";
import NavBar from "@/components/NavBar";

export default async function Home() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  return (
    <main className="min-h-screen relative overflow-hidden selection:bg-[#00ff41] selection:text-black">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 terminal-grid pointer-events-none" />
        <div className="scanline" />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black opacity-60" />
      </div>

      <NavBar user={user} />

      <div className="relative z-10 flex flex-col items-center">
        {/* Hero Section */}
        <section className="w-full py-20 px-4 flex flex-col items-center justify-center text-center">
          <div className="relative group mb-4">
            <h1
              className="text-6xl md:text-8xl font-black uppercase tracking-tighter glow-text glitch"
              data-text="TERMINAL"
            >
              Terminal <span className="inline-block animate-pulse text-[#00ff41]/80">_</span>
            </h1>
            <div className="absolute -inset-2 bg-[#00ff41]/5 blur-2xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity" />
          </div>

          <div className="max-w-2xl mx-auto space-y-4">
            <p className="text-[#00ff41]/60 text-lg md:text-xl font-mono leading-relaxed max-w-lg mx-auto">
              [ SECURE OSINT WEB ANALYSIS PLATFORM ]
              <br />
              <span className="text-xs opacity-50">BYPASSING RESTRICTIONS // ANALYZING DATA STREAMS</span>
            </p>

            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <div className="px-3 py-1 border border-[#00ff41]/30 bg-[#00ff41]/5 text-[10px] uppercase tracking-widest text-[#00ff41]/50">
                STATUS: OPERATIONAL
              </div>
              <div className="px-3 py-1 border border-[#00ff41]/30 bg-[#00ff41]/5 text-[10px] uppercase tracking-widest text-[#00ff41]/50">
                ENCRYPTION: AES-256
              </div>
              <div className="px-3 py-1 border border-[#00ff41]/30 bg-[#00ff41]/5 text-[10px] uppercase tracking-widest text-[#00ff41]/50">
                NODE: US-WEST-01
              </div>
            </div>
          </div>
        </section>

        {/* Console Section */}
        <section className="w-full max-w-5xl px-4 pb-20">
          <div className="relative">
            {/* Decorative corners */}
            <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-[#00ff41] z-20" />
            <div className="absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-[#00ff41] z-20" />
            <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b-2 border-l-2 border-[#00ff41] z-20" />
            <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-[#00ff41] z-20" />

            <div className="bg-black/80 backdrop-blur-sm border border-[#00ff41]/20 rounded-sm shadow-[0_0_30px_rgba(0,255,65,0.1)]">
              <Terminal userId={user?.id} />
            </div>
          </div>

          <div className="mt-8 flex justify-between items-center text-[10px] text-[#00ff41]/40 uppercase tracking-widest font-mono">
            <div>&copy; 2026 SITETERMINAL // LEVEL 4 ACCESS</div>
            <div className="flex gap-4">
              <span>LATENCY: 12ms</span>
              <span>UPTIME: 99.9%</span>
            </div>
          </div>
        </section>
      </div>

    </main>
  );
}
