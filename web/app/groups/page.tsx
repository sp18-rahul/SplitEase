"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/app/components/AppSidebar";

interface Group {
  id: number;
  name: string;
  emoji?: string;
  currency?: string;
  members: { userId: number; user: { id: number; name: string } }[];
  expenses: { amount: number; paidById: number; splits: { userId: number; amount: number }[] }[];
  settlements?: { fromUserId: number; toUserId: number; amount: number }[];
}

export default function GroupsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "settled">("all");

  const currentUserId = session?.user?.id ? parseInt(session.user.id as string) : null;
  const initial = session?.user?.name?.charAt(0).toUpperCase() || "?";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/groups")
      .then(r => r.json())
      .then(data => setGroups(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [status]);

  function getBalance(group: Group) {
    if (!currentUserId) return 0;
    const expenses = group.expenses || [];
    let paid = 0, owes = 0;
    expenses.forEach(exp => {
      if (exp.paidById === currentUserId) paid += exp.amount;
      const split = exp.splits.find(s => s.userId === currentUserId);
      if (split) owes += split.amount;
    });
    (group.settlements || []).forEach(s => {
      if (s.fromUserId === currentUserId) paid += s.amount;
      if (s.toUserId === currentUserId) owes += s.amount;
    });
    return paid - owes;
  }

  if (loading) {
    return (
      <AppShell activeTab="groups">
        <div className="flex items-center justify-center min-h-screen bg-[#F8F5FF]">
          <div style={{ width: 44, height: 44, border: "4px solid #EDE9FE", borderTopColor: "#7C3AED", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </AppShell>
    );
  }

  const filteredGroups = groups.filter(group => {
    if (activeFilter === "all") return true;
    const balance = getBalance(group);
    if (activeFilter === "active") return balance !== 0;
    if (activeFilter === "settled") return balance === 0;
    return true;
  });

  const maxSpend = Math.max(...groups.map(g => g.expenses.reduce((s, e) => s + e.amount, 0)), 1);

  return (
    <AppShell activeTab="groups">
      <div className="bg-[#F8F5FF] min-h-screen">
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          .se-groups-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 16px;
            align-items: start;
          }
          @media (min-width: 768px) {
            .se-groups-grid { grid-template-columns: 1fr 1fr; }
          }
          @media (min-width: 1024px) {
            .se-groups-grid { grid-template-columns: 1fr 1fr 1fr; }
          }
        `}</style>

        {/* Fixed Header */}
        <header className="se-header" style={{ height: 72, background: "white", borderBottom: "1px solid #F0EEFF", display: "flex", alignItems: "center", padding: "0 28px", gap: 16 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <span className="material-symbols-outlined" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: "#9CA3AF" }}>search</span>
            <input
              type="text"
              placeholder="Search groups..."
              style={{ width: "100%", background: "#F5F0FF", border: "1px solid #EDE9FE", borderRadius: 999, padding: "9px 16px 9px 42px", fontSize: 14, color: "#1D1A24", outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <button style={{ width: 36, height: 36, borderRadius: "50%", background: "none", border: "1.5px solid #EDE9FE", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#4A4455" }}>notifications</span>
            </button>
            <button style={{ width: 36, height: 36, borderRadius: "50%", background: "none", border: "1.5px solid #EDE9FE", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#4A4455" }}>settings</span>
            </button>
            <Link href="/profile" style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #7C3AED, #5B21B6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: "white", textDecoration: "none" }}>
              {initial}
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main style={{ paddingTop: 96, paddingBottom: 60, paddingLeft: 28, paddingRight: 28, maxWidth: 1200, margin: "0 auto" }}>
          {/* Page header row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <h1 style={{ fontSize: 30, fontWeight: 900, color: "#1D1A24", margin: 0 }}>My Groups</h1>
              <p style={{ fontSize: 14, color: "#7B7487", marginTop: 4, marginBottom: 0 }}>
                Track and split expenses with your favorite circles.
              </p>
            </div>
            <Link
              href="/groups/new"
              style={{ background: "#7C3AED", color: "white", borderRadius: 999, padding: "11px 22px", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", fontSize: 15, boxShadow: "0 4px 14px rgba(124,58,237,0.30)" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>group_add</span>
              Create Group
            </Link>
          </div>

          {/* Filter tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {(["all", "active", "settled"] as const).map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                style={{
                  borderRadius: 999,
                  padding: "8px 20px",
                  fontSize: 14,
                  fontWeight: activeFilter === f ? 700 : 600,
                  border: activeFilter === f ? "none" : "1px solid #E4D9F7",
                  background: activeFilter === f ? "#7C3AED" : "white",
                  color: activeFilter === f ? "white" : "#4A4455",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Group cards GRID */}
          {filteredGroups.length === 0 ? (
            <div style={{ textAlign: "center", padding: "64px 24px", background: "white", borderRadius: 18, border: "1px solid #F0EEFF" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#F0EEFF", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 32 }}>👥</div>
              <p style={{ fontSize: 18, fontWeight: 700, color: "#1D1A24", marginBottom: 8 }}>No groups yet</p>
              <p style={{ fontSize: 14, color: "#7B7487", marginBottom: 20 }}>Create a group to start splitting expenses.</p>
              <Link href="/groups/new" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#7C3AED", color: "white", borderRadius: 999, padding: "10px 24px", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span> Create a Group
              </Link>
            </div>
          ) : (
            <div className="se-groups-grid">
              {filteredGroups.map(group => {
                const totalSpend = group.expenses.reduce((s, e) => s + e.amount, 0);
                const balance = getBalance(group);
                const isOwed = balance > 0;
                const isOwing = balance < 0;
                const isSettled = balance === 0;
                const progressPct = Math.min((totalSpend / maxSpend) * 100, 100);

                const currency = group.currency === "USD" ? "$" : group.currency === "EUR" ? "€" : "₹";
                const barColor = isSettled ? "#D1D5DB" : isOwed ? "#7C3AED" : "#D97706";

                return (
                  <Link key={group.id} href={`/groups/${group.id}`} className="no-underline">
                    <div
                      style={{
                        background: "white", borderRadius: 18, border: "1px solid #F0EEFF",
                        padding: 20, display: "flex", flexDirection: "column", gap: 16,
                        cursor: "pointer", transition: "border-color 0.15s, box-shadow 0.15s",
                        boxShadow: "0 1px 4px rgba(124,58,237,0.04)",
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = "#C4B5FD";
                        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(124,58,237,0.10)";
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = "#F0EEFF";
                        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 4px rgba(124,58,237,0.04)";
                      }}
                    >

                      {/* ── TOP: 44px emoji + name/members + three-dot menu ── */}
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                          background: isSettled ? "#F3F4F6" : "#F5F3FF",
                          border: `1px solid ${isSettled ? "#E5E7EB" : "#EDE9FE"}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 22,
                          opacity: isSettled ? 0.75 : 1,
                        }}>
                          {group.emoji || "👥"}
                        </div>

                        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <p style={{ fontSize: 20, fontWeight: 900, color: "#1D1A24", margin: 0, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {group.name}
                              </p>
                              {isSettled && (
                                <span
                                  className="material-symbols-outlined"
                                  style={{ fontSize: 17, color: "#10B981", fontVariationSettings: "'FILL' 1", flexShrink: 0 }}
                                >
                                  check_circle
                                </span>
                              )}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 5 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 13, color: "#9CA3AF" }}>group</span>
                              <span style={{ fontSize: 12, color: "#9CA3AF" }}>{group.members.length} members</span>
                            </div>
                          </div>
                          <button
                            style={{ width: 28, height: 28, borderRadius: "50%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                            onClick={e => e.preventDefault()}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#9CA3AF" }}>more_vert</span>
                          </button>
                        </div>
                      </div>

                      {/* ── TOTAL SPENT + amount + progress bar ── */}
                      <div>
                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
                          <span style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 500 }}>Total Spent</span>
                          <span style={{ fontSize: 22, fontWeight: 900, color: "#1D1A24", letterSpacing: "-0.5px" }}>
                            {currency}{totalSpend.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div style={{ background: "#F0EEFF", borderRadius: 999, height: 7 }}>
                          <div style={{ width: `${progressPct}%`, background: barColor, borderRadius: 999, height: "100%", transition: "width 0.4s" }} />
                        </div>
                      </div>

                      {/* ── BOTTOM: avatar stack + balance label ── */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        {/* Avatar stack */}
                        <div style={{ display: "flex", alignItems: "center" }}>
                          {group.members.slice(0, 3).map((m, i) => (
                            <div
                              key={m.userId}
                              style={{
                                width: 28, height: 28, borderRadius: "50%",
                                border: "2px solid white",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 10, fontWeight: 900, color: "white",
                                background: ["#7C3AED", "#10B981", "#F59E0B", "#3B82F6"][i % 4],
                                marginLeft: i === 0 ? 0 : -8,
                                zIndex: 3 - i, position: "relative",
                              }}
                            >
                              {(m.user?.name || "?").charAt(0).toUpperCase()}
                            </div>
                          ))}
                          {group.members.length > 3 && (
                            <div
                              style={{
                                width: 28, height: 28, borderRadius: "50%",
                                border: "2px solid white", marginLeft: -8,
                                background: "#EDE9FE", position: "relative", zIndex: 0,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 10, fontWeight: 700, color: "#7C3AED",
                              }}
                            >
                              +{group.members.length - 3}
                            </div>
                          )}
                        </div>

                        {/* Balance */}
                        <div style={{ textAlign: "right" }}>
                          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9CA3AF", margin: "0 0 2px" }}>
                            {isOwed ? "YOU ARE OWED" : isOwing ? "YOU OWE" : "SETTLED"}
                          </p>
                          <p style={{
                            fontSize: 17, fontWeight: 900, margin: 0, letterSpacing: "-0.3px",
                            color: isOwed ? "#7C3AED" : isOwing ? "#E11D48" : "#9CA3AF",
                          }}>
                            {currency}{Math.abs(balance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}

              {/* Dashed "Start a New Group" card */}
              <Link href="/groups/new" style={{ textDecoration: "none" }}>
                <div
                  style={{ border: "2px dashed #D8CAFD", borderRadius: 18, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", cursor: "pointer", minHeight: 200, padding: "32px 24px", background: "transparent", transition: "background 0.15s" }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "#FAF8FF"}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                >
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#EDE9FE", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 26, color: "#7C3AED", fontVariationSettings: "'FILL' 1" }}>add</span>
                  </div>
                  <p style={{ fontWeight: 700, color: "#1D1A24", fontSize: 14, margin: "0 0 6px" }}>Start a New Group</p>
                  <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>Perfect for roommates or travel.</p>
                </div>
              </Link>
            </div>
          )}
        </main>
      </div>
    </AppShell>
  );
}
