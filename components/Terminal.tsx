"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type OutputItem = {
  id: string;
  kind: "command" | "output" | "error" | "info";
  text: string;
};

const PROMPT = "user@siteterminal:~$";

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function formatJson(obj: any) {
  return JSON.stringify(obj, null, 2);
}

export default function Terminal() {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState<number>(-1);
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<OutputItem[]>(() => [
    { id: uid(), kind: "info", text: "Type `help` to see commands. This tool inspects publicly available data only." },
  ]);

  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const commands = useMemo(
    () => new Set(["help", "inspect", "status", "headers", "seo", "links", "robots", "sitemap", "dns", "tls"]),
    []
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [out, busy]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function runCommand(line: string) {
    const trimmed = line.trim();
    if (!trimmed) return;

    setHistory((h) => [trimmed, ...h]);
    setHistIdx(-1);

    setOut((o) => [...o, { id: uid(), kind: "command", text: `${PROMPT} ${trimmed}` }]);

    const [cmdRaw, ...rest] = trimmed.split(/\s+/);
    const cmd = cmdRaw.toLowerCase();

    if (!commands.has(cmd)) {
      setOut((o) => [...o, { id: uid(), kind: "error", text: `Unknown command: ${cmd}. Type 'help'.` }]);
      return;
    }

    if (cmd === "help") {
      setOut((o) => [
        ...o,
        {
          id: uid(),
          kind: "output",
          text:
            "Commands:\n" +
            "  help\n" +
            "  inspect <url>\n" +
            "  status <url>\n" +
            "  headers <url>\n" +
            "  seo <url>\n" +
            "  links <url>\n" +
            "  robots <url>\n" +
            "  sitemap <url>\n" +
            "  dns <domain>\n" +
            "  tls <domain>\n",
        },
      ]);
      return;
    }

    const arg = rest.join(" ").trim();
    if (!arg) {
      setOut((o) => [...o, { id: uid(), kind: "error", text: `Missing argument. Example: ${cmd} https://example.com` }]);
      return;
    }

    setBusy(true);
    try {
      const params = new URLSearchParams();
      if (cmd === "dns" || cmd === "tls") params.set("domain", arg);
      else params.set("url", arg);

      const res = await fetch(`/api/${cmd}?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || data?.ok === false) {
        const msg = data?.error || `Request failed (${res.status})`;
        setOut((o) => [...o, { id: uid(), kind: "error", text: msg }]);
      } else {
        setOut((o) => [...o, { id: uid(), kind: "output", text: formatJson(data) }]);
      }
    } catch (e: any) {
      setOut((o) => [...o, { id: uid(), kind: "error", text: e?.message || "Error" }]);
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      const line = input;
      setInput("");
      runCommand(line);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHistIdx((idx) => {
        const next = Math.min(idx + 1, history.length - 1);
        if (history[next]) setInput(history[next]);
        return next;
      });
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHistIdx((idx) => {
        const next = Math.max(idx - 1, -1);
        setInput(next === -1 ? "" : history[next] ?? "");
        return next;
      });
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="rounded-xl border border-zinc-800 bg-black shadow-lg">
        <div className="px-4 py-3 border-b border-zinc-900 flex items-center justify-between">
          <div className="text-zinc-200 font-mono text-sm">SiteTerminal</div>
          <div className="text-zinc-500 text-xs">Public data only • No vulnerability scanning</div>
        </div>

        <div className="p-4 h-[70vh] overflow-y-auto font-mono text-sm">
          {out.map((item) => (
            <pre
              key={item.id}
              className={
                item.kind === "command"
                  ? "text-zinc-200"
                  : item.kind === "error"
                  ? "text-red-400"
                  : item.kind === "info"
                  ? "text-emerald-300"
                  : "text-emerald-200"
              }
              style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
            >
              {item.text}
            </pre>
          ))}

          {busy && <div className="text-zinc-400">running…</div>}
          <div ref={endRef} />
        </div>

        <div className="px-4 py-3 border-t border-zinc-900 flex items-center gap-2 font-mono">
          <span className="text-zinc-300">{PROMPT}</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            className="flex-1 bg-transparent outline-none text-emerald-200 placeholder:text-zinc-700"
            placeholder="help"
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>
      </div>
    </div>
  );
}
