"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Plus, X, Check, Bell, Settings, Search, ArrowUp, ArrowDown, Zap } from "lucide-react";
import { AppShell } from "@/app/components/AppSidebar";
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS, STYLES, mergeStyles } from "@/lib/designSystem";

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

// ── BALANCE HERO CARD (Redesigned) ──────────────────────────────────────────
function BalanceHeroCard({
  groups, currentUserId, onAddExpense,
}: {
  groups: Group[]; currentUserId: number; onAddExpense: () => void;
}) {
  let youOwe = 0, owedToYou = 0;
  groups.forEach((g) => {
    const b = getBalance(g, currentUserId);
    if (b > 0) owedToYou += b;
    else youOwe += Math.abs(b);
  });
  const total = owedToYou - youOwe;

  return (
    <div className="lg:col-span-8 bg-primary-container rounded-3xl p-xl text-on-primary shadow-xl relative overflow-hidden">
      {/* Net Balance Label */}
      <div className="font-label-md text-label-md text-on-primary-container opacity-80 mb-sm tracking-wider uppercase">
        NET BALANCE
      </div>

      {/* Balance Amount */}
      <div className="font-display text-display mb-lg text-on-primary-container" style={{ letterSpacing: "-0.02em" }}>
        ₹{Math.abs(total).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
      </div>

      {/* Two Glassmorphism Sub-Panels */}
      <div className="grid grid-cols-2 gap-lg">
        {/* You Are Owed */}
        <div className="bg-white/10 backdrop-blur-md p-md rounded-2xl border border-white/10">
          <div className="font-label-sm text-label-sm text-on-primary-container/70 uppercase tracking-wide mb-xs">
            You Are Owed
          </div>
          <div className="font-headline-md text-headline-md text-success mb-xs">
            ₹{owedToYou.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
          <div className="flex items-center gap-xs text-on-primary-container/70 text-label-sm">
            <ArrowUp size={14} /> Incoming
          </div>
        </div>

        {/* You Owe */}
        <div className="bg-white/10 backdrop-blur-md p-md rounded-2xl border border-white/10">
          <div className="font-label-sm text-label-sm text-on-primary-container/70 uppercase tracking-wide mb-xs">
            You Owe
          </div>
          <div className="font-headline-md text-headline-md text-error mb-xs">
            ₹{youOwe.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
          <div className="flex items-center gap-xs text-on-primary-container/70 text-label-sm">
            <ArrowDown size={14} /> Outgoing
          </div>
        </div>
      </div>
    </div>
  );
}

// ── NEXT TRIP CARD (New) ────────────────────────────────────────────────────
function NextTripCard() {
  return (
    <div className="lg:col-span-4 bg-surface-container-highest p-lg rounded-3xl flex flex-col justify-between h-full shadow-sm border border-outline-variant/30">
      <div>
        <div className="font-headline-md text-headline-md text-on-surface mb-xs">
          Create a Group?
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Start a new group with friends to track shared expenses together.
        </p>
      </div>
      <Link href="/groups/new" className="py-md px-lg bg-inverse-surface text-on-primary-container rounded-xl font-label-md w-fit hover:scale-105 transition-transform inline-flex items-center justify-center text-white">
        Create Group →
      </Link>
    </div>
  );
}

// ── RECENT ACTIVITY PANEL (Redesigned) ──────────────────────────────────────
function RecentActivityPanel({ groups, currentUserId }: { groups: Group[]; currentUserId: number }) {
  const all = groups
    .flatMap((g) => (g.expenses || []).map((e) => ({ ...e, groupName: g.name, groupEmoji: g.emoji })))
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 5);

  const getActivityColor = (category?: string | null) => {
    if (category?.toLowerCase().includes("food")) return { bg: "bg-secondary-fixed", text: "text-primary" };
    if (category?.toLowerCase().includes("transport")) return { bg: "bg-secondary-fixed", text: "text-primary" };
    return { bg: "bg-surface-container-highest", text: "text-tertiary" };
  };

  return (
    <div className="lg:col-span-7 bg-white rounded-3xl p-lg shadow-sm border border-outline-variant/30">
      {/* Header */}
      <div className="flex items-center justify-between mb-lg">
        <h3 className="font-headline-md text-headline-md text-on-surface">Recent Activity</h3>
        <Link href="/activity" className="font-label-sm text-label-sm text-primary hover:underline">
          View All →
        </Link>
      </div>

      {/* Activity Items */}
      {all.length === 0 ? (
        <div className="text-center py-xl">
          <p className="font-body-md text-body-md text-on-surface-variant">No activity yet</p>
        </div>
      ) : (
        <div className="divide-y divide-surface-container">
          {all.map((exp, idx) => {
            const iPaid = exp.paidById === currentUserId;
            const nameParts = exp.paidBy?.name || (iPaid ? "You" : "Someone");
            const initChar = nameParts.charAt(0).toUpperCase();
            const colors = getActivityColor(exp.category);

            return (
              <div key={exp.id} className="py-md flex items-center justify-between group">
                {/* Icon Circle */}
                <div className={`w-12 h-12 rounded-full ${colors.bg} flex items-center justify-center flex-shrink-0 ${colors.text}`}>
                  <span className="text-body-lg font-bold">
                    {exp.description.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Title Block */}
                <div className="flex-1 ml-md min-w-0">
                  <p className="font-body-md text-body-md text-on-surface overflow-hidden text-ellipsis whitespace-nowrap">
                    {iPaid ? "You" : nameParts} paid ₹{exp.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })} for {exp.description}
                  </p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    {timeAgo(exp.createdAt)}
                  </p>
                </div>

                {/* Right Side Label */}
                <div className="flex-shrink-0 ml-md">
                  {iPaid ? (
                    <span className="font-label-md text-label-md text-primary">
                      +₹{exp.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </span>
                  ) : (
                    <span className="font-label-md text-label-md text-error">
                      −₹{exp.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── QUICK SETTLE PANEL (New) ────────────────────────────────────────────────
function QuickSettlePanel({ groups, currentUserId }: { groups: Group[]; currentUserId: number }) {
  // Calculate who owes current user (positive net balance)
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

  const debtors = Object.values(netMap)
    .filter((d) => d.net > 0)
    .sort((a, b) => b.net - a.net);

  return (
    <div className="lg:col-span-5 bg-secondary-fixed/30 rounded-3xl p-lg border border-secondary-fixed/50">
      {/* Header */}
      <div className="flex items-center gap-sm mb-lg">
        <span className="text-xl">⚡</span>
        <h3 className="font-label-md text-label-md text-secondary uppercase tracking-wide">Quick Settle</h3>
      </div>

      {/* Settle Cards */}
      {debtors.length === 0 ? (
        <div className="text-center py-xl">
          <p className="font-body-md text-body-md text-on-surface-variant">All settled up! 🎉</p>
        </div>
      ) : (
        <div className="space-y-md">
          {debtors.map((debtor) => (
            <div key={debtor.name} className="bg-white p-md rounded-2xl flex items-center justify-between shadow-sm border border-outline-variant/20">
              <div className="flex-1 min-w-0">
                <p className="font-label-md text-label-md text-on-surface">{debtor.name}</p>
                <p className="font-label-sm text-label-sm text-error">
                  Owes ₹{debtor.net.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </p>
              </div>
              <Link
                href={`/groups?settle=${debtor.name}`}
                className="ml-md px-md py-xs bg-primary text-white rounded-full text-label-sm font-label-md hover:brightness-110 transition-all active:scale-95 flex-shrink-0"
              >
                Settle
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── QUICK ADD MODAL (Unchanged from previous) ──────────────────────────────
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
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: "50%", background: COLORS.neutral[100], border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={18} color={COLORS.neutral[500]} />
          </button>
        </div>

        {success ? (
          <div style={{ padding: SPACING.xl + " " + SPACING.lg, display: "flex", flexDirection: "column", alignItems: "center", gap: SPACING.sm }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: COLORS.successContainer, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Check size={28} color={COLORS.success} />
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
            <button onClick={handleSubmit} disabled={saving} style={{ width: "100%", padding: SPACING.md, background: saving ? COLORS.secondary : COLORS.primaryContainer, color: "white", border: "none", borderRadius: BORDER_RADIUS.lg, fontSize: TYPOGRAPHY.bodyMd.fontSize, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: SPACING.sm }}>
              {saving ? "Adding..." : <><Plus size={18} /> Add Expense</>}
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
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-lg">
          <div className="w-11 h-11 border-4 border-outlineVariant border-t-primaryContainer rounded-full animate-spin" />
          <p className="text-primaryContainer font-semibold text-body-md">Loading your ledger…</p>
        </div>
      </div>
    );
  }

  return (
    <AppShell activeTab="dashboard">
      <div className="bg-background min-h-screen">
        {/* Top Header */}
        <header className="h-16 sticky top-0 z-40 bg-surface border-b border-outline-variant flex items-center justify-between px-lg">
          {/* Search Input */}
          <div className="relative w-64">
            <Search size={18} className="absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Search groups..."
              className="w-full pl-10 pr-md py-xs rounded-full border border-outline-variant bg-surface-container-low focus:ring-2 focus:ring-primary text-body-md outline-none"
            />
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-md">
            <button className="p-sm rounded-full hover:bg-surface-container-low text-on-surface-variant">
              <Bell size={18} />
            </button>
            <button className="p-sm rounded-full hover:bg-surface-container-low text-on-surface-variant">
              <Settings size={18} />
            </button>
            <Link href="/profile" className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-bold text-label-md hover:shadow-md transition-shadow">
              {session?.user?.name?.charAt(0).toUpperCase() || "?"}
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-container-max mx-auto p-lg space-y-lg">
          {/* Row 1: Hero (8 cols) + Next Trip (4 cols) */}
          {currentUserId && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
              <BalanceHeroCard
                groups={groups}
                currentUserId={currentUserId}
                onAddExpense={() => setShowQuickAdd(true)}
              />
              <NextTripCard />
            </div>
          )}

          {/* Row 2: Recent Activity (7 cols) + Quick Settle (5 cols) */}
          {currentUserId && groups.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
              <RecentActivityPanel groups={groups} currentUserId={currentUserId} />
              <QuickSettlePanel groups={groups} currentUserId={currentUserId} />
            </div>
          )}

          {/* Empty State */}
          {currentUserId && groups.length === 0 && (
            <div className="w-full flex flex-col items-center justify-center py-xl bg-surface-container-low rounded-3xl border-2 border-dashed border-outline-variant/50">
              <div className="w-24 h-24 bg-surface-variant rounded-full flex items-center justify-center mb-lg text-4xl">
                👥
              </div>
              <p className="font-headline-md text-headline-md text-on-surface mb-sm">No groups yet</p>
              <p className="font-body-md text-body-md text-on-surface-variant mb-lg">Create your first group to start splitting expenses</p>
              <Link href="/groups/new" className="px-xl py-md bg-primary text-white rounded-xl font-label-md hover:brightness-110 transition-all">
                Create Group
              </Link>
            </div>
          )}
        </main>

        {/* Mobile FAB */}
        {currentUserId && groups.length > 0 && (
          <button
            onClick={() => setShowQuickAdd(true)}
            className="md:hidden fixed bottom-lg right-lg w-16 h-16 bg-primary text-white rounded-2xl shadow-xl z-50 flex items-center justify-center active:scale-95 transition-transform"
          >
            <Plus size={32} />
          </button>
        )}

        {/* Quick Add Modal */}
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
