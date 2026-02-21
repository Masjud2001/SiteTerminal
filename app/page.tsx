import Terminal from "@/components/Terminal";

export default function Home() {
  return (
    <main className="min-h-screen px-4 py-10">
      <div className="max-w-4xl mx-auto mb-6">
        <h1 className="text-2xl font-semibold">SiteTerminal</h1>
        <p className="text-zinc-400 mt-1">
          Inspect publicly available website data via terminal commands.
        </p>
      </div>

      <Terminal />

      <div className="max-w-4xl mx-auto mt-6 text-xs text-zinc-500">
        Disclaimer: This tool only fetches publicly available information and does not perform vulnerability scanning.
      </div>
    </main>
  );
}
