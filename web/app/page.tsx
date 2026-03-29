"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Wallet, Users, Inbox, Plus, ChevronRight, Receipt, User, Zap, X, Check } from "lucide-react";

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
    paidBy?: { name: string };
    splits: { userId: number; amount: number }[];
    createdAt?: string;
  }[];
}

function SummaryCards({ groups, currentUserId }: { groups: Group[], currentUserId: number }) {
  const allExps = groups.flatMap(g => g.expenses || []);
  const totalAmount = allExps.reduce((sum, e) => sum + (e.amount || 0), 0);

  const youOwe = groups.reduce((sum, group) => {
    const expenses = group.expenses || [];
    const totalOwes = expenses.reduce((s, exp) => {
      const split = exp.splits.find(sp => sp.userId === currentUserId);
      return s + (split ? split.amount : 0);
    }, 0);
    const totalPaid = expenses.reduce((s, exp) => s + (exp.paidById === currentUserId ? exp.amount : 0), 0);
    return sum + Math.max(0, totalOwes - totalPaid);
  }, 0);

  const youGet = groups.reduce((sum, group) => {
    const expenses = group.expenses || [];
    const totalOwes = expenses.reduce((s, exp) => {
      const split = exp.splits.find(sp => sp.userId === currentUserId);
      return s + (split ? split.amount : 0);
    }, 0);
    const totalPaid = expenses.reduce((s, exp) => s + (exp.paidById === currentUserId ? exp.amount : 0), 0);
    return sum + Math.max(0, totalPaid - totalOwes);
  }, 0);

  const peopleOwing = new Set(groups.flatMap(g =>
    (g.expenses || []).filter(e => {
      const userSplit = e.splits.find(s => s.userId === currentUserId);
      return userSplit && e.paidById !== currentUserId;
    }).map(e => e.paidById)
  )).size;

  const peopleOwed = new Set(groups.flatMap(g =>
    (g.expenses || []).filter(e => e.paidById === currentUserId).flatMap(e =>
      e.splits.filter(s => s.userId !== currentUserId).map(s => s.userId)
    )
  )).size;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
      {/* Total Spent — dark summary card */}
      <div className="summary-card">
        <div style={{ position: 'relative', zIndex: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#a5b4fc', margin: '0 0 8px 0' }}>Total Spent</p>
          <p style={{ fontSize: 'clamp(28px, 7vw, 48px)', fontWeight: 900, color: 'white', margin: '0 0 16px 0', lineHeight: 1.1 }}>₹{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          <div className="flex items-center gap-6" style={{ color: '#a5b4fc', fontSize: 14 }}>
            <span className="flex items-center gap-2">
              <Receipt style={{ width: 16, height: 16 }} />
              {allExps.length} {allExps.length === 1 ? 'bill' : 'bills'}
            </span>
            <span className="flex items-center gap-2">
              <Users style={{ width: 16, height: 16 }} />
              {groups.length} {groups.length === 1 ? 'group' : 'groups'}
            </span>
          </div>
        </div>
      </div>

      {/* You Owe / You Get — two columns */}
      <div className="grid grid-cols-2 gap-4" style={{ alignItems: 'stretch' }}>
        <div className="card card-md" style={{ borderLeft: '4px solid #fb7185' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#f43f5e', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px 0' }}>You Owe</p>
          <p style={{ fontSize: 'clamp(18px, 4vw, 28px)', fontWeight: 900, color: '#e11d48', margin: '0 0 4px 0' }}>₹{youOwe.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          <p style={{ fontSize: 12, color: '#fb7185', margin: 0 }}>{peopleOwing} {peopleOwing === 1 ? 'person' : 'people'}</p>
        </div>
        <div className="card card-md" style={{ borderLeft: '4px solid #34d399' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px 0' }}>You Get</p>
          <p style={{ fontSize: 'clamp(18px, 4vw, 28px)', fontWeight: 900, color: '#16a34a', margin: '0 0 4px 0' }}>₹{youGet.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          <p style={{ fontSize: 12, color: '#34d399', margin: 0 }}>{peopleOwed} {peopleOwed === 1 ? 'person' : 'people'}</p>
        </div>
      </div>
    </div>
  );
}

// ── QUICK ADD MODAL ──────────────────────────────────────────────────────────
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

  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  const members = selectedGroup ? selectedGroup.members.map(m => m.user) : [];

  const handleSubmit = async () => {
    if (!selectedGroupId || !description.trim() || !amount || parseFloat(amount) <= 0 || !paidById) {
      setError("Please fill in all fields.");
      return;
    }
    const total = parseFloat(amount);
    const splitMembers = members.length > 0 ? members : [];
    if (splitMembers.length === 0) { setError("No members in group."); return; }

    const perPerson = Math.round((total / splitMembers.length) * 100) / 100;
    const splits = splitMembers.map((m, i) => {
      const last = i === splitMembers.length - 1;
      const rest = splitMembers.slice(0, -1).reduce((s) => s + perPerson, 0);
      return { userId: m.id, amount: last ? Math.round((total - rest) * 100) / 100 : perPerson };
    });

    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/groups/${selectedGroupId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim(), amount: total, paidById: Number(paidById), splits }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || "Failed"); setSaving(false); return; }
      setSuccess(true);
      setTimeout(() => { onSuccess(); onClose(); }, 900);
    } catch { setError("Network error."); setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 520, padding: '8px 0 40px', boxShadow: '0 -8px 40px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e2e8f0' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 24px 16px' }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: 0 }}>⚡ Quick Add</h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: '2px 0 0' }}>Equal split among all members</p>
          </div>
          <button onClick={onClose} style={{ padding: 8, borderRadius: '50%', background: '#f1f5f9', border: 'none', cursor: 'pointer' }}>
            <X style={{ width: 18, height: 18, color: '#64748b' }} />
          </button>
        </div>

        {success ? (
          <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check style={{ width: 28, height: 28, color: '#16a34a' }} />
            </div>
            <p style={{ fontWeight: 700, color: '#0f172a', fontSize: 16, margin: 0 }}>Expense added!</p>
          </div>
        ) : (
          <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {error && <div className="alert-error" style={{ margin: 0 }}>{error}</div>}

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Group</label>
              <select value={selectedGroupId} onChange={e => setSelectedGroupId(Number(e.target.value) || "")} className="quick-add-input-field-group">
                <option value="">Select a group...</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.emoji || ''} {g.name}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>What was it for?</label>
              <input ref={descRef} type="text" value={description} onChange={e => setDescription(e.target.value)} className="input-field" placeholder="Dinner, Petrol, Movie tickets..." />
            </div>

            <div className="form-grid-2">
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Amount (₹)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#475569', fontWeight: 700, fontSize: 16, pointerEvents: 'none' }}>₹</span>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="quick-add-input-field-amount" style={{ paddingLeft: 32, fontSize: 18, fontWeight: 900 }} placeholder="0" step="0.01" min="0"
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Paid by</label>
                <select value={paidById} onChange={e => setPaidById(Number(e.target.value) || "")} className="input-field">
                  <option value="">Select...</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>

            {selectedGroup && members.length > 0 && amount && parseFloat(amount) > 0 && (
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: '10px 14px', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Split preview</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {members.map(m => (
                    <span key={m.id} style={{ fontSize: 13, fontWeight: 600, color: '#334155', background: 'white', padding: '3px 10px', borderRadius: 20, border: '1px solid #e2e8f0' }}>
                      {m.name.split(' ')[0]}: ₹{(parseFloat(amount) / members.length).toFixed(0)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button onClick={handleSubmit} disabled={saving} className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 4, fontSize: 15, padding: '13px 24px', opacity: saving ? 0.7 : 1 }}>
              {saving ? "Adding..." : "Add Expense"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── ONBOARDING CARD (shown when user has no groups) ───────────────────────────
function OnboardingCard() {
  const steps = [
    { num: 1, emoji: '👥', title: 'Create a group', desc: 'Add your flatmates, travel buddies, or anyone you share costs with.' },
    { num: 2, emoji: '🧾', title: 'Log an expense', desc: 'Enter what you paid and SplitEase divides it up automatically.' },
    { num: 3, emoji: '✅', title: 'Settle up', desc: 'See exactly who owes what and mark payments as done.' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', borderRadius: 24, padding: '28px 24px', color: 'white', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>💰</div>
        <h2 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 8px', color: 'white' }}>Welcome to SplitEase!</h2>
        <p style={{ fontSize: 14, margin: 0, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>Split expenses with friends, family, and teammates — no awkward conversations needed.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>How it works</p>
        {steps.map((step, i) => (
          <div key={step.num} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 16px', background: 'white', borderRadius: 16, border: '1.5px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: i === 0 ? '#eef2ff' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
              {step.emoji}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 900, color: '#4f46e5', background: '#eef2ff', borderRadius: 20, padding: '2px 8px' }}>Step {step.num}</span>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: 0 }}>{step.title}</p>
              </div>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.4 }}>{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <Link href="/groups/new" className="btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: 16, padding: '14px 24px' }}>
        <Plus size={20} />
        Create your first group
      </Link>
      <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', margin: '-8px 0 0' }}>You can invite others after the group is created</p>
    </div>
  );
}

export default function Home() {
  const { data: session, status } = useSession();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'owe' | 'get'>('all');
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const currentUserId = session?.user?.id ? parseInt(session.user.id as string) : null;

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/auth/signin");
    }
  }, [status]);

  const fetchGroups = async () => {
    try {
      const res = await fetch("/api/groups");
      const data = await res.json();
      setGroups(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching groups:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status !== "authenticated") return;
    fetchGroups();
  }, [status]);

  const filteredGroups = groups.filter(group => {
    if (!currentUserId) return false;
    const expenses = group.expenses || [];
    const totalPaid = expenses.reduce((sum, exp) => sum + (exp.paidById === currentUserId ? exp.amount : 0), 0);
    const totalOwes = expenses.reduce((sum, exp) => {
      const split = exp.splits.find(s => s.userId === currentUserId);
      return sum + (split ? split.amount : 0);
    }, 0);
    const balance = totalPaid - totalOwes;
    if (filterType === 'owe') return balance < 0;
    if (filterType === 'get') return balance > 0;
    return true;
  });

  if (status === "loading" || (status === "authenticated" && loading)) {
    return (
      <div className="app-page flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-indigo-600 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  const allExpenses = groups
    .flatMap(g => g.expenses?.map(e => ({ ...e, groupId: g.id, groupName: g.name })) || [])
    .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
    .slice(0, 5);

  return (
    <div className="app-page relative pb-32 pt-4">
      <div className="app-shell">

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between mb-6 animate-fadeIn">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Welcome back</p>
            <h1 className="text-3xl font-black text-slate-900">
              👋 Hi {session?.user?.name?.split(' ')[0] || 'there'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">Keep track of your shared expenses</p>
          </div>
          <Link
            href="/profile"
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105"
            title="View Profile"
          >
            {session?.user?.name?.charAt(0).toUpperCase() || '?'}
          </Link>
        </div>

        {/* ── SUMMARY CARDS ── */}
        {currentUserId && groups.length > 0 && (
          <SummaryCards groups={groups} currentUserId={currentUserId} />
        )}

        {groups.length === 0 ? (
          <div className="animate-fadeIn">
            <OnboardingCard />
          </div>
        ) : (
          <div className="space-y-8 animate-fadeIn">

            {/* ── GROUPS LIST ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Your Groups</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{filteredGroups.length} of {groups.length} {groups.length === 1 ? 'group' : 'groups'}</p>
                </div>
              </div>

              {/* Filter tabs */}
              <div className="flex gap-2 mb-4">
                <button onClick={() => setFilterType('all')} className={filterType === 'all' ? 'filter-tab filter-tab-active' : 'filter-tab'}>All</button>
                <button onClick={() => setFilterType('owe')} className={filterType === 'owe' ? 'filter-tab filter-tab-active' : 'filter-tab'}>You Owe</button>
                <button onClick={() => setFilterType('get')} className={filterType === 'get' ? 'filter-tab filter-tab-active' : 'filter-tab'}>You Get</button>
              </div>

              <div className="space-y-3">
                {filteredGroups.map((group) => {
                  if (!currentUserId) return null;
                  const expenses = group.expenses || [];
                  const totalPaid = expenses.reduce((sum, exp) => sum + (exp.paidById === currentUserId ? exp.amount : 0), 0);
                  const totalOwes = expenses.reduce((sum, exp) => {
                    const split = exp.splits.find(s => s.userId === currentUserId);
                    return sum + (split ? split.amount : 0);
                  }, 0);
                  const balance = totalPaid - totalOwes;
                  const balanceType = balance > 0 ? 'owed' : balance < 0 ? 'owes' : 'settled';

                  return (
                    <Link
                      key={group.id}
                      href={`/groups/${group.id}`}
                      className="card-static card-md flex items-center gap-4"
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      {/* Group avatar */}
                      {group.emoji ? (
                        <div style={{ width: 44, height: 44, borderRadius: 14, background: balanceType === 'owed' ? '#dcfce7' : balanceType === 'owes' ? '#fee2e2' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                          {group.emoji}
                        </div>
                      ) : (
                        <div className={`avatar-circle ${
                          balanceType === 'owed' ? 'bg-success'
                          : balanceType === 'owes' ? 'bg-danger'
                          : 'bg-neutral'
                        }`}>
                          {group.name.charAt(0).toUpperCase()}
                        </div>
                      )}

                      {/* Group info */}
                      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        <p style={{ fontWeight: 700, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.name}</p>
                        <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0 0' }}>{group.members.length} members · {expenses.length} {expenses.length === 1 ? 'bill' : 'bills'}</p>
                      </div>

                      {/* Balance badge */}
                      <div className={`balance-badge ${
                        balanceType === 'owed' ? 'balance-badge-owed'
                        : balanceType === 'owes' ? 'balance-badge-owes'
                        : 'balance-badge-settled'
                      }`}>
                        <p className={`balance-amount-${balanceType}`}>₹{Math.abs(balance).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                        <p className={`balance-label-${balanceType}`}>{balanceType === 'owed' ? 'Owed' : balanceType === 'owes' ? 'Owes' : 'Settled'}</p>
                      </div>

                      <ChevronRight style={{ width: 16, height: 16, color: '#cbd5e1', flexShrink: 0 }} />
                    </Link>
                  );
                })}

                {filteredGroups.length === 0 && groups.length > 0 && (
                  <div className="empty-state">
                    <div className="empty-state-icon"><Inbox className="w-7 h-7" /></div>
                    <h3 className="empty-state-title">No groups here</h3>
                    <p className="empty-state-text">Try a different filter</p>
                    <button onClick={() => setFilterType('all')} className="btn-secondary">Show all</button>
                  </div>
                )}
              </div>
            </div>

            {/* ── RECENT ACTIVITY ── */}
            {allExpenses.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-3">Recent Activity</h2>
                <div className="space-y-2">
                  {allExpenses.map((expense) => (
                    <Link
                      key={`${expense.groupId}-${expense.id}`}
                      href={`/groups/${expense.groupId}`}
                      className="card card-sm flex items-center gap-3"
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <div className="avatar-circle-sm bg-primary">
                        {expense.paidBy?.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {expense.paidBy?.name} paid for <span style={{ color: '#4f46e5' }}>{expense.description}</span>
                        </p>
                        <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0 0' }}>in {expense.groupName}</p>
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 900, color: '#0f172a', flexShrink: 0, margin: 0 }}>₹{(expense.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── QUICK ADD FLOATING BUTTON (only when groups exist) ── */}
      {groups.length > 0 && (
        <button
          onClick={() => setShowQuickAdd(true)}
          style={{
            position: 'fixed', bottom: 88, right: 24, zIndex: 100,
            width: 56, height: 56, borderRadius: '50%',
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(79,70,229,0.45)',
          }}
          title="Quick Add Expense"
        >
          <Zap style={{ width: 24, height: 24, color: 'white' }} />
        </button>
      )}

      {/* ── QUICK ADD MODAL ── */}
      {showQuickAdd && (
        <QuickAddModal
          groups={groups}
          currentUserId={currentUserId}
          onClose={() => setShowQuickAdd(false)}
          onSuccess={() => { setLoading(true); fetchGroups(); }}
        />
      )}

      {/* ── BOTTOM NAV ── */}
      <nav className="nav-bottom">
        <div className="max-w-[80rem] mx-auto flex items-center justify-around px-4">
          <Link href="/" className="nav-bottom-item nav-bottom-active">
            <Wallet size={22} className="mb-1" />
            Home
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
