"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Wallet, Plus, User, Receipt, TrendingUp, TrendingDown,
  ChevronRight, Search, X, SlidersHorizontal,
} from "lucide-react";

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
    const groups: { label: string; items: PersonalExpense[] }[] = [];
    let currentLabel = "";
    filtered.forEach((e) => {
      const d = new Date(e.createdAt);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      let label: string;
      if (diffDays === 0) label = "Today";
      else if (diffDays === 1) label = "Yesterday";
      else if (diffDays < 7) label = d.toLocaleDateString("en-IN", { weekday: "long" });
      else if (d.getFullYear() === now.getFullYear())
        label = d.toLocaleDateString("en-IN", { month: "long" });
      else
        label = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

      if (label !== currentLabel) {
        groups.push({ label, items: [] });
        currentLabel = label;
      }
      groups[groups.length - 1].items.push(e);
    });
    return groups;
  }, [filtered]);

  const activeFilters =
    (groupFilter !== null ? 1 : 0) + (categoryFilter !== null ? 1 : 0);

  if (loading) {
    return (
      <div className="app-page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 48, height: 48, border: "4px solid #c7d2fe", borderTopColor: "#4f46e5", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <p style={{ color: "#4f46e5", fontWeight: 600 }}>Loading expenses…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="app-page pb-24">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div className="app-shell animate-fadeIn">

        {/* Hero banner */}
        <div className="summary-card" style={{ marginBottom: 24, marginTop: 16 }}>
          <div style={{ position: "relative", zIndex: 10 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#a5b4fc", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
              My Expenses
            </p>
            <p style={{ fontSize: "clamp(28px, 7vw, 44px)", fontWeight: 900, color: "white", margin: "0 0 4px", lineHeight: 1.1 }}>
              {sym()}{(stats?.totalMyShare ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </p>
            <p style={{ fontSize: 13, color: "#a5b4fc", marginBottom: 20 }}>my total share across all groups</p>

            {/* Three mini stats */}
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1, background: "rgba(255,255,255,0.1)", borderRadius: 14, padding: "12px 14px", border: "1px solid rgba(255,255,255,0.15)" }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: "#a5b4fc", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>I Paid</p>
                <p style={{ fontSize: 18, fontWeight: 900, color: "white", margin: 0 }}>
                  {sym()}{(stats?.totalPaidByMe ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div style={{ flex: 1, background: "rgba(255,255,255,0.1)", borderRadius: 14, padding: "12px 14px", border: "1px solid rgba(255,255,255,0.15)" }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: "#a5b4fc", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Net Balance</p>
                <p style={{ fontSize: 18, fontWeight: 900, color: (stats?.netBalance ?? 0) >= 0 ? "#6ee7b7" : "#fda4af", margin: 0 }}>
                  {(stats?.netBalance ?? 0) >= 0 ? "+" : ""}{sym()}{Math.abs(stats?.netBalance ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div style={{ flex: 1, background: "rgba(255,255,255,0.1)", borderRadius: 14, padding: "12px 14px", border: "1px solid rgba(255,255,255,0.15)" }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: "#a5b4fc", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Total Bills</p>
                <p style={{ fontSize: 18, fontWeight: 900, color: "white", margin: 0 }}>{stats?.count ?? 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div style={{ marginBottom: 16 }}>
          {/* Quick filter chips */}
          <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto", paddingBottom: 2 }}>
            {(["all", "i_paid", "i_owe", "i_am_owed"] as FilterType[]).map((f) => {
              const labels: Record<FilterType, string> = {
                all: "All", i_paid: "I Paid", i_owe: "I Owe", i_am_owed: "Owed to Me",
              };
              const active = filter === f;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    flexShrink: 0, padding: "5px 12px", borderRadius: 20,
                    border: `1.5px solid ${active ? "#4f46e5" : "#e2e8f0"}`,
                    background: active ? "#4f46e5" : "white",
                    color: active ? "white" : "#64748b",
                    fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
                  }}
                >
                  {labels[f]}
                </button>
              );
            })}

            {/* More filters toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                flexShrink: 0, display: "flex", alignItems: "center", gap: 4,
                padding: "5px 12px", borderRadius: 20,
                border: `1.5px solid ${activeFilters > 0 ? "#4f46e5" : "#e2e8f0"}`,
                background: activeFilters > 0 ? "#eef2ff" : "white",
                color: activeFilters > 0 ? "#4f46e5" : "#64748b",
                fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}
            >
              <SlidersHorizontal style={{ width: 12, height: 12 }} />
              Filters{activeFilters > 0 ? ` (${activeFilters})` : ""}
            </button>
          </div>

          {/* Expandable filter panel */}
          {showFilters && (
            <div style={{ background: "white", borderRadius: 16, border: "1px solid #e0e7ff", padding: 16, marginBottom: 10, display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Group filter */}
              {groups.length > 1 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Group</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <button
                      onClick={() => setGroupFilter(null)}
                      style={{ padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1.5px solid ${groupFilter === null ? "#4f46e5" : "#e2e8f0"}`, background: groupFilter === null ? "#eef2ff" : "white", color: groupFilter === null ? "#4338ca" : "#64748b" }}
                    >All</button>
                    {groups.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => setGroupFilter(groupFilter === g.id ? null : g.id)}
                        style={{ padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1.5px solid ${groupFilter === g.id ? "#4f46e5" : "#e2e8f0"}`, background: groupFilter === g.id ? "#eef2ff" : "white", color: groupFilter === g.id ? "#4338ca" : "#64748b" }}
                      >
                        {g.emoji} {g.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Category filter */}
              {categories.length > 1 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Category</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <button
                      onClick={() => setCategoryFilter(null)}
                      style={{ padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1.5px solid ${categoryFilter === null ? "#4f46e5" : "#e2e8f0"}`, background: categoryFilter === null ? "#eef2ff" : "white", color: categoryFilter === null ? "#4338ca" : "#64748b" }}
                    >All</button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                        style={{ padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1.5px solid ${categoryFilter === cat ? "#4f46e5" : "#e2e8f0"}`, background: categoryFilter === cat ? "#eef2ff" : "white", color: categoryFilter === cat ? "#4338ca" : "#64748b" }}
                      >
                        {CATEGORY_EMOJIS[cat] || "💡"} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(groupFilter !== null || categoryFilter !== null) && (
                <button
                  onClick={() => { setGroupFilter(null); setCategoryFilter(null); }}
                  style={{ alignSelf: "flex-start", fontSize: 12, fontWeight: 600, color: "#e11d48", background: "#fff1f2", border: "none", borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {/* Search bar */}
          <div style={{ position: "relative" }}>
            <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "#94a3b8", pointerEvents: "none" }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search expenses, groups…"
              style={{ width: "100%", boxSizing: "border-box", paddingLeft: 36, paddingRight: search ? 36 : 14, paddingTop: 10, paddingBottom: 10, borderRadius: 12, border: "1.5px solid #e2e8f0", fontSize: 14, outline: "none", background: "white", color: "#1e293b" }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 2 }}>
                <X style={{ width: 14, height: 14 }} />
              </button>
            )}
          </div>
        </div>

        {/* Expense list grouped by date */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 24px", background: "white", borderRadius: 20, border: "1px solid #e0e7ff" }}>
            <span style={{ fontSize: 40, display: "block", marginBottom: 12 }}>🔍</span>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
              {expenses.length === 0 ? "No expenses yet" : "No matching expenses"}
            </p>
            <p style={{ fontSize: 14, color: "#64748b" }}>
              {expenses.length === 0
                ? "Add an expense inside any group to see it here."
                : "Try changing your search or filters."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {grouped.map(({ label, items }) => (
              <div key={label}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, paddingLeft: 4 }}>
                  {label}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {items.map((expense) => {
                    const currency = expense.group.currency || "INR";
                    const s = sym(currency);
                    const isPaid = expense.iPaid;
                    const net = expense.net;

                    return (
                      <Link
                        key={expense.id}
                        href={`/groups/${expense.group.id}/expenses/${expense.id}/edit`}
                        style={{ textDecoration: "none" }}
                      >
                        <div
                          style={{
                            background: "white",
                            borderRadius: 18,
                            border: "1px solid #e2e8f0",
                            padding: "14px 16px",
                            display: "flex",
                            alignItems: "center",
                            gap: 14,
                            transition: "all 0.15s",
                            cursor: "pointer",
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLDivElement).style.borderColor = "#c7d2fe";
                            (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(79,70,229,0.08)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLDivElement).style.borderColor = "#e2e8f0";
                            (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                          }}
                        >
                          {/* Category icon */}
                          {expense.receiptUrl ? (
                            <div style={{ width: 46, height: 46, borderRadius: 14, overflow: "hidden", flexShrink: 0, border: "2px solid #e2e8f0" }}>
                              <img src={expense.receiptUrl} alt="Receipt" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </div>
                          ) : (
                            <div style={{ width: 46, height: 46, borderRadius: 14, background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 22 }}>
                              {CATEGORY_EMOJIS[expense.category || "other"] || "💡"}
                            </div>
                          )}

                          {/* Details */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                              <div style={{ minWidth: 0 }}>
                                <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {expense.description}
                                </p>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                                  <span style={{ fontSize: 12, color: "#64748b" }}>
                                    {expense.group.emoji || "💰"} {expense.group.name}
                                  </span>
                                  <span style={{ fontSize: 10, color: "#cbd5e1" }}>·</span>
                                  <span style={{ fontSize: 12, color: "#94a3b8" }}>
                                    {isPaid ? "You paid" : `${expense.paidBy.name} paid`}
                                  </span>
                                </div>
                              </div>
                              {/* Right side amounts */}
                              <div style={{ textAlign: "right", flexShrink: 0 }}>
                                <p style={{ fontSize: 15, fontWeight: 900, color: "#0f172a", margin: 0 }}>
                                  {s}{expense.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                                </p>
                                <span
                                  style={{
                                    display: "inline-block",
                                    marginTop: 3,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: "2px 8px",
                                    borderRadius: 20,
                                    background: net > 0 ? "#dcfce7" : net < 0 ? "#fff1f2" : "#f1f5f9",
                                    color: net > 0 ? "#166534" : net < 0 ? "#e11d48" : "#64748b",
                                  }}
                                >
                                  {net > 0 ? `+${s}${net.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` :
                                   net < 0 ? `-${s}${Math.abs(net).toLocaleString("en-IN", { maximumFractionDigits: 0 })}` :
                                   "settled"}
                                </span>
                              </div>
                            </div>

                            {expense.notes && (
                              <p style={{ fontSize: 11, color: "#94a3b8", margin: "4px 0 0", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {expense.notes}
                              </p>
                            )}
                          </div>

                          <ChevronRight style={{ width: 16, height: 16, color: "#cbd5e1", flexShrink: 0 }} />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Footer count */}
            <p style={{ textAlign: "center", fontSize: 12, color: "#94a3b8", paddingBottom: 8 }}>
              Showing {filtered.length} of {expenses.length} expenses
            </p>
          </div>
        )}

      </div>

      {/* Bottom Nav */}
      <nav className="nav-bottom">
        <div className="max-w-[80rem] mx-auto flex items-center justify-around px-4">
          <Link href="/" className="nav-bottom-item">
            <Wallet size={22} className="mb-1" />
            Home
          </Link>
          <Link href="/expenses" className="nav-bottom-item nav-bottom-active">
            <Receipt size={22} className="mb-1" />
            Expenses
          </Link>
          <Link href="/groups/new" className="nav-bottom-item">
            <Plus size={22} className="mb-1" />
            New Group
          </Link>
          <Link href="/profile" className="nav-bottom-item">
            <User size={22} className="mb-1" />
            Profile
          </Link>
        </div>
      </nav>
    </div>
  );
}
