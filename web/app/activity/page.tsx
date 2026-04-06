"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/app/components/AppSidebar";
import { Bell, Settings } from "lucide-react";

const PURPLE = "#7C3AED";

const CATEGORY_EMOJIS: Record<string, string> = {
  food: "🍽️", transport: "🚗", housing: "🏠", entertainment: "🎉",
  shopping: "🛒", travel: "✈️", health: "💊", utilities: "🔧", other: "💡",
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥", AED: "د.إ",
};
const sym = (code?: string) => CURRENCY_SYMBOLS[code || "INR"] || "₹";

interface ActivityItem {
  id: string;
  type: "expense" | "settlement";
  title: string;
  subtitle: string;
  amount: number;
  category?: string | null;
  actor: { id: number; name: string };
  createdAt: string;
  groupId: number;
  groupName: string;
  groupEmoji?: string;
  currency?: string;
}

interface Group {
  id: number;
  name: string;
  emoji?: string;
  currency?: string;
}

type FilterTab = "all" | "expenses" | "settlements";

export default function ActivityPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [groups, setGroups] = useState<Group[]>([]);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [groupFilter, setGroupFilter] = useState<number | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const fetchAll = async () => {
      try {
        const groupsRes = await fetch("/api/groups");
        const groupsList: Group[] = await groupsRes.json();
        setGroups(Array.isArray(groupsList) ? groupsList : []);

        if (groupsList.length > 0) {
          const activityResults = await Promise.all(
            groupsList.map(g =>
              fetch(`/api/groups/${g.id}/activity`)
                .then(r => r.json())
                .then(data => (Array.isArray(data) ? data : []).map((item: any) => ({
                  ...item,
                  groupId: g.id,
                  groupName: g.name,
                  groupEmoji: g.emoji,
                  currency: g.currency,
                })))
                .catch(() => [])
            )
          );
          const merged = activityResults.flat().sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setActivityItems(merged);
        }
      } catch (err) {
        console.error("Error fetching activity:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [status]);

  const filtered = useMemo(() => {
    return activityItems.filter(item => {
      if (filter === "expenses" && item.type !== "expense") return false;
      if (filter === "settlements" && item.type !== "settlement") return false;
      if (groupFilter !== null && item.groupId !== groupFilter) return false;
      return true;
    });
  }, [activityItems, filter, groupFilter]);

  // Group by relative date label
  const groupedByDate = useMemo(() => {
    const sections: { label: string; items: ActivityItem[] }[] = [];
    let currentLabel = "";
    filtered.forEach(item => {
      const d = new Date(item.createdAt);
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
        sections.push({ label, items: [] });
        currentLabel = label;
      }
      sections[sections.length - 1].items.push(item);
    });
    return sections;
  }, [filtered]);

  const currentUserId = session?.user?.id ? parseInt(session.user.id as string) : null;

  const initial = session?.user?.name?.charAt(0).toUpperCase() || "?";

  if (loading) {
    return (
      <AppShell activeTab="activity">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#F0EEFF" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{ width: 48, height: 48, border: "4px solid #ede9fe", borderTopColor: PURPLE, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
            <p style={{ color: PURPLE, fontWeight: 600, fontSize: 14 }}>Loading activity…</p>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell activeTab="activity">
      <div style={{ background: "#F0EEFF", minHeight: "100vh" }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
          .se-act-deskhead { display: none; }
          .se-act-mobhead  { display: flex; }
          .se-act-filters  { padding: 16px 16px 0; }
          .se-act-content  { padding: 0 16px 100px; }
          @media (min-width: 1024px) {
            .se-act-deskhead { display: flex !important; }
            .se-act-mobhead  { display: none !important; }
            .se-act-filters  { padding: 20px 32px 0 !important; }
            .se-act-content  { padding: 0 32px 60px !important; max-width: 760px; }
          }
        `}</style>

        {/* ── DESKTOP HEADER ── */}
        <div className="se-act-deskhead" style={{ alignItems: "center", justifyContent: "space-between", padding: "16px 28px", background: "white", borderBottom: "1px solid #F3F0FF", position: "sticky", top: 0, zIndex: 30 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: "#0f172a", margin: 0 }}>Activity</h1>
            <p style={{ fontSize: 13, color: "#94a3b8", margin: "2px 0 0" }}>
              {activityItems.length} event{activityItems.length !== 1 ? "s" : ""} · {groups.length} group{groups.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ padding: "7px 14px", background: "#F0FDF4", borderRadius: 20, border: "1px solid #BBF7D0" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#16A34A" }}>{activityItems.filter(i => i.type === "expense").length} expenses</span>
            </div>
            <div style={{ padding: "7px 14px", background: "#F5F3FF", borderRadius: 20, border: "1px solid #DDD6FE" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: PURPLE }}>{activityItems.filter(i => i.type === "settlement").length} settlements</span>
            </div>
            <button style={{ width: 38, height: 38, borderRadius: "50%", background: "#F8F5FF", border: "1px solid #EDE9FE", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Bell size={17} color="#64748b" /></button>
            <button style={{ width: 38, height: 38, borderRadius: "50%", background: "#F8F5FF", border: "1px solid #EDE9FE", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Settings size={17} color="#64748b" /></button>
            <Link href="/profile" style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${PURPLE}, #5B21B6)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "white", textDecoration: "none" }}>{initial}</Link>
          </div>
        </div>

        {/* ── MOBILE HEADER ── */}
        <div className="se-act-mobhead" style={{ alignItems: "center", justifyContent: "space-between", padding: "20px 18px 14px" }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: "#0f172a", margin: 0 }}>Activity</h1>
            <p style={{ fontSize: 13, color: "#64748b", margin: "3px 0 0" }}>{activityItems.length} events across {groups.length} group{groups.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* ── FILTERS ── */}
        <div className="se-act-filters">
          <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", paddingBottom: 2 }}>
            {(["all", "expenses", "settlements"] as FilterTab[]).map(f => {
              const labels: Record<FilterTab, string> = { all: "All Activity", expenses: "Expenses", settlements: "Settlements" };
              const active = filter === f;
              return (
                <button key={f} onClick={() => setFilter(f)} style={{ flexShrink: 0, padding: "7px 18px", borderRadius: 20, border: `1.5px solid ${active ? PURPLE : "#e2e8f0"}`, background: active ? `linear-gradient(135deg, ${PURPLE}, #5B21B6)` : "white", color: active ? "white" : "#64748b", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.15s", boxShadow: active ? `0 3px 10px ${PURPLE}33` : "none" }}>
                  {labels[f]}
                </button>
              );
            })}
            {groups.length > 1 && (
              <>
                <div style={{ width: 1, background: "#e2e8f0", margin: "4px 4px" }} />
                {groups.map(g => (
                  <button key={g.id} onClick={() => setGroupFilter(groupFilter === g.id ? null : g.id)} style={{ flexShrink: 0, padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${groupFilter === g.id ? PURPLE : "#e2e8f0"}`, background: groupFilter === g.id ? "#EDE9FE" : "white", color: groupFilter === g.id ? PURPLE : "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    {g.emoji || "💰"} {g.name}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {/* ── ACTIVITY LIST ── */}
        <div className="se-act-content">
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 24px", background: "white", borderRadius: 20, border: "1px solid #EDE9FE" }}>
              <span style={{ fontSize: 48, display: "block", marginBottom: 16 }}>🔔</span>
              <p style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>No activity yet</p>
              <p style={{ fontSize: 14, color: "#64748b", marginBottom: 20, lineHeight: 1.6 }}>
                {groups.length === 0
                  ? "Create a group and start adding expenses to see activity here."
                  : "Activity will appear here when you or your group members add expenses or settle up."}
              </p>
              {groups.length === 0 && (
                <Link
                  href="/groups/new"
                  style={{ display: "inline-block", padding: "11px 24px", background: PURPLE, color: "white", borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: "none" }}
                >
                  Create a Group →
                </Link>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 28, animation: "fadeIn 0.3s ease" }}>
              {groupedByDate.map(({ label, items }) => (
                <div key={label}>
                  {/* Date section header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
                      {label}
                    </span>
                    <div style={{ flex: 1, height: 1, background: "#f1f5f9" }} />
                    <span style={{ fontSize: 11, color: "#cbd5e1", fontWeight: 500, whiteSpace: "nowrap" }}>
                      {items.length} event{items.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Items */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {items.map(item => {
                      const isSettlement = item.type === "settlement";
                      const s = sym(item.currency);
                      const isMe = currentUserId && item.actor.id === currentUserId;
                      const time = new Date(item.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

                      return (
                        <Link
                          key={item.id}
                          href={`/groups/${item.groupId}`}
                          style={{ textDecoration: "none" }}
                        >
                          <div
                            style={{
                              background: "white",
                              borderRadius: 16,
                              border: "1px solid #e2e8f0",
                              padding: "14px 16px",
                              display: "flex",
                              alignItems: "center",
                              gap: 14,
                              transition: "all 0.15s",
                              cursor: "pointer",
                            }}
                            onMouseEnter={e => {
                              (e.currentTarget as HTMLDivElement).style.borderColor = "#c4b5fd";
                              (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(124,58,237,0.08)";
                            }}
                            onMouseLeave={e => {
                              (e.currentTarget as HTMLDivElement).style.borderColor = "#e2e8f0";
                              (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                            }}
                          >
                            {/* Icon */}
                            <div style={{
                              width: 44,
                              height: 44,
                              borderRadius: 13,
                              flexShrink: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 20,
                              background: isSettlement ? "#f0fdf4" : "#EDE9FE",
                            }}>
                              {isSettlement ? "🤝" : (CATEGORY_EMOJIS[item.category || "other"] || "💡")}
                            </div>

                            {/* Content */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                                <div style={{ minWidth: 0 }}>
                                  <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {item.title}
                                  </p>
                                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3, flexWrap: "wrap" }}>
                                    <span style={{ fontSize: 12, color: "#64748b" }}>
                                      {isMe ? "You" : item.actor.name}
                                    </span>
                                    <span style={{ fontSize: 10, color: "#cbd5e1" }}>·</span>
                                    <span style={{
                                      fontSize: 11,
                                      fontWeight: 600,
                                      color: PURPLE,
                                      background: "#EDE9FE",
                                      padding: "1px 7px",
                                      borderRadius: 20,
                                    }}>
                                      {item.groupEmoji || "💰"} {item.groupName}
                                    </span>
                                  </div>
                                </div>

                                {/* Amount + time */}
                                <div style={{ textAlign: "right", flexShrink: 0 }}>
                                  <p style={{
                                    fontSize: 15,
                                    fontWeight: 900,
                                    margin: 0,
                                    color: isSettlement ? "#16a34a" : "#0f172a",
                                  }}>
                                    {isSettlement ? "✓ " : ""}{s}{item.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                                  </p>
                                  <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>{time}</span>
                                </div>
                              </div>

                              {/* Subtitle */}
                              {item.subtitle && (
                                <p style={{ fontSize: 12, color: "#94a3b8", margin: "4px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {item.subtitle}
                                </p>
                              )}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Footer */}
              <p style={{ textAlign: "center", fontSize: 12, color: "#94a3b8", paddingBottom: 8 }}>
                Showing {filtered.length} of {activityItems.length} events
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
