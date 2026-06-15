"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/app/components/AppSidebar";

// ── Helpers ────────────────────────────────────────────────────────────────────
const SYM: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };
const sym = (code?: string) => SYM[code || "INR"] || "₹";

const AVATAR_COLORS = ["#7C3AED", "#10B981", "#F59E0B", "#3B82F6", "#EF4444", "#8B5CF6", "#EC4899"];

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1)
    return `Yesterday, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  return d.toLocaleDateString("en-US", {
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

// ── Types ──────────────────────────────────────────────────────────────────────
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
  currency?: string;
}
interface Group { id: number; name: string; emoji?: string; currency?: string; }
type FilterTab = "all" | "expenses" | "settlements";

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ActivityPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [groups, setGroups]   = useState<Group[]>([]);
  const [items, setItems]     = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<FilterTab>("all");
  const [search, setSearch]   = useState("");

  const currentUserId = session?.user?.id ? parseInt(session.user.id as string) : null;
  const initial = session?.user?.name?.charAt(0).toUpperCase() || "?";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    (async () => {
      try {
        const gList: Group[] = await fetch("/api/groups")
          .then(r => r.json())
          .then(d => (Array.isArray(d) ? d : []));
        setGroups(gList);
        if (gList.length) {
          const results = await Promise.all(
            gList.map(g =>
              fetch(`/api/groups/${g.id}/activity`)
                .then(r => r.json())
                .then((d: any[]) =>
                  (Array.isArray(d) ? d : []).map(item => ({
                    ...item, groupId: g.id, groupName: g.name, currency: g.currency,
                  }))
                )
                .catch(() => [])
            )
          );
          setItems(
            results.flat().sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
          );
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [status]);

  // ── Filtering ───────────────────────────────────────────────────────────────
  const filtered = useMemo(
    () =>
      items.filter(item => {
        if (search && !item.title.toLowerCase().includes(search.toLowerCase())) return false;
        if (filter === "expenses" && item.type !== "expense") return false;
        if (filter === "settlements" && item.type !== "settlement") return false;
        return true;
      }),
    [items, filter, search]
  );

  // ── Date grouping ───────────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const sections: { label: string; items: ActivityItem[] }[] = [];
    let cur = "";
    filtered.forEach(item => {
      const d = new Date(item.createdAt);
      const now = new Date();
      const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
      const label =
        diff === 0 ? "TODAY" :
        diff === 1 ? "YESTERDAY" :
        diff < 7  ? "LAST WEEK" :
        d.getFullYear() === now.getFullYear()
          ? d.toLocaleDateString("en-US", { month: "long" }).toUpperCase()
          : d.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase();
      if (label !== cur) { sections.push({ label, items: [] }); cur = label; }
      sections[sections.length - 1].items.push(item);
    });
    return sections;
  }, [filtered]);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading)
    return (
      <AppShell activeTab="activity">
        <div style={{ minHeight: "100vh", background: "#F8F5FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 48, height: 48, border: "4px solid #EDE9FE", borderTopColor: "#7C3AED", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </AppShell>
    );

  return (
    <AppShell activeTab="activity">
      <div style={{ minHeight: "100vh", background: "#F8F5FF" }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

        {/* ── FIXED HEADER ─────────────────────────────────────────────────── */}
        <div
          className="se-header"
          style={{
            height: 72, background: "white", borderBottom: "1px solid #F0EEFF",
            display: "flex", alignItems: "center", padding: "0 28px", gap: 16,
          }}
        >
          <div style={{ flex: 1, position: "relative" }}>
            <span
              className="material-symbols-outlined"
              style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: "#9CA3AF" }}
            >
              search
            </span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search activity..."
              style={{
                width: "100%", background: "#F5F0FF", border: "1px solid #EDE9FE",
                borderRadius: 999, padding: "9px 16px 9px 42px",
                fontSize: 14, color: "#1D1A24", outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <button style={{ width: 36, height: 36, borderRadius: "50%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: "#7B7487" }}>notifications</span>
            </button>
            <button style={{ width: 36, height: 36, borderRadius: "50%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: "#7B7487" }}>settings</span>
            </button>
            <Link href="/profile" style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "linear-gradient(135deg, #7C3AED, #5B21B6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 800, color: "white", textDecoration: "none",
            }}>{initial}</Link>
          </div>
        </div>

        {/* ── CONTENT ──────────────────────────────────────────────────────── */}
        <div style={{ padding: "100px 28px 60px" }}>

          {/* Title row + filter tabs */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, gap: 16, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ fontSize: 34, fontWeight: 900, color: "#1D1A24", margin: 0, letterSpacing: "-0.5px" }}>Activity</h1>
              <p style={{ fontSize: 14, color: "#7B7487", margin: "6px 0 0" }}>
                Track your recent shared expenses and settlements
              </p>
            </div>

            {/* Filter tabs */}
            <div style={{ display: "flex", gap: 5, background: "white", borderRadius: 999, padding: 5, border: "1px solid #F0EEFF", flexShrink: 0 }}>
              {(["all", "expenses", "settlements"] as FilterTab[]).map(key => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  style={{
                    borderRadius: 999, padding: "8px 18px",
                    fontSize: 13, fontWeight: filter === key ? 700 : 500,
                    background: filter === key ? "#7C3AED" : "transparent",
                    color: filter === key ? "white" : "#4A4455",
                    border: "none", cursor: "pointer", whiteSpace: "nowrap",
                    transition: "all 0.15s", textTransform: "capitalize",
                  }}
                >
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* ── ACTIVITY LIST ──────────────────────────────────────────────── */}
          {filtered.length === 0 ? (
            <div style={{ background: "white", borderRadius: 18, border: "1px solid #F0EEFF", padding: "56px 40px", textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#F0EEFF", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 28, color: "#9CA3AF" }}>history</span>
              </div>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#1D1A24", margin: "0 0 8px" }}>No activity yet</p>
              <p style={{ fontSize: 13, color: "#7B7487", margin: "0 0 20px" }}>
                {groups.length === 0
                  ? "Create a group and start adding expenses."
                  : "Activity will appear here when expenses are added."}
              </p>
              {groups.length === 0 && (
                <Link href="/groups/new" style={{ color: "#7C3AED", fontWeight: 600, fontSize: 13 }}>
                  Create a Group →
                </Link>
              )}
            </div>
          ) : (
            <>
              {grouped.map(({ label, items: sectionItems }) => (
                <div key={label} style={{ marginBottom: 28 }}>
                  {/* Date label */}
                  <p style={{ fontSize: 11, fontWeight: 800, color: "#9CA3AF", letterSpacing: "0.12em", margin: "0 0 12px 2px" }}>
                    {label}
                  </p>

                  {/* Activity items card */}
                  <div style={{ background: "white", borderRadius: 18, border: "1px solid #F0EEFF", overflow: "hidden" }}>
                    {sectionItems.map((item, idx) => {
                      const s = sym(item.currency);
                      const isSettlement = item.type === "settlement";
                      const avatarColor = AVATAR_COLORS[item.actor.id % AVATAR_COLORS.length];
                      const badgeBg = isSettlement ? "#10B981" : "#7C3AED";
                      const badgeIcon = isSettlement ? "check" : "receipt";
                      const amountPrefix = isSettlement ? "+" : "−";
                      const amountColor = isSettlement ? "#10B981" : "#E11D48";
                      const amountLabel = isSettlement ? "Received" : "Your share";

                      return (
                        <Link key={item.id} href={`/groups/${item.groupId}`} style={{ textDecoration: "none", display: "block" }}>
                          <div
                            style={{
                              display: "flex", alignItems: "center", gap: 14,
                              padding: "16px 20px",
                              borderBottom: idx < sectionItems.length - 1 ? "1px solid #F5F0FF" : "none",
                              transition: "background 0.12s",
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = "#FAFAFE")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                          >
                            {/* Avatar + badge */}
                            <div style={{ position: "relative", flexShrink: 0 }}>
                              <div style={{
                                width: 48, height: 48, borderRadius: "50%",
                                background: avatarColor,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 19, fontWeight: 900, color: "white",
                              }}>
                                {item.actor.name.charAt(0).toUpperCase()}
                              </div>
                              <div style={{
                                position: "absolute", bottom: -1, right: -1,
                                width: 20, height: 20, borderRadius: "50%",
                                background: badgeBg, border: "2px solid white",
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}>
                                <span
                                  className="material-symbols-outlined"
                                  style={{ fontSize: 11, color: "white", fontVariationSettings: "'FILL' 1" }}
                                >
                                  {badgeIcon}
                                </span>
                              </div>
                            </div>

                            {/* Description + time */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 14, color: "#1D1A24", margin: "0 0 5px", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                <strong>{item.actor.name}</strong>{" "}
                                {isSettlement ? (
                                  <>
                                    settled up with you for{" "}
                                    <span style={{ color: "#7C3AED", fontWeight: 600 }}>{item.title}</span>
                                  </>
                                ) : (
                                  <>
                                    added{" "}
                                    <span style={{ color: "#7C3AED", fontWeight: 600 }}>"{item.title}"</span>
                                    {" "}in {item.groupName}
                                  </>
                                )}
                              </p>
                              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 13, color: "#9CA3AF" }}>schedule</span>
                                <span style={{ fontSize: 12, color: "#9CA3AF" }}>{timeAgo(item.createdAt)}</span>
                              </div>
                            </div>

                            {/* Amount */}
                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                              <p style={{ fontSize: 18, fontWeight: 900, color: amountColor, margin: "0 0 2px", letterSpacing: "-0.3px" }}>
                                {amountPrefix} {s}{item.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                              <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0, fontWeight: 500 }}>
                                {amountLabel}
                              </p>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* End of recent updates */}
              <div style={{
                background: "white", borderRadius: 18, border: "1px dashed #E4D9F7",
                padding: "40px 32px", textAlign: "center", marginTop: 8,
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: "50%", background: "#F5F3FF",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 14px",
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 26, color: "#9CA3AF" }}>history</span>
                </div>
                <p style={{ fontSize: 18, fontWeight: 700, color: "#1D1A24", margin: "0 0 8px" }}>
                  End of recent updates
                </p>
                <p style={{ fontSize: 14, color: "#7B7487", margin: "0 0 16px", maxWidth: 340, marginLeft: "auto", marginRight: "auto" }}>
                  You have seen all activity from the past 7 days. Go to History for older records.
                </p>
                <button style={{ color: "#7C3AED", fontWeight: 700, fontSize: 14, background: "none", border: "none", cursor: "pointer" }}>
                  View Older History
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
