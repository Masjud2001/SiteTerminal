"use client";
import { useEffect, useState } from "react";

type UserRow = {
    id: string;
    email: string;
    name: string | null;
    role: string;
    createdAt: string;
    _count: { logs: number };
};

type StatsData = {
    stats: { totalUsers: number; totalCommands: number; adminCount: number; regularUserCount: number };
    recentLogs: Array<{ id: string; command: string; target: string; success: boolean; createdAt: string; user: { email: string; name: string | null } }>;
    topCommands: Array<{ command: string; count: number }>;
};

type SearchRow = {
    id: number;
    uid: string;
    command: string;
    target: string;
    createdAt: string;
    user: { email: string; name: string | null };
};

export default function AdminDashboard() {
    const [users, setUsers] = useState<UserRow[]>([]);
    const [stats, setStats] = useState<StatsData | null>(null);
    const [searches, setSearches] = useState<SearchRow[]>([]);
    const [tab, setTab] = useState<"overview" | "users" | "logs" | "searches">("overview");
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState("");

    async function load() {
        setLoading(true);
        const [usersRes, statsRes, searchRes] = await Promise.all([
            fetch("/api/admin/users").then((r) => r.json()),
            fetch("/api/admin/stats").then((r) => r.json()),
            fetch("/api/admin/searches").then((r) => r.json()),
        ]);
        if (usersRes.ok) setUsers(usersRes.users);
        if (statsRes.ok) setStats(statsRes);
        if (searchRes.ok) setSearches(searchRes.searches);
        setLoading(false);
    }

    useEffect(() => { load(); }, []);

    async function changeRole(userId: string, role: string) {
        const res = await fetch("/api/admin/users", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, role }),
        });
        const data = await res.json();
        if (data.ok) {
            setMsg(`Role updated.`);
            load();
        } else {
            setMsg(data.error);
        }
        setTimeout(() => setMsg(""), 3000);
    }

    async function deleteUser(userId: string, email: string) {
        if (!confirm(`Delete account "${email}"? This also deletes all their command logs.`)) return;
        const res = await fetch("/api/admin/users", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId }),
        });
        const data = await res.json();
        if (data.ok) { setMsg("User deleted."); load(); }
        else setMsg(data.error);
        setTimeout(() => setMsg(""), 3000);
    }

    const tabClass = (t: string) =>
        `px-4 py-2 text-sm rounded-lg transition-colors ${tab === t ? "bg-zinc-800 text-zinc-100 font-medium" : "text-zinc-500 hover:text-zinc-300"
        }`;

    return (
        <div className="flex-1 px-4 py-8 max-w-6xl mx-auto w-full">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-zinc-100">Admin Dashboard</h1>
                <p className="text-zinc-500 text-sm mt-1">Manage users, monitor usage, and view platform stats.</p>
            </div>

            {msg && (
                <div className="mb-4 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                    {msg}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b border-zinc-800 pb-3 flex-wrap">
                <button className={tabClass("overview")} onClick={() => setTab("overview")}>Overview</button>
                <button className={tabClass("users")} onClick={() => setTab("users")}>Users</button>
                <button className={tabClass("logs")} onClick={() => setTab("logs")}>Command Logs</button>
                <button className={tabClass("searches")} onClick={() => setTab("searches")}>
                    Search Records
                    {searches.length > 0 && (
                        <span className="ml-1.5 text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">
                            {searches.length}
                        </span>
                    )}
                </button>
            </div>

            {loading ? (
                <div className="text-zinc-500 text-sm animate-pulse">Loading…</div>
            ) : (
                <>
                    {/* ── OVERVIEW TAB ── */}
                    {tab === "overview" && stats && (
                        <div className="space-y-6">
                            {/* Stat cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: "Total Users", value: stats.stats.totalUsers, color: "emerald" },
                                    { label: "Total Commands", value: stats.stats.totalCommands, color: "blue" },
                                    { label: "Admin Accounts", value: stats.stats.adminCount, color: "amber" },
                                    { label: "Regular Users", value: stats.stats.regularUserCount, color: "zinc" },
                                ].map((s) => (
                                    <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                                        <div className="text-3xl font-bold text-zinc-100">{s.value}</div>
                                        <div className="text-xs text-zinc-500 mt-1">{s.label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Top commands */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                                <h2 className="text-sm font-semibold text-zinc-300 mb-4">Most Used Commands</h2>
                                <div className="space-y-2">
                                    {stats.topCommands.map((c, i) => {
                                        const maxCount = stats.topCommands[0]?.count || 1;
                                        const pct = Math.round((c.count / maxCount) * 100);
                                        return (
                                            <div key={c.command} className="flex items-center gap-3">
                                                <span className="text-zinc-600 text-xs w-4">{i + 1}.</span>
                                                <span className="font-mono text-emerald-400 text-sm w-32 shrink-0">{c.command}</span>
                                                <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
                                                    <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                                </div>
                                                <span className="text-zinc-500 text-xs w-8 text-right">{c.count}</span>
                                            </div>
                                        );
                                    })}
                                    {stats.topCommands.length === 0 && (
                                        <p className="text-zinc-600 text-sm">No commands logged yet.</p>
                                    )}
                                </div>
                            </div>

                            {/* Recent activity */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                                <h2 className="text-sm font-semibold text-zinc-300 mb-4">Recent Activity</h2>
                                <div className="space-y-1 font-mono text-xs">
                                    {stats.recentLogs.slice(0, 15).map((l) => (
                                        <div key={l.id} className="flex items-center gap-3 py-1 border-b border-zinc-800/50 last:border-0">
                                            <span className={`shrink-0 ${l.success ? "text-emerald-500" : "text-red-500"}`}>
                                                {l.success ? "✓" : "✗"}
                                            </span>
                                            <span className="text-zinc-500 shrink-0">{l.user.email.split("@")[0]}</span>
                                            <span className="text-emerald-400 shrink-0">{l.command}</span>
                                            <span className="text-zinc-600 truncate">{l.target}</span>
                                            <span className="text-zinc-700 shrink-0 ml-auto">
                                                {new Date(l.createdAt).toLocaleTimeString()}
                                            </span>
                                        </div>
                                    ))}
                                    {stats.recentLogs.length === 0 && (
                                        <p className="text-zinc-600">No activity yet.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── USERS TAB ── */}
                    {tab === "users" && (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-zinc-800">
                                        <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">User</th>
                                        <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3 hidden md:table-cell">Joined</th>
                                        <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Role</th>
                                        <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Commands</th>
                                        <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((u) => (
                                        <tr key={u.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-zinc-200">{u.name || u.email}</div>
                                                {u.name && <div className="text-xs text-zinc-500">{u.email}</div>}
                                            </td>
                                            <td className="px-4 py-3 text-zinc-500 text-xs hidden md:table-cell">
                                                {new Date(u.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${u.role === "ADMIN"
                                                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                                                    : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                                                    }`}>
                                                    {u.role === "ADMIN" ? "Admin" : "User"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-zinc-400 font-mono text-xs">{u._count.logs}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-2">
                                                    {u.role === "USER" ? (
                                                        <button
                                                            onClick={() => changeRole(u.id, "ADMIN")}
                                                            className="text-xs px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                                                        >
                                                            Promote
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => changeRole(u.id, "USER")}
                                                            className="text-xs px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 transition-colors"
                                                        >
                                                            Demote
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => deleteUser(u.id, u.email)}
                                                        className="text-xs px-2.5 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {users.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-zinc-600">No users found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* ── LOGS TAB ── */}
                    {tab === "logs" && stats && (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                            <h2 className="text-sm font-semibold text-zinc-300 mb-4">All Command Logs (last 20)</h2>
                            <div className="space-y-1 font-mono text-xs">
                                {stats.recentLogs.map((l) => (
                                    <div key={l.id} className="grid grid-cols-[1rem_8rem_6rem_1fr_5rem] gap-2 items-center py-1.5 border-b border-zinc-800/50 last:border-0">
                                        <span className={l.success ? "text-emerald-500" : "text-red-500"}>
                                            {l.success ? "✓" : "✗"}
                                        </span>
                                        <span className="text-zinc-400 truncate">{l.user.email}</span>
                                        <span className="text-emerald-400">{l.command}</span>
                                        <span className="text-zinc-600 truncate">{l.target}</span>
                                        <span className="text-zinc-700 text-right">
                                            {new Date(l.createdAt).toLocaleString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" })}
                                        </span>
                                    </div>
                                ))}
                                {stats.recentLogs.length === 0 && (
                                    <p className="text-zinc-600">No commands logged yet.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── SEARCHES TAB ── */}
                    {tab === "searches" && (
                        <div className="space-y-4">
                            {/* Header + Export */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-sm font-semibold text-zinc-300">Search Records</h2>
                                    <p className="text-xs text-zinc-500 mt-0.5">
                                        {searches.length} records · every terminal search is stored with a unique UID
                                    </p>
                                </div>
                                <a
                                    href="/api/admin/export"
                                    download
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm hover:bg-emerald-500/20 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                                    </svg>
                                    Export CSV
                                </a>
                            </div>

                            {/* Table */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-zinc-800">
                                            <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">UID</th>
                                            <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">User</th>
                                            <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Command</th>
                                            <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Target</th>
                                            <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3 hidden md:table-cell">Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {searches.map((s) => (
                                            <tr key={s.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                                                <td className="px-4 py-3">
                                                    <span className="font-mono text-xs bg-zinc-800 text-emerald-400 px-2 py-1 rounded border border-zinc-700">
                                                        {s.uid}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-zinc-400 text-xs truncate max-w-[8rem]">{s.user.email}</td>
                                                <td className="px-4 py-3 font-mono text-xs text-emerald-400">{s.command}</td>
                                                <td className="px-4 py-3 text-zinc-500 text-xs max-w-xs truncate">{s.target}</td>
                                                <td className="px-4 py-3 text-zinc-600 text-xs hidden md:table-cell">
                                                    {new Date(s.createdAt).toLocaleString([], {
                                                        month: "short", day: "numeric",
                                                        hour: "2-digit", minute: "2-digit",
                                                    })}
                                                </td>
                                            </tr>
                                        ))}
                                        {searches.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-10 text-center text-zinc-600 text-sm">
                                                    No searches yet. Run any command in the terminal to create the first record.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
