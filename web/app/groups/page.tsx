"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/app/components/AppSidebar";
import { Plus, Users, ChevronRight, Bell, Settings } from "lucide-react";

const PURPLE     = "#7C3AED";
const PURPLE_MID = "#6D28D9";
const PAGE_BG    = "#F0EEFF";

interface Group {
  id: number;
  name: string;
  emoji?: string;
  currency?: string;
  members: { userId: number; user: { id: number; name: string } }[];
  expenses: { amount: number; paidById: number; splits: { userId: number; amount: number }[] }[];
}

export default function GroupsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

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
    return paid - owes;
  }

  if (loading) {
    return (
      <AppShell activeTab="groups">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: PAGE_BG }}>
          <div style={{ width: 44, height: 44, border: `4px solid #EDE9FE`, borderTopColor: PURPLE, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell activeTab="groups">
      <div style={{ background: PAGE_BG, minHeight: "100vh" }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
          .se-grp-deskhead { display: none; }
          .se-grp-mobhead  { display: flex; }
          .se-grp-content  { padding: 0 16px 100px; }
          @media (min-width: 1024px) {
            .se-grp-deskhead { display: flex !important; }
            .se-grp-mobhead  { display: none !important; }
            .se-grp-content  { padding: 24px 32px 60px !important; max-width: 760px; }
          }
        `}</style>

        {/* ── DESKTOP HEADER ── */}
        <div className="se-grp-deskhead" style={{ alignItems: "center", justifyContent: "space-between", padding: "16px 28px", background: "white", borderBottom: "1px solid #F3F0FF", position: "sticky", top: 0, zIndex: 30 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: "#0f172a", margin: 0 }}>Groups</h1>
            <p style={{ fontSize: 13, color: "#94a3b8", margin: "2px 0 0" }}>
              {groups.length} group{groups.length !== 1 ? "s" : ""} you&apos;re part of
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/groups/new" style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_MID})`, color: "white", borderRadius: 12, textDecoration: "none", fontSize: 13, fontWeight: 700, boxShadow: `0 3px 10px ${PURPLE}44` }}>
              <Plus size={15} /> New Group
            </Link>
            <button style={{ width: 38, height: 38, borderRadius: "50%", background: "#F8F5FF", border: "1px solid #EDE9FE", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bell size={17} color="#64748b" />
            </button>
            <button style={{ width: 38, height: 38, borderRadius: "50%", background: "#F8F5FF", border: "1px solid #EDE9FE", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Settings size={17} color="#64748b" />
            </button>
            <Link href="/profile" style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${PURPLE}, #5B21B6)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "white", textDecoration: "none" }}>
              {initial}
            </Link>
          </div>
        </div>

        {/* ── MOBILE HEADER ── */}
        <div className="se-grp-mobhead" style={{ alignItems: "center", justifyContent: "space-between", padding: "20px 18px 14px" }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: "#0f172a", margin: 0 }}>Groups</h1>
            <p style={{ fontSize: 13, color: "#64748b", margin: "3px 0 0" }}>
              {groups.length} group{groups.length !== 1 ? "s" : ""} total
            </p>
          </div>
          <Link href="/groups/new" style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_MID})`, color: "white", borderRadius: 12, textDecoration: "none", fontSize: 13, fontWeight: 700, boxShadow: `0 3px 10px ${PURPLE}44` }}>
            <Plus size={15} /> New
          </Link>
        </div>

        {/* ── CONTENT ── */}
        <div className="se-grp-content" style={{ animation: "fadeIn 0.3s ease" }}>
          {groups.length === 0 ? (
            <div style={{ textAlign: "center", padding: "56px 24px", background: "white", borderRadius: 20, border: "1px solid #EDE9FE", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#F5F3FF", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", fontSize: 32 }}>
                👥
              </div>
              <p style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", margin: "0 0 8px" }}>No groups yet</p>
              <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 22px", lineHeight: 1.6 }}>
                Create a group to start splitting expenses with friends, family, or colleagues.
              </p>
              <Link href="/groups/new" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 26px", background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_MID})`, color: "white", borderRadius: 14, fontSize: 14, fontWeight: 700, textDecoration: "none", boxShadow: `0 4px 14px ${PURPLE}44` }}>
                <Plus size={16} /> Create a Group
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {groups.map(group => {
                const totalSpend = group.expenses.reduce((s, e) => s + e.amount, 0);
                const balance    = getBalance(group);
                const isOwed     = balance > 0;
                const isOwes     = balance < 0;

                return (
                  <Link key={group.id} href={`/groups/${group.id}`} style={{ textDecoration: "none" }}>
                    <div
                      style={{ background: "white", borderRadius: 18, border: "1px solid #F3F0FF", padding: "16px 18px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", transition: "all 0.15s" }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = "#C4B5FD";
                        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(124,58,237,0.1)";
                        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)";
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = "#F3F0FF";
                        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
                        (e.currentTarget as HTMLDivElement).style.transform = "none";
                      }}
                    >
                      {/* Emoji / avatar */}
                      <div style={{ width: 50, height: 50, borderRadius: 15, background: `linear-gradient(135deg, ${PURPLE}, #5B21B6)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: group.emoji ? 24 : 20, color: "white", fontWeight: 900, flexShrink: 0 }}>
                        {group.emoji || group.name.charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{group.name}</p>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                          <span style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
                            <Users size={12} />{group.members.length} member{group.members.length !== 1 ? "s" : ""}
                          </span>
                          <span style={{ fontSize: 10, color: "#cbd5e1" }}>·</span>
                          <span style={{ fontSize: 12, color: "#64748b" }}>{group.expenses.length} expense{group.expenses.length !== 1 ? "s" : ""}</span>
                        </div>
                      </div>

                      {/* Balance */}
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        {balance !== 0 ? (
                          <>
                            <p style={{ fontSize: 15, fontWeight: 900, color: isOwed ? "#10B981" : "#FB7185", margin: 0 }}>
                              {isOwed ? "+" : "-"}₹{Math.abs(balance).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                            </p>
                            <p style={{ fontSize: 11, color: "#94a3b8", margin: "2px 0 0" }}>{isOwed ? "owed to you" : "you owe"}</p>
                          </>
                        ) : (
                          <>
                            <p style={{ fontSize: 14, fontWeight: 700, color: "#94a3b8", margin: 0 }}>₹{totalSpend.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
                            <p style={{ fontSize: 11, color: "#cbd5e1", margin: "2px 0 0" }}>total spent</p>
                          </>
                        )}
                      </div>
                      <ChevronRight size={16} color="#C4B5FD" />
                    </div>
                  </Link>
                );
              })}

              {/* New group CTA */}
              <Link href="/groups/new" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px", borderRadius: 16, border: `2px dashed #DDD6FE`, textDecoration: "none", color: PURPLE, fontWeight: 700, fontSize: 13, marginTop: 4 }}>
                <Plus size={16} /> Create New Group
              </Link>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
