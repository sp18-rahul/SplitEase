"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

import { AppShell } from "@/app/components/AppSidebar";
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS, STYLES } from "@/lib/designSystem";

// ── INTERFACES ──────────────────────────────────────────────────────────────
interface Group {
  id: number;
  name: string;
  emoji?: string;
  members: { userId: number; user: { id: number; name: string } }[];
  expenses?: {
    id: number;
    description: string;
    amount: number;
    paidById: number;
    category?: string | null;
    paidBy?: { name: string };
    splits: { userId: number; amount: number }[];
    createdAt?: string;
  }[];
  settlements?: {
    id: number;
    fromUserId: number;
    toUserId: number;
    amount: number;
  }[];
}

// ── HELPERS ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins} min${mins !== 1 ? "s" : ""} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}

function getBalance(group: Group, currentUserId: number) {
  const expenses = group.expenses || [];
  let paid = 0, owes = 0;
  expenses.forEach((exp) => {
    if (exp.paidById === currentUserId) paid += exp.amount;
    const split = exp.splits.find((s) => s.userId === currentUserId);
    if (split) owes += split.amount;
  });

  const settlements = group.settlements || [];
  settlements.forEach((s) => {
    if (s.fromUserId === currentUserId) paid += s.amount;
    if (s.toUserId === currentUserId) owes += s.amount;
  });

  return paid - owes;
}

// ── BALANCE HERO CARD ────────────────────────────────────────────────────────
function BalanceHeroCard({
  groups, currentUserId, onSettleNow,
}: {
  groups: Group[]; currentUserId: number; onSettleNow: () => void;
}) {
  let youOwe = 0, owedToYou = 0;
  groups.forEach((g) => {
    const b = getBalance(g, currentUserId);
    if (b > 0) owedToYou += b;
    else youOwe += Math.abs(b);
  });
  const total = owedToYou - youOwe;
  const isSurplus = total >= 0;

  return (
    <div style={{
      gridColumn: "span 8",
      background: "#7C3AED",
      borderRadius: 28,
      padding: 24,
      color: "white",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Label + Settle Now row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.8 }}>
          Total Net Balance
        </div>
        <button
          onClick={onSettleNow}
          style={{
            background: "transparent", border: "2px solid rgba(255,255,255,0.6)",
            borderRadius: BORDER_RADIUS.full, padding: `${SPACING.xs} ${SPACING.md}`,
            color: "white", fontWeight: TYPOGRAPHY.labelSm.fontWeight, fontSize: TYPOGRAPHY.labelSm.fontSize,
            cursor: "pointer", whiteSpace: "nowrap",
          }}
        >
          Settle Now
        </button>
      </div>

      {/* Balance amount + badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1 }}>
          ₹{Math.abs(total).toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </div>
        <span style={{
          background: isSurplus ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)",
          color: isSurplus ? "#6EE7B7" : "#FCA5A5",
          borderRadius: 9999, padding: "3px 10px",
          fontSize: 12, fontWeight: 700,
        }}>
          {isSurplus ? "Surplus" : "Deficit"}
        </span>
      </div>

      {/* Sub-cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 16, padding: "16px 24px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.75, marginBottom: 6 }}>
            You Are Owed
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#6EE7B7" }}>
            ₹{owedToYou.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 16, padding: "16px 24px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.75, marginBottom: 6 }}>
            You Owe
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#FCA5A5" }}>
            ₹{youOwe.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ACTIONS CARD ─────────────────────────────────────────────────────────────
function ActionsCard({ onAddExpense }: { onAddExpense: () => void }) {
  return (
    <div style={{
      background: "white",
      borderRadius: 24,
      border: "1px solid #F0EEFF",
      padding: 20,
    }}>
      <div style={{ fontWeight: 700, fontSize: 16, color: "#1a1a2e", marginBottom: 16 }}>Actions</div>

      {/* Add Expense row */}
      <div
        onClick={onAddExpense}
        style={{
          background: COLORS.primaryContainer, borderRadius: BORDER_RADIUS.md, padding: SPACING.md,
          display: "flex", alignItems: "center", gap: SPACING.sm,
          marginBottom: SPACING.sm, cursor: "pointer",
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 24, color: COLORS.onPrimaryContainer, fontVariationSettings: "'FILL' 1" }}>
          add_circle
        </span>
        <div>
          <div style={{ color: COLORS.onPrimaryContainer, fontWeight: TYPOGRAPHY.labelMd.fontWeight, fontSize: TYPOGRAPHY.labelMd.fontSize }}>Add Expense</div>
          <div style={{ color: `rgba(255,255,255,0.75)`, fontSize: TYPOGRAPHY.labelSm.fontSize }}>Split with anyone instantly</div>
        </div>
      </div>

      {/* Create Group row */}
      <Link
        href="/groups/new"
        style={{
          background: COLORS.primaryFixed, borderRadius: BORDER_RADIUS.md, padding: SPACING.md,
          display: "flex", alignItems: "center", gap: SPACING.sm,
          textDecoration: "none",
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 24, color: COLORS.primaryContainer, fontVariationSettings: "'FILL' 1" }}>
          group_add
        </span>
        <div>
          <div style={{ color: COLORS.onSurface, fontWeight: TYPOGRAPHY.labelMd.fontWeight, fontSize: TYPOGRAPHY.labelMd.fontSize }}>Create Group</div>
          <div style={{ color: COLORS.onSurfaceVariant, fontSize: TYPOGRAPHY.labelSm.fontSize }}>Set up shared budgets</div>
        </div>
      </Link>
    </div>
  );
}

// ── QUICK SETTLE CARD ────────────────────────────────────────────────────────
function QuickSettleCard({ groups, currentUserId }: { groups: Group[]; currentUserId: number }) {
  const netMap: Record<string, { name: string; net: number }> = {};
  groups.forEach((g) => {
    (g.expenses || []).forEach((e) => {
      if (Number(e.paidById) === currentUserId) {
        e.splits.forEach((s) => {
          if (Number(s.userId) !== currentUserId) {
            const m = g.members.find((m) => Number(m.userId) === Number(s.userId));
            if (m) {
              const key = String(s.userId);
              if (!netMap[key]) netMap[key] = { name: m.user.name, net: 0 };
              netMap[key].net += s.amount;
            }
          }
        });
      } else {
        const mySplit = e.splits.find((s) => Number(s.userId) === currentUserId);
        if (mySplit) {
          const payer = g.members.find((m) => Number(m.userId) === Number(e.paidById));
          if (payer) {
            const key = String(e.paidById);
            if (!netMap[key]) netMap[key] = { name: payer.user.name, net: 0 };
            netMap[key].net -= mySplit.amount;
          }
        }
      }
    });
  });

  const people = Object.values(netMap).filter((d) => d.net !== 0).sort((a, b) => Math.abs(b.net) - Math.abs(a.net)).slice(0, 3);

  return (
    <div style={{
      background: "white",
      borderRadius: 24,
      border: "1px solid #F0EEFF",
      padding: 20,
    }}>
      <div style={{ fontWeight: 700, fontSize: 16, color: "#1a1a2e", marginBottom: 16 }}>Quick Settle</div>

      {people.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 0", color: "#9CA3AF", fontSize: 14 }}>
          All settled up! 🎉
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {people.map((p) => (
              <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: "#EDE9FE", color: "#7C3AED",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: 14, flexShrink: 0,
                }}>
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#1a1a2e" }}>{p.name}</div>
                </div>
                <div style={{ color: p.net > 0 ? "#10B981" : "#EF4444", fontWeight: 700, fontSize: 13, marginRight: 8 }}>
                  {p.net > 0 ? "+" : ""}₹{Math.abs(p.net).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </div>
                <Link
                  href={`/groups?settle=${p.name}`}
                  style={{
                    background: p.net > 0 ? COLORS.primaryFixed : COLORS.errorContainer,
                    color: p.net > 0 ? COLORS.primaryContainer : COLORS.error,
                    borderRadius: BORDER_RADIUS.full, padding: `${SPACING.xs} ${SPACING.sm}`,
                    fontSize: TYPOGRAPHY.labelSm.fontSize, fontWeight: TYPOGRAPHY.labelSm.fontWeight, textDecoration: "none", whiteSpace: "nowrap",
                  }}
                >
                  {p.net > 0 ? "Settle" : "Pay"}
                </Link>
              </div>
            ))}
          </div>
          <Link
            href="/activity"
            style={{ display: "block", textAlign: "center", marginTop: 16, color: "#7C3AED", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
          >
            See all balances
          </Link>
        </>
      )}
    </div>
  );
}

// ── RECENT ACTIVITY PANEL ────────────────────────────────────────────────────
function RecentActivityPanel({ groups, currentUserId }: { groups: Group[]; currentUserId: number }) {
  const all = groups
    .flatMap((g) => (g.expenses || []).map((e) => ({ ...e, groupName: g.name, groupEmoji: g.emoji })))
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 5);

  const CATEGORY_EMOJIS: Record<string, string> = {
    food: "🍔", transport: "🚗", movie: "🎬", hotel: "🏨",
    grocery: "🛒", entertainment: "🎮", travel: "✈️",
  };

  function getEmoji(exp: { description: string; category?: string | null }) {
    const cat = (exp.category || "").toLowerCase();
    for (const [key, emoji] of Object.entries(CATEGORY_EMOJIS)) {
      if (cat.includes(key) || exp.description.toLowerCase().includes(key)) return emoji;
    }
    return "💸";
  }

  return (
    <div style={{
      background: "white",
      borderRadius: 24,
      border: "1px solid #F0EEFF",
      padding: 20,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: "#1a1a2e" }}>Recent Activity</div>
        <Link href="/activity" style={{ color: "#7C3AED", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
          View history
        </Link>
      </div>

      {all.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 0", color: "#9CA3AF", fontSize: 14 }}>
          No activity yet
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {all.map((exp, idx) => {
            const iPaid = exp.paidById === currentUserId;
            const nameParts = exp.paidBy?.name || (iPaid ? "You" : "Someone");
            const mySplit = exp.splits.find((s) => s.userId === currentUserId);
            const myAmount = iPaid ? exp.amount : (mySplit ? mySplit.amount : 0);

            return (
              <div
                key={exp.id}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 0",
                  borderBottom: idx < all.length - 1 ? "1px solid #F5F0FF" : "none",
                }}
              >
                {/* Icon */}
                <div style={{
                  width: 56, height: 56, flexShrink: 0,
                  background: "#F5F0FF", borderRadius: 16,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 24,
                }}>
                  {getEmoji(exp)}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#1D1A24", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {exp.description}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, background: "#F0EEFF", color: "#4A4455", borderRadius: 999, padding: "2px 8px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {exp.groupName}
                    </span>
                    <span style={{ fontSize: 12, color: "#9CA3AF" }}>{timeAgo(exp.createdAt)}</span>
                  </div>
                </div>

                {/* Amount */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: iPaid ? "#10B981" : "#EF4444", letterSpacing: "-0.3px" }}>
                    {iPaid ? "+" : "−"}₹{myAmount.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </div>
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2, fontWeight: 500 }}>
                    {iPaid ? `Lent to ${exp.splits.length - 1 || 1} people` : `Paid by ${nameParts}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── QUICK ADD MODAL (Unchanged logic) ───────────────────────────────────────
interface QuickAddModalProps {
  groups: Group[];
  currentUserId: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

function QuickAddModal({ groups, currentUserId, onClose, onSuccess }: QuickAddModalProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<number | "">("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidById, setPaidById] = useState<number | "">(currentUserId || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const descRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => descRef.current?.focus(), 80); }, []);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const members = selectedGroup ? selectedGroup.members.map((m) => m.user) : [];

  const handleSubmit = async () => {
    if (!selectedGroupId || !description.trim() || !amount || parseFloat(amount) <= 0 || !paidById) {
      setError("Please fill in all fields."); return;
    }
    const total = parseFloat(amount);
    if (members.length === 0) { setError("No members in group."); return; }
    const perPerson = Math.round((total / members.length) * 100) / 100;
    const splits = members.map((m, i) => {
      const rest = members.slice(0, -1).reduce((s) => s + perPerson, 0);
      return { userId: m.id, amount: i === members.length - 1 ? Math.round((total - rest) * 100) / 100 : perPerson };
    });
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/groups/${selectedGroupId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim(), amount: total, paidById: Number(paidById), splits }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || "Failed"); setSaving(false); return; }
      setSuccess(true);
      setTimeout(() => { onSuccess(); onClose(); }, 800);
    } catch { setError("Network error."); setSaving(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center", background: "rgba(15,23,42,0.55)", backdropFilter: "blur(6px)" }} onClick={onClose}>
      <div style={{ background: COLORS.surface, borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 540, padding: `${SPACING.xs} 0 ${SPACING.xl}`, boxShadow: SHADOWS.lg }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "center", padding: `${SPACING.md} 0 ${SPACING.xs}` }}>
          <div style={{ width: 36, height: 4, borderRadius: BORDER_RADIUS.sm, background: COLORS.outline }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: `${SPACING.xs} ${SPACING.lg} ${SPACING.md}` }}>
          <div>
            <h2 style={{ fontSize: TYPOGRAPHY.display.fontSize, fontWeight: 900, color: COLORS.onSurface, margin: 0 }}>Add Expense</h2>
            <p style={{ fontSize: TYPOGRAPHY.bodyMd.fontSize, color: COLORS.neutral[400], margin: `${SPACING.xs} 0 0` }}>Split equally among all members</p>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: "50%", background: COLORS.surfaceContainerLow, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: COLORS.onSurfaceVariant }}>close</span>
          </button>
        </div>

        {success ? (
          <div style={{ padding: SPACING.xl + " " + SPACING.lg, display: "flex", flexDirection: "column", alignItems: "center", gap: SPACING.sm }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: COLORS.successContainer, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 28, color: COLORS.success, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
            <p style={{ fontWeight: 800, color: COLORS.onSurface, fontSize: TYPOGRAPHY.bodyLg.fontSize, margin: 0 }}>Expense added!</p>
          </div>
        ) : (
          <div style={{ padding: `0 ${SPACING.lg}`, display: "flex", flexDirection: "column", gap: SPACING.lg }}>
            {error && <div style={{ background: COLORS.errorContainer, border: `1px solid ${COLORS.error}`, borderRadius: BORDER_RADIUS.md, padding: SPACING.sm + " " + SPACING.md, color: COLORS.error, fontSize: TYPOGRAPHY.bodyMd.fontSize, fontWeight: 600 }}>{error}</div>}
            <div>
              <label style={STYLES.label}>Group</label>
              <select value={selectedGroupId} onChange={(e) => setSelectedGroupId(Number(e.target.value) || "")} style={STYLES.input}>
                <option value="">Select a group...</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.emoji || ""} {g.name}</option>)}
              </select>
            </div>
            <div>
              <label style={STYLES.label}>What was it for?</label>
              <input ref={descRef} type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Dinner, Petrol, Movie tickets..." style={STYLES.input} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: SPACING.sm }}>
              <div>
                <label style={STYLES.label}>Amount (₹)</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" step="0.01" min="0" style={STYLES.input} />
              </div>
              <div>
                <label style={STYLES.label}>Paid by</label>
                <select value={paidById} onChange={(e) => setPaidById(Number(e.target.value) || "")} style={STYLES.input}>
                  <option value="">Select...</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>
            <button onClick={handleSubmit} disabled={saving} style={{ width: "100%", padding: SPACING.md, background: saving ? COLORS.secondary : COLORS.primaryContainer, color: COLORS.onPrimaryContainer, border: "none", borderRadius: BORDER_RADIUS.lg, fontSize: TYPOGRAPHY.labelMd.fontSize, fontWeight: TYPOGRAPHY.labelMd.fontWeight, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: SPACING.sm, opacity: saving ? 0.6 : 1 }}>
              {saving ? "Adding..." : <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span> Add Expense</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function Home() {
  const { data: session, status } = useSession();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const currentUserId = session?.user?.id ? parseInt(session.user.id as string) : null;

  useEffect(() => {
    if (status === "unauthenticated") redirect("/auth/signin");
  }, [status]);

  const fetchGroups = async () => {
    try {
      const res = await fetch("/api/groups");
      const data = await res.json();
      setGroups(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status !== "authenticated") return;
    fetchGroups();
  }, [status]);

  if (status === "loading" || (status === "authenticated" && loading)) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#F8F5FF" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 44, height: 44, border: "4px solid #EDE9FE", borderTopColor: "#7C3AED", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <p style={{ color: "#7C3AED", fontWeight: 600, fontSize: 14 }}>Loading your ledger…</p>
        </div>
      </div>
    );
  }

  return (
    <AppShell activeTab="dashboard">
      <div style={{ background: "#F8F5FF", minHeight: "100vh" }}>
        {/* ── HEADER — se-header handles responsive offset (0 on mobile, 260px on desktop) ── */}
        <header
          className="se-header"
          style={{
            height: 72, background: "white", borderBottom: "1px solid #F0EEFF",
            display: "flex", alignItems: "center", padding: "0 28px", gap: 16,
          }}
        >
          {/* Search pill */}
          <div style={{ flex: 1, position: "relative" }}>
            <span className="material-symbols-outlined" style={{
              position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
              fontSize: 18, color: "#9CA3AF",
            }}>search</span>
            <input
              type="text"
              placeholder="Search transactions, groups..."
              style={{
                width: "100%", background: "#F5F0FF", border: "1px solid #EDE9FE",
                borderRadius: 999, padding: "9px 16px 9px 42px",
                fontSize: 14, color: "#1D1A24", outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: SPACING.xs, flexShrink: 0 }}>
            {/* Bell */}
            <Link href="/notifications" style={{ width: 36, height: 36, borderRadius: "50%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: COLORS.onSurfaceVariant }}>notifications</span>
            </Link>
            {/* Gear */}
            <Link href="/settings" style={{ width: 36, height: 36, borderRadius: "50%", background: "none", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: COLORS.onSurfaceVariant }}>settings</span>
            </Link>
            {/* Avatar */}
            <Link href="/profile" style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "linear-gradient(135deg, #7C3AED, #5B21B6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontWeight: 800, fontSize: 14, textDecoration: "none",
            }}>
              {session?.user?.name?.charAt(0).toUpperCase() || "?"}
            </Link>
          </div>
        </header>

        {/* ── MAIN CONTENT ── */}
        <main style={{ padding: "96px 28px 60px", display: "flex", flexDirection: "column", gap: 24 }}>
          {currentUserId && (
            <>
              {/* BENTO ROW 1: Hero (8) + Actions+Settle (4) */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 20 }}>
                {/* LEFT col: Hero + Recent Activity */}
                <div style={{ gridColumn: "span 8", display: "flex", flexDirection: "column", gap: 20 }}>
                  <BalanceHeroCard
                    groups={groups}
                    currentUserId={currentUserId}
                    onSettleNow={() => setShowQuickAdd(true)}
                  />
                  <RecentActivityPanel groups={groups} currentUserId={currentUserId} />
                </div>

                {/* RIGHT col: Actions + Quick Settle */}
                <div style={{ gridColumn: "span 4", display: "flex", flexDirection: "column", gap: 20 }}>
                  <ActionsCard onAddExpense={() => setShowQuickAdd(true)} />
                  <QuickSettleCard groups={groups} currentUserId={currentUserId} />
                </div>
              </div>
            </>
          )}

          {/* Empty State */}
          {currentUserId && groups.length === 0 && !loading && (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "48px 24px", background: "white",
              borderRadius: 24, border: "2px dashed #EDE9FE",
            }}>
              <div style={{ width: 80, height: 80, background: "#F5F0FF", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, marginBottom: 16 }}>
                👥
              </div>
              <p style={{ fontWeight: 700, fontSize: 18, color: "#1a1a2e", margin: "0 0 8px" }}>No groups yet</p>
              <p style={{ color: "#9CA3AF", fontSize: 14, margin: "0 0 24px" }}>Create your first group to start splitting expenses</p>
              <Link href="/groups/new" style={{
                background: COLORS.primaryContainer, color: COLORS.onPrimaryContainer, borderRadius: BORDER_RADIUS.md,
                padding: `${SPACING.sm} ${SPACING.lg}`, fontWeight: TYPOGRAPHY.labelMd.fontWeight, fontSize: TYPOGRAPHY.labelMd.fontSize, textDecoration: "none",
              }}>
                Create Group
              </Link>
            </div>
          )}
        </main>

        {/* ── Desktop FAB ── */}
        {currentUserId && (
          <button
            onClick={() => setShowQuickAdd(true)}
            style={{
              position: "fixed", bottom: SPACING.lg, right: SPACING.lg,
              width: 56, height: 56,
              background: COLORS.primaryContainer, color: COLORS.onPrimaryContainer,
              borderRadius: "50%", border: "none", cursor: "pointer",
              boxShadow: SHADOWS.lg,
              display: "none",
              alignItems: "center", justifyContent: "center",
              zIndex: 50,
            }}
            className="md-fab"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 26 }}>add</span>
          </button>
        )}

        {/* FAB show on md+ */}
        <style>{`
          @media (min-width: 768px) { .md-fab { display: flex !important; } }
        `}</style>

        {/* ── Quick Add Modal ── */}
        {showQuickAdd && currentUserId && (
          <QuickAddModal
            groups={groups}
            currentUserId={currentUserId}
            onClose={() => setShowQuickAdd(false)}
            onSuccess={() => { setLoading(true); fetchGroups(); }}
          />
        )}
      </div>
    </AppShell>
  );
}
