"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Plus, X, Check, Bell, Settings, ChevronRight } from "lucide-react";
import { AppShell } from "@/app/components/AppSidebar";

// ── CONSTANTS ──────────────────────────────────────────────────────────────
const PURPLE    = "#7C3AED";
const PURPLE_MID = "#6D28D9";
const TEAL      = "#0EA5E9";
const TEAL_DARK = "#0284C7";
const PAGE_BG   = "#F0EEFF";

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
  return paid - owes;
}

// ── AVATAR STACK ─────────────────────────────────────────────────────────────
function AvatarStack({ members, max = 4 }: { members: { user: { name: string } }[]; max?: number }) {
  const shown = members.slice(0, max);
  const extra = members.length - max;
  const colors = [PURPLE, "#A78BFA", "#6D28D9", "#8B5CF6", TEAL];
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {shown.map((m, i) => (
        <div key={i} title={m.user.name} style={{
          width: 24, height: 24, borderRadius: "50%",
          background: colors[i % colors.length],
          border: "2px solid white",
          marginLeft: i === 0 ? 0 : -7,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, fontWeight: 700, color: "white",
          zIndex: shown.length - i, position: "relative",
        }}>
          {m.user.name.charAt(0).toUpperCase()}
        </div>
      ))}
      {extra > 0 && (
        <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#EDE9FE", border: "2px solid white", marginLeft: -7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: PURPLE }}>
          +{extra}
        </div>
      )}
    </div>
  );
}

// ── BALANCE HERO CARD ────────────────────────────────────────────────────────
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

  // SVG sparkline wave path (decorative)
  const wave = "M0,60 C60,20 120,90 200,50 C280,10 340,80 440,40 C540,0 600,70 720,35 C840,0 900,55 1000,30 L1000,120 L0,120 Z";

  return (
    <div style={{
      borderRadius: 20,
      overflow: "hidden",
      marginBottom: 16,
      position: "relative",
      background: "linear-gradient(130deg, #A78BFA 0%, #7C3AED 30%, #4F46E5 65%, #38BDF8 100%)",
      boxShadow: "0 8px 32px rgba(124,58,237,0.25)",
      minHeight: 160,
    }}>
      {/* Wave overlay */}
      <svg viewBox="0 0 1000 120" preserveAspectRatio="none" style={{ position: "absolute", bottom: 0, left: 0, right: 0, width: "100%", height: 90, opacity: 0.18, pointerEvents: "none" }}>
        <path d={wave} fill="white" />
      </svg>
      {/* Dot markers on wave */}
      <svg viewBox="0 0 1000 80" preserveAspectRatio="none" style={{ position: "absolute", bottom: 16, left: 0, right: 0, width: "100%", height: 60, opacity: 0.6, pointerEvents: "none" }}>
        <polyline points="0,55 160,35 300,48 450,22 600,38 750,18 900,30 1000,22" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        {[160,300,450,600,750,900].map((x, i) => {
          const ys = [35,48,22,38,18,30];
          return <circle key={i} cx={x} cy={ys[i]} r="5" fill="white" opacity="0.9" />;
        })}
      </svg>

      {/* Content */}
      <div style={{ padding: "20px 22px 28px", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 6px" }}>
              TOTAL BALANCE
            </p>
            <p style={{ fontSize: 42, fontWeight: 900, color: "#fff", margin: "0 0 4px", letterSpacing: "-1.5px", lineHeight: 1 }}>
              ₹{Math.abs(total).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", margin: 0, display: "flex", alignItems: "center", gap: 4, fontWeight: 500 }}>
              <span style={{ fontSize: 12 }}>{total >= 0 ? "↑" : "↓"}</span>
              {total >= 0 ? `+₹${owedToYou.toLocaleString("en-IN", { maximumFractionDigits: 0 })} this month` : `-₹${youOwe.toLocaleString("en-IN", { maximumFractionDigits: 0 })} this month`}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", borderRadius: 10, padding: "6px 12px", fontSize: 12, fontWeight: 600, color: "white", border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              Last 7 days <span style={{ fontSize: 10 }}>▾</span>
            </div>
            <button
              onClick={onAddExpense}
              style={{ width: 36, height: 36, borderRadius: 10, background: TEAL, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 12px ${TEAL}66` }}
            >
              <Plus size={20} color="white" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── YOU OWE / OWED TO YOU CARDS ───────────────────────────────────────────────
function DebtCards({ groups, currentUserId }: { groups: Group[]; currentUserId: number }) {
  let youOwe = 0, owedToYou = 0;
  groups.forEach((g) => {
    const b = getBalance(g, currentUserId);
    if (b > 0) owedToYou += b;
    else youOwe += Math.abs(b);
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
      {/* You Owe */}
      <div style={{ background: "white", borderRadius: 16, padding: "16px 18px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#FFF1F2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 19V5M5 12l7-7 7 7" stroke="#FB7185" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 12, color: "#64748b", fontWeight: 600, margin: "0 0 2px" }}>You Owe</p>
            <p style={{ fontSize: 18, fontWeight: 900, color: "#FB7185", margin: 0, letterSpacing: "-0.5px" }}>
              ₹{youOwe.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
        <Link href="/activity" style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textDecoration: "none", padding: "5px 12px", borderRadius: 20, border: "1.5px solid #E2E8F0", background: "white" }}>
          View
        </Link>
      </div>

      {/* Owed to You */}
      <div style={{ background: "white", borderRadius: 16, padding: "16px 18px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12l7 7 7-7" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 12, color: "#64748b", fontWeight: 600, margin: "0 0 2px" }}>Owed to You</p>
            <p style={{ fontSize: 18, fontWeight: 900, color: "#10B981", margin: 0, letterSpacing: "-0.5px" }}>
              ₹{owedToYou.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
        <Link href="/activity" style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textDecoration: "none", padding: "5px 12px", borderRadius: 20, border: "1.5px solid #E2E8F0", background: "white" }}>
          View
        </Link>
      </div>
    </div>
  );
}

// ── GROUP CARD ────────────────────────────────────────────────────────────────
function GroupCard({ group, currentUserId }: { group: Group; currentUserId: number }) {
  const balance = getBalance(group, currentUserId);
  const isOwed = balance > 0;
  const isOwes = balance < 0;
  const latestExpense = (group.expenses || []).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0];
  const totalBills = (group.expenses || []).length;

  return (
    <div style={{ background: "white", borderRadius: 18, padding: "18px 20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 12, border: "1px solid #F3F0FF" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {/* Group icon */}
        <div style={{ width: 48, height: 48, borderRadius: 14, background: "#F5F3FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: group.emoji ? 24 : 18, fontWeight: 700, color: PURPLE, flexShrink: 0, border: "1px solid #EDE9FE" }}>
          {group.emoji || group.name.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontWeight: 800, fontSize: 16, color: "#0f172a", margin: 0 }}>{group.name}</p>
            <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>{timeAgo(latestExpense?.createdAt)}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <AvatarStack members={group.members} max={4} />
            <span style={{ fontSize: 12, color: "#94a3b8" }}>·</span>
            <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>{totalBills} bill{totalBills !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>

      {/* Balance row + actions */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
        <div>
          <p style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, margin: "0 0 2px" }}>
            {isOwed ? "You are owed" : isOwes ? "You owe" : "All settled"}
          </p>
          <p style={{ fontSize: 22, fontWeight: 900, color: isOwed ? PURPLE : isOwes ? "#FB7185" : "#94a3b8", margin: 0, letterSpacing: "-0.5px" }}>
            ₹{Math.abs(balance).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href={`/groups/${group.id}`} style={{ padding: "8px 16px", borderRadius: 10, border: "1.5px solid #E2E8F0", background: "white", fontSize: 13, fontWeight: 700, color: "#374151", textDecoration: "none" }}>
            View Details
          </Link>
          {isOwes && (
            <Link href={`/groups/${group.id}`} style={{ padding: "8px 16px", borderRadius: 10, background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`, fontSize: 13, fontWeight: 700, color: "white", textDecoration: "none", boxShadow: `0 3px 10px ${TEAL}44` }}>
              Settle
            </Link>
          )}
          {isOwed && (
            <Link href={`/groups/${group.id}`} style={{ padding: "8px 16px", borderRadius: 10, background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_MID})`, fontSize: 13, fontWeight: 700, color: "white", textDecoration: "none", boxShadow: `0 3px 10px ${PURPLE}44` }}>
              Remind
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ── RECENT ACTIVITY PANEL ─────────────────────────────────────────────────────
function RecentActivityPanel({ groups, currentUserId }: { groups: Group[]; currentUserId: number }) {
  const all = groups
    .flatMap((g) => (g.expenses || []).map((e) => ({ ...e, groupName: g.name, groupEmoji: g.emoji })))
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 5);

  const colors = [PURPLE, "#10B981", TEAL, "#F59E0B", "#FB7185"];

  return (
    <div style={{ background: "white", borderRadius: 18, padding: "18px 18px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", margin: 0 }}>Recent Activity</h3>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981" }} />
        </div>
        <Link href="/activity" style={{ fontSize: 12, fontWeight: 700, color: PURPLE, textDecoration: "none" }}>View All</Link>
      </div>

      {all.length === 0 ? (
        <p style={{ fontSize: 13, color: "#94a3b8", textAlign: "center", padding: "16px 0", margin: 0 }}>No activity yet</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {all.map((exp, idx) => {
            const iPaid = exp.paidById === currentUserId;
            const nameParts = exp.paidBy?.name || (iPaid ? "You" : "Someone");
            const initChar = nameParts.charAt(0).toUpperCase();
            return (
              <div key={exp.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: idx < all.length - 1 ? "1px solid #F8F5FF" : "none" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: colors[idx % colors.length] + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: colors[idx % colors.length], flexShrink: 0 }}>
                  {initChar}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {iPaid ? "You" : nameParts} paid ₹{exp.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })} for {exp.description}
                  </p>
                  <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>{timeAgo(exp.createdAt)}</p>
                </div>
                <p style={{ fontSize: 13, fontWeight: 800, color: iPaid ? "#10B981" : "#FB7185", margin: 0, flexShrink: 0 }}>
                  {iPaid ? "+" : "-"}₹{exp.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── INSIGHTS MINI CARDS ───────────────────────────────────────────────────────
function InsightMiniCards({ groups, currentUserId }: { groups: Group[]; currentUserId: number }) {
  const topGroup = groups.length > 0
    ? groups.reduce((top, g) => (g.expenses || []).length > (top.expenses || []).length ? g : top, groups[0])
    : null;

  const categoryMap: Record<string, number> = {};
  groups.forEach((g) => {
    (g.expenses || []).forEach((e) => {
      let cat: string;
      if (e.category) {
        cat = e.category;
      } else {
        const lower = e.description.toLowerCase();
        cat = lower.includes("food") || lower.includes("dinner") || lower.includes("lunch") || lower.includes("restaurant") || lower.includes("snack") || lower.includes("cafe") || lower.includes("pizza") ? "Food"
          : lower.includes("petrol") || lower.includes("fuel") || lower.includes("uber") || lower.includes("cab") || lower.includes("auto") || lower.includes("ola") || lower.includes("train") || lower.includes("bus") ? "Transport"
          : lower.includes("rent") || lower.includes("hotel") || lower.includes("house") || lower.includes("flat") ? "Housing"
          : lower.includes("movie") || lower.includes("netflix") || lower.includes("game") ? "Entertainment"
          : lower.includes("grocery") || lower.includes("supermarket") || lower.includes("vegetables") ? "Groceries"
          : "Other";
      }
      categoryMap[cat] = (categoryMap[cat] || 0) + e.amount;
    });
  });
  const topCat = Object.entries(categoryMap).sort((a, b) => b[1] - a[1])[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ background: "white", borderRadius: 16, padding: "14px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #F3F0FF" }}>
        <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, margin: "0 0 8px" }}>You spend the most</p>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {topCat ? (
            <>
              <span style={{ fontSize: 22 }}>
                {topCat[0] === "Food" ? "🍔" : topCat[0] === "Transport" ? "🚗" : topCat[0] === "Housing" ? "🏠" : topCat[0] === "Entertainment" ? "🎬" : topCat[0] === "Groceries" ? "🛒" : topCat[0] === "Shopping" ? "🛍️" : topCat[0] === "Travel" ? "✈️" : topCat[0] === "Utilities" ? "💡" : "💸"}
              </span>
              <div>
                <p style={{ fontSize: 14, fontWeight: 900, color: PURPLE, margin: "0 0 1px" }}>{topCat[0]}</p>
                <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>₹{topCat[1].toLocaleString("en-IN", { maximumFractionDigits: 0 })} last month</p>
              </div>
            </>
          ) : (
            <>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#F5F3FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={PURPLE} strokeWidth="2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", margin: "0 0 1px" }}>No expenses yet</p>
                <p style={{ fontSize: 11, color: "#cbd5e1", margin: 0 }}>Add expenses to track</p>
              </div>
            </>
          )}
        </div>
      </div>
      <div style={{ background: "white", borderRadius: 16, padding: "14px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #F3F0FF" }}>
        <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, margin: "0 0 8px" }}>Top group</p>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {topGroup ? (
            <>
              <span style={{ fontSize: 22 }}>{topGroup.emoji || "👥"}</span>
              <div>
                <p style={{ fontSize: 14, fontWeight: 900, color: "#0f172a", margin: "0 0 1px" }}>{topGroup.name}</p>
                <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>{(topGroup.expenses || []).length} bills settled</p>
              </div>
            </>
          ) : (
            <>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", margin: "0 0 1px" }}>No groups yet</p>
                <p style={{ fontSize: 11, color: "#cbd5e1", margin: 0 }}>Create a group to start</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── INSIGHTS SECTION (bottom) ─────────────────────────────────────────────────
function InsightsSection({ groups, currentUserId }: { groups: Group[]; currentUserId: number }) {
  const topGroup = groups.length > 0
    ? groups.reduce((top, g) => (g.expenses || []).length > (top.expenses || []).length ? g : top, groups[0])
    : null;

  // Category: use stored category field first, fall back to keyword detection
  const categoryMap: Record<string, number> = {};
  groups.forEach((g) => {
    (g.expenses || []).forEach((e) => {
      let cat: string;
      if (e.category) {
        cat = e.category;
      } else {
        const lower = e.description.toLowerCase();
        cat = lower.includes("food") || lower.includes("dinner") || lower.includes("lunch") || lower.includes("restaurant") || lower.includes("snack") || lower.includes("breakfast") || lower.includes("cafe") || lower.includes("pizza") || lower.includes("biryani") ? "Food"
          : lower.includes("petrol") || lower.includes("fuel") || lower.includes("uber") || lower.includes("cab") || lower.includes("auto") || lower.includes("ola") || lower.includes("train") || lower.includes("bus") || lower.includes("flight") ? "Transport"
          : lower.includes("rent") || lower.includes("hotel") || lower.includes("house") || lower.includes("flat") || lower.includes("pg") ? "Housing"
          : lower.includes("movie") || lower.includes("netflix") || lower.includes("spotify") || lower.includes("game") ? "Entertainment"
          : lower.includes("grocery") || lower.includes("supermarket") || lower.includes("vegetables") || lower.includes("milk") ? "Groceries"
          : "Other";
      }
      categoryMap[cat] = (categoryMap[cat] || 0) + e.amount;
    });
  });
  const topCat = Object.entries(categoryMap).sort((a, b) => b[1] - a[1])[0];

  // Biggest debtor: net balance per person (what they owe you MINUS what you owe them)
  const netMap: Record<string, { name: string; net: number }> = {};
  groups.forEach((g) => {
    (g.expenses || []).forEach((e) => {
      if (Number(e.paidById) === currentUserId) {
        // Current user paid — others owe their split to current user
        e.splits.forEach((s) => {
          if (Number(s.userId) !== currentUserId) {
            const m = g.members.find((m) => Number(m.userId) === Number(s.userId));
            if (m) {
              const key = String(s.userId);
              if (!netMap[key]) netMap[key] = { name: m.user.name, net: 0 };
              netMap[key].net += s.amount; // they owe current user
            }
          }
        });
      } else {
        // Someone else paid — if current user is in splits, they owe the payer
        const mySplit = e.splits.find((s) => Number(s.userId) === currentUserId);
        if (mySplit) {
          const payer = g.members.find((m) => Number(m.userId) === Number(e.paidById));
          if (payer) {
            const key = String(e.paidById);
            if (!netMap[key]) netMap[key] = { name: payer.user.name, net: 0 };
            netMap[key].net -= mySplit.amount; // current user owes payer, reducing their net debt
          }
        }
      }
    });
  });
  // Biggest debtor = person with highest positive net (most owed TO current user)
  const biggestDebtor = Object.values(netMap)
    .filter(d => d.net > 0)
    .sort((a, b) => b.net - a.net)[0]
    ? { ...Object.values(netMap).filter(d => d.net > 0).sort((a, b) => b.net - a.net)[0], amount: Object.values(netMap).filter(d => d.net > 0).sort((a, b) => b.net - a.net)[0].net }
    : null;

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", margin: 0 }}>Insights</h2>
        <span style={{ fontSize: 14, color: "#94a3b8" }}>ℹ</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {/* You spend the most */}
        <div style={{ background: "white", borderRadius: 16, padding: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #F3F0FF" }}>
          <p style={{ fontSize: 12, color: "#64748b", fontWeight: 600, margin: "0 0 10px" }}>You spend the most</p>
          {topCat ? (
            <>
              <div style={{ fontSize: 28, marginBottom: 8 }}>
                {topCat[0] === "Food" ? "🍔" : topCat[0] === "Transport" ? "🚗" : topCat[0] === "Housing" ? "🏠" : topCat[0] === "Entertainment" ? "🎬" : topCat[0] === "Groceries" ? "🛒" : topCat[0] === "Shopping" ? "🛍️" : topCat[0] === "Travel" ? "✈️" : topCat[0] === "Utilities" ? "💡" : "💸"}
              </div>
              <p style={{ fontSize: 16, fontWeight: 900, color: PURPLE, margin: "0 0 3px" }}>{topCat[0]}</p>
              <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>₹{topCat[1].toLocaleString("en-IN", { maximumFractionDigits: 0 })} last month</p>
            </>
          ) : (
            <>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "#F5F3FF", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={PURPLE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#94a3b8", margin: "0 0 3px" }}>No data yet</p>
              <p style={{ fontSize: 12, color: "#cbd5e1", margin: 0 }}>Add expenses to track</p>
            </>
          )}
        </div>

        {/* Top Group */}
        <div style={{ background: "white", borderRadius: 16, padding: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #F3F0FF" }}>
          <p style={{ fontSize: 12, color: "#64748b", fontWeight: 600, margin: "0 0 10px" }}>Top group</p>
          {topGroup ? (
            <>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{topGroup.emoji || "👥"}</div>
              <p style={{ fontSize: 16, fontWeight: 900, color: "#0f172a", margin: "0 0 3px" }}>{topGroup.name}</p>
              <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>{(topGroup.expenses || []).length} bills · {topGroup.members.length} members</p>
            </>
          ) : (
            <>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                </svg>
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#94a3b8", margin: "0 0 3px" }}>No groups yet</p>
              <p style={{ fontSize: 12, color: "#cbd5e1", margin: 0 }}>Create a group to start</p>
            </>
          )}
        </div>

        {/* Biggest Debtor */}
        <div style={{ background: "white", borderRadius: 16, padding: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #F3F0FF" }}>
          <p style={{ fontSize: 12, color: "#64748b", fontWeight: 600, margin: "0 0 10px" }}>Biggest debtor</p>
          {biggestDebtor ? (
            <>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: `linear-gradient(135deg, ${PURPLE}, #5B21B6)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "white", marginBottom: 8 }}>
                {biggestDebtor.name.charAt(0).toUpperCase()}
              </div>
              <p style={{ fontSize: 16, fontWeight: 900, color: PURPLE, margin: "0 0 3px" }}>₹{biggestDebtor.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
              <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>{biggestDebtor.name.split(" ")[0]} owes you</p>
            </>
          ) : (
            <>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#10B981", margin: "0 0 3px" }}>All settled up!</p>
              <p style={{ fontSize: 12, color: "#cbd5e1", margin: 0 }}>No pending debts</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ONBOARDING ────────────────────────────────────────────────────────────────
function OnboardingCard() {
  return (
    <div style={{ background: "white", borderRadius: 18, padding: "32px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", textAlign: "center", border: "1px solid #F3F0FF", marginBottom: 12 }}>
      {/* Simple illustration placeholder */}
      <div style={{ width: 100, height: 80, margin: "0 auto 20px", position: "relative" }}>
        {[PURPLE, "#A78BFA", "#10B981"].map((c, i) => (
          <div key={i} style={{ position: "absolute", width: 44, height: 44, borderRadius: "50%", background: c, opacity: 0.85, top: i === 1 ? 0 : 16, left: i === 0 ? 0 : i === 1 ? 28 : 56, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, border: "2px solid white" }}>
            {["😊","😄","😎"][i]}
          </div>
        ))}
      </div>
      <p style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>
        Start splitting expenses with your friends
      </p>
      <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 20px", lineHeight: 1.5 }}>
        Create a group, add members, and start tracking shared expenses together.
      </p>
      <Link href="/groups/new" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 28px", background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_MID})`, color: "white", borderRadius: 14, textDecoration: "none", fontWeight: 700, fontSize: 14, boxShadow: `0 4px 14px ${PURPLE}44` }}>
        <Plus size={16} /> Create Group
      </Link>
    </div>
  );
}

// ── QUICK ADD MODAL ───────────────────────────────────────────────────────────
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
      <div style={{ background: "white", borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 540, padding: "8px 0 40px", boxShadow: "0 -12px 48px rgba(0,0,0,0.18)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "#e2e8f0" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 24px 18px" }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: "#0f172a", margin: 0 }}>Add Expense</h2>
            <p style={{ fontSize: 13, color: "#94a3b8", margin: "2px 0 0" }}>Split equally among all members</p>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: "50%", background: "#F1F5F9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={18} color="#64748b" />
          </button>
        </div>

        {success ? (
          <div style={{ padding: "32px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Check size={28} color="#16A34A" />
            </div>
            <p style={{ fontWeight: 800, color: "#0f172a", fontSize: 16, margin: 0 }}>Expense added!</p>
          </div>
        ) : (
          <div style={{ padding: "0 24px", display: "flex", flexDirection: "column", gap: 14 }}>
            {error && <div style={{ background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: 10, padding: "10px 14px", color: "#E11D48", fontSize: 13, fontWeight: 600 }}>{error}</div>}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 7 }}>Group</label>
              <select value={selectedGroupId} onChange={(e) => setSelectedGroupId(Number(e.target.value) || "")} style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #E2E8F0", borderRadius: 12, fontSize: 14, color: "#0f172a", background: "#F8FAFC", outline: "none", boxSizing: "border-box" }}>
                <option value="">Select a group...</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.emoji || ""} {g.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 7 }}>What was it for?</label>
              <input ref={descRef} type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Dinner, Petrol, Movie tickets..." style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #E2E8F0", borderRadius: 12, fontSize: 14, color: "#0f172a", background: "#F8FAFC", outline: "none", boxSizing: "border-box" }} onFocus={(e) => e.currentTarget.style.borderColor = PURPLE} onBlur={(e) => e.currentTarget.style.borderColor = "#E2E8F0"} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 7 }}>Amount (₹)</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#64748b", fontWeight: 700, fontSize: 15, pointerEvents: "none" }}>₹</span>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" step="0.01" min="0" style={{ width: "100%", padding: "11px 14px 11px 30px", border: "1.5px solid #E2E8F0", borderRadius: 12, fontSize: 18, fontWeight: 800, color: "#0f172a", background: "#F8FAFC", outline: "none", boxSizing: "border-box" }} onFocus={(e) => e.currentTarget.style.borderColor = PURPLE} onBlur={(e) => e.currentTarget.style.borderColor = "#E2E8F0"} onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 7 }}>Paid by</label>
                <select value={paidById} onChange={(e) => setPaidById(Number(e.target.value) || "")} style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #E2E8F0", borderRadius: 12, fontSize: 14, color: "#0f172a", background: "#F8FAFC", outline: "none", boxSizing: "border-box" }}>
                  <option value="">Select...</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>
            {selectedGroup && members.length > 0 && amount && parseFloat(amount) > 0 && (
              <div style={{ background: "#F8F5FF", borderRadius: 12, padding: "10px 14px", border: "1px solid #EDE9FE" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#64748b", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Split preview</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {members.map((m) => (
                    <span key={m.id} style={{ fontSize: 12, fontWeight: 600, color: PURPLE, background: "#EDE9FE", padding: "4px 10px", borderRadius: 20 }}>
                      {m.name.split(" ")[0]}: ₹{(parseFloat(amount) / members.length).toFixed(0)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <button onClick={handleSubmit} disabled={saving} style={{ width: "100%", padding: "14px", background: saving ? "#a78bfa" : `linear-gradient(135deg, ${PURPLE}, ${PURPLE_MID})`, color: "white", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: saving ? "none" : `0 4px 16px ${PURPLE}44`, marginTop: 4 }}>
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: PAGE_BG }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 44, height: 44, border: `4px solid #EDE9FE`, borderTopColor: PURPLE, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <p style={{ color: PURPLE, fontWeight: 600, fontSize: 15 }}>Loading your ledger…</p>
        </div>
      </div>
    );
  }

  const initial = session?.user?.name?.charAt(0).toUpperCase() || "?";

  return (
    <AppShell activeTab="dashboard">
      <div style={{ background: PAGE_BG, minHeight: "100vh" }}>

        {/* ── DESKTOP TOP HEADER ── */}
        <style>{`
          .splitease-desktop-header { display: none; }
          .splitease-mobile-header { display: flex; }
          @media (min-width: 1024px) {
            .splitease-desktop-header { display: flex !important; }
            .splitease-mobile-header { display: none !important; }
          }
        `}</style>
        <div className="splitease-desktop-header" style={{ alignItems: "center", justifyContent: "space-between", padding: "16px 28px", background: "white", borderBottom: "1px solid #F3F0FF", position: "sticky", top: 0, zIndex: 30 }}>
          {/* Left: logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: `linear-gradient(135deg, ${PURPLE}, #5B21B6)`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900, fontSize: 14 }}>
              {initial}
            </div>
            <span style={{ fontWeight: 900, fontSize: 18, color: "#0f172a", letterSpacing: "-0.3px" }}>SplitEase</span>
          </div>
          {/* Right: icons */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button style={{ width: 38, height: 38, borderRadius: "50%", background: "#F8F5FF", border: "1px solid #EDE9FE", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bell size={17} color="#64748b" />
            </button>
            <button style={{ width: 38, height: 38, borderRadius: "50%", background: "#F8F5FF", border: "1px solid #EDE9FE", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Settings size={17} color="#64748b" />
            </button>
            <Link href="/profile" style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${PURPLE}, #5B21B6)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "white", textDecoration: "none", boxShadow: `0 2px 8px ${PURPLE}44`, position: "relative" }}>
              {initial}
              <div style={{ position: "absolute", bottom: 1, right: 1, width: 8, height: 8, borderRadius: "50%", background: "#FB7185", border: "1.5px solid white" }} />
            </Link>
          </div>
        </div>

        {/* ── MOBILE HEADER ── */}
        <div className="splitease-mobile-header" style={{ alignItems: "center", justifyContent: "space-between", padding: "18px 18px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${PURPLE}, #5B21B6)`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900, fontSize: 14 }}>{initial}</div>
            <span style={{ fontWeight: 900, fontSize: 18, color: "#0f172a" }}>SplitEase</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ width: 36, height: 36, borderRadius: "50%", background: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}><Bell size={17} color="#64748b" /></button>
            <button style={{ width: 36, height: 36, borderRadius: "50%", background: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}><Settings size={17} color="#64748b" /></button>
          </div>
        </div>

        {/* ── TWO-COLUMN LAYOUT ── */}
        <style>{`
          @media (min-width: 1024px) {
            .splitease-two-col { display: grid !important; grid-template-columns: 1fr 300px !important; gap: 20px !important; padding: 24px !important; padding-top: 20px !important; }
            .splitease-left-col { padding: 0 !important; }
            .splitease-right-col { display: block !important; }
          }
        `}</style>
        <div className="splitease-two-col">

          {/* ── LEFT COLUMN ── */}
          <div style={{ padding: "0 16px 16px" }} className="splitease-left-col">

            {/* Balance hero */}
            {currentUserId && (
              <BalanceHeroCard
                groups={groups}
                currentUserId={currentUserId}
                onAddExpense={() => setShowQuickAdd(true)}
              />
            )}

            {/* Debt cards */}
            {currentUserId && (
              <DebtCards groups={groups} currentUserId={currentUserId} />
            )}

            {/* Active Groups */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: "#0f172a", margin: 0 }}>Active Groups</h2>
              <Link href="/groups" style={{ fontSize: 13, fontWeight: 700, color: PURPLE, textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>
                View All <ChevronRight size={14} />
              </Link>
            </div>

            {groups.length === 0 ? (
              <OnboardingCard />
            ) : (
              <>
                {groups.map((g) => currentUserId && (
                  <GroupCard key={g.id} group={g} currentUserId={currentUserId} />
                ))}
                <Link href="/groups/new" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px", borderRadius: 16, border: `2px dashed #DDD6FE`, textDecoration: "none", color: PURPLE, fontWeight: 700, fontSize: 13, marginTop: 4 }}>
                  <Plus size={16} /> Create New Group
                </Link>
              </>
            )}

            {/* Insights */}
            {currentUserId && (
              <InsightsSection groups={groups} currentUserId={currentUserId} />
            )}
          </div>

          {/* ── RIGHT COLUMN (desktop only) ── */}
          <div className="splitease-right-col">
            {currentUserId && (
              <>
                <RecentActivityPanel groups={groups} currentUserId={currentUserId} />
                <InsightMiniCards groups={groups} currentUserId={currentUserId} />
              </>
            )}
            {!currentUserId && (
              <div style={{ background: "white", borderRadius: 18, padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #F3F0FF" }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", margin: "0 0 10px" }}>Getting started</h3>
                <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: "0 0 14px" }}>Create your first group to start splitting expenses with friends.</p>
                <Link href="/groups/new" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px", background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_MID})`, color: "white", borderRadius: 12, textDecoration: "none", fontWeight: 700, fontSize: 13, boxShadow: `0 3px 10px ${PURPLE}44` }}>
                  <Plus size={15} /> Create Group
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ── MOBILE FAB ── */}
        {groups.length > 0 && (
          <button className="lg:hidden" onClick={() => setShowQuickAdd(true)} style={{ position: "fixed", bottom: 80, right: 20, zIndex: 100, width: 54, height: 54, borderRadius: "50%", background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 6px 20px ${TEAL}55` }}>
            <Plus size={24} color="white" />
          </button>
        )}

        {/* ── DESKTOP FAB ── */}
        <button className="hidden lg:flex" onClick={() => setShowQuickAdd(true)} style={{ position: "fixed", bottom: 28, right: 28, zIndex: 100, width: 50, height: 50, borderRadius: "50%", background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`, border: "none", cursor: "pointer", alignItems: "center", justifyContent: "center", boxShadow: `0 6px 20px ${TEAL}55` }} title="Add expense">
          <Plus size={22} color="white" />
        </button>

        {showQuickAdd && (
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
