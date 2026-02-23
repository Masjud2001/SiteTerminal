import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Terminal from "@/components/Terminal";
import NavBar from "@/components/NavBar";

export default async function Home() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  return (
    <main className="min-h-screen flex flex-col">
      <NavBar user={user} />

      <div className="flex-1 px-4 py-8">
        <div className="max-w-4xl mx-auto mb-6">
          <h1 className="text-2xl font-bold text-zinc-100">
            SiteTerminal
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Inspect publicly available website data — headers, DNS, TLS, security analysis, tech fingerprinting &amp; more.
          </p>
        </div>

        <Terminal userId={user?.id} />

        <div className="max-w-4xl mx-auto mt-6 text-xs text-zinc-600">
          Disclaimer: This tool only fetches publicly available information. No vulnerability exploitation or active scanning is performed.
        </div>
      </div>
    </main>
  );
}
