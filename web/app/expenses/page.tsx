"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/app/components/AppSidebar";

const CATEGORY_EMOJIS: Record<string, string> = {
  food: "🍽️", transport: "🚗", housing: "🏠", entertainment: "🎉",
  shopping: "🛒", travel: "✈️", health: "💊", utilities: "🔧", other: "💡",
};
const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥", AED: "د.إ",
};
const sym = (code?: string) => CURRENCY_SYMBOLS[code || "INR"] || "₹";

interface PersonalExpense {
  id: number;
  description: string;
  amount: number;
  category?: string | null;
  notes?: string | null;
  receiptUrl?: string | null;
  createdAt: string;
  paidBy: { id: number; name: string };
  paidById: number;
  group: { id: number; name: string; emoji?: string; currency?: string };
  myShare: number;
  iPaid: boolean;
  net: number;
}

interface Stats {
  totalPaidByMe: number;
  totalMyShare: number;
  netBalance: number;
  count: number;
}

type FilterType = "all" | "i_paid" | "i_owe" | "i_am_owed";

export default function ExpensesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [expenses, setExpenses] = useState<PersonalExpense[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [groupFilter, setGroupFilter] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/expenses")
      .then((r) => r.json())
      .then((data) => {
        setExpenses(data.expenses || []);
        setStats(data.stats || null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [status]);

  // Unique groups for filter
  const groups = useMemo(() => {
    const map = new Map<number, { id: number; name: string; emoji?: string }>();
    expenses.forEach((e) => { if (!map.has(e.group.id)) map.set(e.group.id, e.group); });
    return [...map.values()];
  }, [expenses]);

  // Unique categories for filter
  const categories = useMemo(() => {
    return [...new Set(expenses.map((e) => e.category || "other"))];
  }, [expenses]);

  // Filtered list
  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !e.description.toLowerCase().includes(q) &&
          !e.group.name.toLowerCase().includes(q) &&
          !(e.notes?.toLowerCase().includes(q))
        ) return false;
      }
      if (filter === "i_paid" && !e.iPaid) return false;
      if (filter === "i_owe" && (e.net >= 0 || e.iPaid)) return false;
      if (filter === "i_am_owed" && e.net <= 0) return false;
      if (groupFilter !== null && e.group.id !== groupFilter) return false;
      if (categoryFilter !== null && (e.category || "other") !== categoryFilter) return false;
      return true;
    });
  }, [expenses, search, filter, groupFilter, categoryFilter]);

  // Group by date label
  const grouped = useMemo(() => {
    const grps: { label: string; items: PersonalExpense[] }[] = [];
    let currentLabel = "";
    filtered.forEach((e) => {
      const d = new Date(e.createdAt);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      let label: string;
      if (diffDays === 0) label = "Today";
      else if (diffDays === 1) label = "Yesterday";
      else if (diffDays < 7) label = d.toLocaleDateString("en-US", { weekday: "long" });
      else if (d.getFullYear() === now.getFullYear())
        label = d.toLocaleDateString("en-US", { month: "long" });
      else
        label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });

      if (label !== currentLabel) {
        grps.push({ label, items: [] });
        currentLabel = label;
      }
      grps[grps.length - 1].items.push(e);
    });
    return grps;
  }, [filtered]);

  const initial = session?.user?.name?.charAt(0).toUpperCase() || "?";

  if (loading) {
    return (
      <AppShell activeTab="expenses">
        <div className="bg-[#F8F5FF] min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div style={{ width: 48, height: 48, border: "4px solid #EDE9FE", borderTopColor: "#7C3AED", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
            <p className="text-[#7C3AED] font-semibold">Loading expenses…</p>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </AppShell>
    );
  }

  const s = sym();
  const netBalance = stats?.netBalance ?? 0;

  return (
    <AppShell activeTab="expenses">
      <div className="bg-[#F8F5FF] min-h-screen">
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        {/* ── HEADER ── */}
        <header className="se-header" style={{ background: "white", borderBottom: "1px solid #F0EEFF", height: 72, display: "flex", alignItems: "center", padding: "0 20px", gap: 12 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <span className="material-symbols-outlined" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: "#9CA3AF" }}>search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search expenses, groups..."
              style={{ width: "100%", background: "#F5F0FF", border: "1px solid #EDE9FE", borderRadius: 999, padding: "9px 16px 9px 42px", fontSize: 14, color: "#1D1A24", outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <button style={{ width: 36, height: 36, borderRadius: "50%", background: "#F5F0FF", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#7B7487" }}>notifications</span>
          </button>
          <button style={{ width: 36, height: 36, borderRadius: "50%", background: "#F5F0FF", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#7B7487" }}>settings</span>
          </button>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #7C3AED, #5B21B6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: "white", flexShrink: 0 }}>
            {initial}
          </div>
        </header>

        {/* ── MAIN CONTENT ── */}
        <main>
          <div className="max-w-6xl mx-auto px-6" style={{ paddingTop: 96, paddingBottom: 60 }}>

            {/* Page title row */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-3xl font-black text-[#1D1A24]">Activity Feed</h1>
                <p className="text-sm text-[#7B7487] mt-1">Keep track of all your shared expenses across all groups.</p>
              </div>
              {/* Avatar group */}
              <div className="flex items-center -space-x-2 flex-shrink-0">
                {groups.slice(0, 2).map((g, i) => (
                  <div
                    key={g.id}
                    className="w-9 h-9 rounded-full border-2 border-[#F8F5FF] flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: i === 0 ? "linear-gradient(135deg, #7C3AED, #5B21B6)" : "linear-gradient(135deg, #F59E0B, #D97706)", zIndex: 2 - i }}
                  >
                    {g.name.charAt(0).toUpperCase()}
                  </div>
                ))}
                {groups.length > 2 && (
                  <div
                    className="w-9 h-9 rounded-full border-2 border-[#F8F5FF] flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: "#7C3AED", zIndex: 0 }}
                  >
                    +{groups.length - 2}
                  </div>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
              {/* Total Share */}
              <div className="bg-white rounded-2xl border border-[#F0EEFF] p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-[#7B7487] font-medium">Total Share</p>
                  <span className="material-symbols-outlined text-[#7C3AED]" style={{ fontSize: 22 }}>donut_large</span>
                </div>
                <p className="text-2xl font-black text-[#1D1A24] mb-1">
                  {s}{(stats?.totalMyShare ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-[#9CA3AF]">Across {groups.length} group{groups.length !== 1 ? "s" : ""}</p>
              </div>

              {/* Amount Paid */}
              <div className="bg-white rounded-2xl border border-[#F0EEFF] p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-[#7B7487] font-medium">Amount Paid</p>
                  <span className="material-symbols-outlined text-[#C2722B]" style={{ fontSize: 22 }}>payments</span>
                </div>
                <p className="text-2xl font-black text-[#1D1A24] mb-1">
                  {s}{(stats?.totalPaidByMe ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-[#9CA3AF]">
                  Settled {stats && stats.totalMyShare > 0 ? Math.round((stats.totalPaidByMe / stats.totalMyShare) * 100) : 0}% total
                </p>
              </div>

              {/* Net Balance — highlighted purple */}
              <div className="rounded-2xl p-5 text-white" style={{ background: "#7C3AED" }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>Net Balance</p>
                  <span className="material-symbols-outlined" style={{ fontSize: 22, color: "rgba(255,255,255,0.9)" }}>account_balance</span>
                </div>
                <p className="text-2xl font-black text-white mb-1">
                  {netBalance >= 0 ? "" : "-"}{s}{Math.abs(netBalance).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
                  {netBalance > 0 ? `Owed to you` : netBalance < 0 ? `Owed to friends` : "All settled up"}
                </p>
              </div>

              {/* Bill Count */}
              <div className="bg-white rounded-2xl border border-[#F0EEFF] p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-[#7B7487] font-medium">Bill Count</p>
                  <span className="material-symbols-outlined text-[#7C3AED]" style={{ fontSize: 22 }}>receipt_long</span>
                </div>
                <p className="text-2xl font-black text-[#1D1A24] mb-1">{stats?.count ?? 0}</p>
                <p className="text-xs text-[#9CA3AF]">Last 30 days</p>
              </div>
            </div>

            {/* Filter section */}
            <div className="bg-white rounded-2xl border border-[#F0EEFF] p-4 mb-5 flex flex-wrap items-center gap-3">
              {/* Filter chips pill */}
              <div className="bg-[#F5F0FF] rounded-full p-1 flex gap-1">
                {(["all", "i_paid", "i_owe", "i_am_owed"] as FilterType[]).map((f) => {
                  const labels: Record<FilterType, string> = {
                    all: "All", i_paid: "I Paid", i_owe: "I Owe", i_am_owed: "Owed to Me",
                  };
                  const active = filter === f;
                  return (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                        active
                          ? "bg-[#7C3AED] text-white font-bold"
                          : "text-[#4A4455] font-semibold hover:bg-white"
                      }`}
                    >
                      {labels[f]}
                    </button>
                  );
                })}
              </div>

              {/* Group dropdown */}
              <select
                value={groupFilter ?? ""}
                onChange={(e) => setGroupFilter(e.target.value ? Number(e.target.value) : null)}
                className="border border-[#E4D9F7] rounded-full py-2 px-4 text-sm bg-white text-[#4A4455] outline-none cursor-pointer appearance-none pr-8"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}
              >
                <option value="">All Groups</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.emoji} {g.name}</option>
                ))}
              </select>

              {/* Category dropdown */}
              <select
                value={categoryFilter ?? ""}
                onChange={(e) => setCategoryFilter(e.target.value || null)}
                className="border border-[#E4D9F7] rounded-full py-2 px-4 text-sm bg-white text-[#4A4455] outline-none cursor-pointer appearance-none pr-8"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_EMOJIS[cat] || "💡"} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Expense list grouped by date */}
            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#F0EEFF] p-12 text-center">
                <span className="text-4xl block mb-3">🔍</span>
                <p className="text-base font-bold text-[#1D1A24] mb-2">
                  {expenses.length === 0 ? "No expenses yet" : "No matching expenses"}
                </p>
                <p className="text-sm text-[#7B7487]">
                  {expenses.length === 0
                    ? "Add an expense inside any group to see it here."
                    : "Try changing your search or filters."}
                </p>
              </div>
            ) : (
              <div className="flex flex-col">
                {grouped.map(({ label, items }) => (
                  <div key={label}>
                    <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-widest mb-3 mt-5 ml-2">
                      {label}
                    </p>
                    {items.map((expense) => {
                      const currency = expense.group.currency || "INR";
                      const cs = sym(currency);
                      const isPaid = expense.iPaid;
                      const net = expense.net;

                      let statusText = "";
                      let statusColor = "";
                      const paidByName = expense.paidBy?.name || "Someone";
                      const isMe = expense.iPaid;
                      if (isMe && net > 0) {
                        statusText = `You paid, you are owed ${cs}${net.toFixed(2)}`;
                        statusColor = "#7C3AED";
                      } else if (isMe && net === 0) {
                        statusText = `You paid, you owe ${cs}0.00`;
                        statusColor = "#7C3AED";
                      } else if (net < 0) {
                        statusText = `${isMe ? "You" : paidByName} paid, you owe ${cs}${Math.abs(net).toFixed(2)}`;
                        statusColor = "#E11D48";
                      } else if (net > 0) {
                        statusText = `You paid, you are owed ${cs}${net.toFixed(2)}`;
                        statusColor = "#7C3AED";
                      } else {
                        statusText = "Settled up";
                        statusColor = "#9CA3AF";
                      }

                      return (
                        <Link
                          key={expense.id}
                          href={`/groups/${expense.group.id}/expenses/${expense.id}/edit`}
                          className="block no-underline"
                        >
                          <div className="bg-white rounded-2xl border border-[#F0EEFF] p-4 mb-2 flex items-center gap-4 hover:shadow-md transition-all cursor-pointer">
                            {/* Emoji icon */}
                            <div className="w-12 h-12 rounded-2xl bg-[#F5F0FF] flex items-center justify-center text-2xl flex-shrink-0">
                              {expense.receiptUrl
                                ? <img src={expense.receiptUrl} alt="" className="w-full h-full object-cover rounded-2xl" />
                                : (CATEGORY_EMOJIS[expense.category || "other"] || "💡")}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-[#1D1A24] truncate" style={{ fontSize: 15 }}>{expense.description}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="bg-[#EDE9FE] text-[#7C3AED] rounded-full px-2.5 py-0.5 font-bold uppercase tracking-wide" style={{ fontSize: 10 }}>
                                  {expense.group.name}
                                </span>
                                <span className="text-xs text-[#9CA3AF]">
                                  {new Date(expense.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                            </div>

                            {/* Amount + status */}
                            <div className="text-right flex-shrink-0 min-w-[120px]">
                              <p className="font-black text-[#1D1A24]" style={{ fontSize: 18 }}>
                                {cs}{expense.amount.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}
                              </p>
                              <p className="text-xs font-semibold mt-0.5" style={{ color: statusColor }}>
                                {statusText}
                              </p>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ))}

                <p className="text-center text-xs text-[#9CA3AF] py-4">
                  Showing {filtered.length} of {expenses.length} expenses
                </p>
              </div>
            )}

          </div>
        </main>
      </div>
    </AppShell>
  );
}
