"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  ArrowLeft, Plus, Users, Wallet,
  CheckCircle2, AlertCircle, Handshake,
  PartyPopper, Receipt, ArrowRight, Edit, Trash2,
  ChevronDown, ChevronUp, UserMinus, History, X,
  TrendingUp, TrendingDown, Check, UserPlus, Mail,
  Settings, Download, Bell, Copy
} from "lucide-react";

interface Member {
  userId: number;
  user: { id: number; name: string; upiId?: string | null };
}

interface ActivityItem {
  id: string;
  type: 'expense' | 'settlement';
  title: string;
  subtitle: string;
  amount: number;
  category?: string | null;
  actor: { id: number; name: string };
  createdAt: string;
}

interface Expense {
  createdAt: any;
  id: number;
  description: string;
  amount: number;
  paidBy: { name: string; id?: number };
  paidById: number;
  notes?: string | null;
  category?: string | null;
  receiptUrl?: string | null;
  splits: { userId: number; amount: number }[];
}

const CATEGORY_EMOJIS: Record<string, string> = {
  food: '🍽️', transport: '🚗', housing: '🏠', entertainment: '🎉',
  shopping: '🛒', travel: '✈️', health: '💊', utilities: '🔧', other: '💡',
};
const getCategoryEmoji = (cat?: string | null) => CATEGORY_EMOJIS[cat || 'other'] || '💡';

interface Settlement {
  id: number;
  fromUserId: number;
  toUserId: number;
  amount: number;
  createdAt: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹', USD: '$', EUR: '€', GBP: '£', JPY: '¥', AED: 'د.إ',
};
const getCurrencySymbol = (code?: string) => CURRENCY_SYMBOLS[code || 'INR'] || '₹';

interface Group {
  id: number;
  name: string;
  emoji?: string;
  currency?: string;
  members: Member[];
  expenses: Expense[];
}

interface Transaction {
  fromUserId: number;
  toUserId: number;
  amount: number;
}

export default function GroupDetail() {
  const params = useParams();
  const groupId = parseInt(params.id as string);
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ? parseInt(session.user.id as string) : null;

  const [group, setGroup] = useState<Group | null>(null);
  const [balances, setBalances] = useState<{ [key: number]: number }>({});
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [expenseSearch, setExpenseSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<number | null>(null);
  const [deleteConfirmExpenseId, setDeleteConfirmExpenseId] = useState<number | null>(null);
  const [duplicatingExpenseId, setDuplicatingExpenseId] = useState<number | null>(null);
  const [duplicateSuccess, setDuplicateSuccess] = useState("");
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);
  const [removeConfirmMemberId, setRemoveConfirmMemberId] = useState<number | null>(null);
  const [removeError, setRemoveError] = useState<string>("");
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleTransaction, setSettleTransaction] = useState<Transaction | null>(null);
  const [settlingUp, setSettlingUp] = useState(false);
  const [settleSuccess, setSettleSuccess] = useState("");
  const [remindToast, setRemindToast] = useState("");
  const [sendingRemindId, setSendingRemindId] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [addMemberEmail, setAddMemberEmail] = useState("");
  const [addMemberName, setAddMemberName] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState("");
  const [addMemberSuccess, setAddMemberSuccess] = useState("");

  // Invite link state
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [revokingInvite, setRevokingInvite] = useState(false);

  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [editingGroupName, setEditingGroupName] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [savingGroupName, setSavingGroupName] = useState(false);
  const [showDeleteGroupConfirm, setShowDeleteGroupConfirm] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(false);

  // Activity Feed
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [showActivity, setShowActivity] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);

  const fetchData = async () => {
    try {
      const [groupRes, balancesRes] = await Promise.all([
        fetch(`/api/groups/${groupId}`),
        fetch(`/api/groups/${groupId}/balances`),
      ]);
      const groupData = await groupRes.json();
      setGroup(groupData);
      const balancesData = await balancesRes.json();
      setBalances(balancesData.balances || {});
      setTransactions(balancesData.transactions || []);
      setSettlements(balancesData.settlements || []);
    } catch (error) {
      console.error("Error fetching group:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivity = async () => {
    setLoadingActivity(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/activity`);
      const data = await res.json();
      setActivities(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching activity:", error);
    } finally {
      setLoadingActivity(false);
    }
  };

  const handleExport = () => {
    window.open(`/api/groups/${groupId}/export`, '_blank');
  };

  const handleGenerateInvite = async () => {
    setGeneratingInvite(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/invite`, { method: "POST" });
      const data = await res.json();
      if (res.ok) setInviteToken(data.token);
    } catch {
      console.error("Failed to generate invite");
    } finally {
      setGeneratingInvite(false);
    }
  };

  const handleCopyInvite = () => {
    if (!inviteToken) return;
    const url = `${window.location.origin}/invite/${inviteToken}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2500);
    });
  };

  const handleRevokeInvite = async () => {
    setRevokingInvite(true);
    try {
      await fetch(`/api/groups/${groupId}/invite`, { method: "DELETE" });
      setInviteToken(null);
    } catch {
      console.error("Failed to revoke invite");
    } finally {
      setRevokingInvite(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [groupId]);

  const handleDeleteExpense = async (expenseId: number) => {
    setDeletingExpenseId(expenseId);
    try {
      const res = await fetch(
        `/api/groups/${groupId}/expenses/${expenseId}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        console.error("Failed to delete expense");
        return;
      }

      if (group) {
        setGroup({
          ...group,
          expenses: group.expenses.filter((e) => e.id !== expenseId),
        });
      }
      setDeleteConfirmExpenseId(null);
      const balancesRes = await fetch(`/api/groups/${groupId}/balances`);
      const balancesData = await balancesRes.json();
      setBalances(balancesData.balances || {});
      setTransactions(balancesData.transactions || []);
    } catch (error) {
      console.error("Error deleting expense:", error);
    } finally {
      setDeletingExpenseId(null);
    }
  };

  const handleDuplicateExpense = async (expense: Expense) => {
    setDuplicatingExpenseId(expense.id);
    try {
      const res = await fetch(`/api/groups/${groupId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: expense.description,
          amount: expense.amount,
          paidById: expense.paidById,
          splits: expense.splits.map(s => ({ userId: s.userId, amount: s.amount })),
          notes: expense.notes || null,
          category: expense.category || null,
        }),
      });
      if (!res.ok) { console.error("Failed to duplicate expense"); return; }
      setDuplicateSuccess(`"${expense.description}" duplicated!`);
      setTimeout(() => setDuplicateSuccess(""), 3000);
      await fetchData();
    } catch (error) {
      console.error("Error duplicating expense:", error);
    } finally {
      setDuplicatingExpenseId(null);
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    setRemovingMemberId(memberId);
    setRemoveError("");
    try {
      const res = await fetch(
        `/api/groups/${groupId}/members/${memberId}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const data = await res.json();
        setRemoveError(data.error || "Failed to remove member");
        return;
      }

      if (group) {
        setGroup({
          ...group,
          members: group.members.filter((m) => m.userId !== memberId),
        });
      }
      setRemoveConfirmMemberId(null);
    } catch (error) {
      console.error("Error removing member:", error);
      setRemoveError("Network error. Please try again.");
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleAddMember = async () => {
    if (!addMemberEmail.trim()) return;
    setAddingMember(true);
    setAddMemberError("");
    setAddMemberSuccess("");
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: addMemberEmail.trim().toLowerCase(),
          name: addMemberName.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAddMemberError(data.error || "Failed to add member");
        return;
      }

      const successMsg = data.isNewUser
        ? `✉️ Account created & invite sent to ${addMemberEmail}!`
        : `✉️ ${data.user?.name || addMemberEmail} added & notified by email!`;

      setAddMemberSuccess(successMsg);
      setAddMemberEmail("");
      setAddMemberName("");
      await fetchData();

      // Auto-hide success after 4 seconds
      setTimeout(() => {
        setAddMemberSuccess("");
        setShowAddMember(false);
      }, 4000);
    } catch (error) {
      setAddMemberError("Network error. Please try again.");
    } finally {
      setAddingMember(false);
    }
  };

  const handleSettleUp = async () => {
    if (!settleTransaction) return;
    setSettlingUp(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromUserId: settleTransaction.fromUserId,
          toUserId: settleTransaction.toUserId,
          amount: settleTransaction.amount,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        console.error("Failed to settle:", data.error);
        return;
      }

      setShowSettleModal(false);
      setSettleTransaction(null);

      const balancesRes = await fetch(`/api/groups/${groupId}/balances`);
      const balancesData = await balancesRes.json();
      setBalances(balancesData.balances || {});
      setTransactions(balancesData.transactions || []);
      setSettlements(balancesData.settlements || []);

      setSettleSuccess("Settlement recorded successfully!");
      setTimeout(() => setSettleSuccess(""), 3000);
    } catch (error) {
      console.error("Error settling up:", error);
    } finally {
      setSettlingUp(false);
    }
  };

  if (loading) {
    return (
      <div className="app-page flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-indigo-600 font-semibold">Loading group details...</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="app-page flex items-center justify-center min-h-screen">
        <div className="card card-lg px-10 py-12 text-center max-w-md">
          <AlertCircle style={{ width: 64, height: 64, color: '#fb7185', margin: '0 auto 16px' }} />
          <p style={{ fontSize: 24, fontWeight: 900, color: '#1e293b', marginBottom: 8 }}>Group not found</p>
          <p style={{ color: '#64748b', marginBottom: 24 }}>The requested group does not exist or you don't have access.</p>
          <Link href="/" className="btn-primary">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const sym = getCurrencySymbol((group as any).currency);
  const totalExpenses = group.expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalSettled = settlements.reduce((sum, s) => sum + s.amount, 0);
  const myBalance = currentUserId ? (balances[currentUserId] || 0) : 0;

  const getMemberName = (userId: number) =>
    group.members.find(m => m.user.id === userId)?.user.name || "Unknown";

  return (
    <div className="app-page pb-24">
      <div className="app-shell animate-fadeIn">

        {/* Back button */}
        <div style={{ marginBottom: 16, paddingTop: 16 }}>
          <Link href="/" className="btn-ghost inline-flex items-center gap-2" style={{ color: '#475569' }}>
            <ArrowLeft style={{ width: 16, height: 16 }} />
            <span style={{ fontSize: 14, fontWeight: 500 }}>Back</span>
          </Link>
        </div>

        {/* Hero Banner */}
        <div className="summary-card" style={{ marginBottom: 24 }}>
          <div style={{ position: 'relative', zIndex: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Group</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  {(group as any).emoji && (
                    <span style={{ fontSize: 'clamp(24px, 5vw, 36px)', lineHeight: 1 }}>{(group as any).emoji}</span>
                  )}
                  <h1 style={{ fontSize: 'clamp(22px, 5vw, 36px)', fontWeight: 900, color: 'white', lineHeight: 1.1, margin: 0 }}>
                    {group.name}
                  </h1>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 14, color: '#cbd5e1' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Users style={{ width: 16, height: 16 }} />
                    {group.members.length} members
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Receipt style={{ width: 16, height: 16 }} />
                    {group.expenses.length} expenses
                  </span>
                </div>
              </div>
              <div>
                <Link href={`/groups/${groupId}/expenses/new`} className="btn-primary" style={{ display: 'inline-flex' }}>
                  <Plus style={{ width: 16, height: 16 }} />
                  Add Expense
                </Link>
              </div>
            </div>

            {/* My Balance Banner */}
            {currentUserId && myBalance !== 0 && (
              <div style={{
                marginTop: 20,
                borderRadius: 16,
                padding: 16,
                border: `1px solid ${myBalance > 0 ? 'rgba(52,211,153,0.4)' : 'rgba(251,113,133,0.4)'}`,
                background: myBalance > 0 ? 'rgba(52,211,153,0.15)' : 'rgba(251,113,133,0.15)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Your Balance</p>
                    <p style={{ fontSize: 'clamp(20px, 5vw, 28px)', fontWeight: 900, color: myBalance > 0 ? '#6ee7b7' : '#fda4af', marginBottom: 4 }}>
                      {myBalance > 0 ? '+' : ''}{sym}{Math.abs(myBalance).toFixed(0)}
                    </p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                      {myBalance > 0 ? 'You are owed money' : 'You owe money'}
                    </p>
                  </div>
                  {myBalance > 0
                    ? <TrendingUp style={{ width: 40, height: 40, color: 'rgba(110,231,183,0.6)' }} />
                    : <TrendingDown style={{ width: 40, height: 40, color: 'rgba(253,164,175,0.6)' }} />
                  }
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Success Toast */}
        {settleSuccess && (
          <div className="alert-success" style={{ marginBottom: 16 }}>
            <Check style={{ width: 20, height: 20 }} />
            {settleSuccess}
          </div>
        )}

        {/* Remind Toast */}
        {remindToast && (
          <div className="alert-success" style={{ marginBottom: 16 }}>
            <Bell style={{ width: 20, height: 20 }} />
            {remindToast}
          </div>
        )}

        {/* Duplicate Toast */}
        {duplicateSuccess && (
          <div className="alert-success" style={{ marginBottom: 16 }}>
            <Check style={{ width: 20, height: 20 }} />
            {duplicateSuccess}
          </div>
        )}

        {/* Stats Row */}
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="card card-sm" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Spent</p>
            <p style={{ fontSize: 'clamp(14px, 3.5vw, 22px)', fontWeight: 900, color: '#0f172a', margin: 0 }}>{sym}{totalExpenses.toFixed(0)}</p>
          </div>
          <div className="card card-sm" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Settled</p>
            <p style={{ fontSize: 'clamp(14px, 3.5vw, 22px)', fontWeight: 900, color: '#16a34a', margin: 0 }}>{sym}{totalSettled.toFixed(0)}</p>
          </div>
          <div className="card card-sm" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Pending</p>
            <p style={{ fontSize: 'clamp(14px, 3.5vw, 22px)', fontWeight: 900, color: '#4f46e5', margin: 0 }}>{transactions.length}</p>
          </div>
        </div>

        {/* Category Spending Chart */}
        {group.expenses.length > 0 && (() => {
          const catTotals: Record<string, number> = {};
          group.expenses.forEach(e => {
            const cat = e.category || 'other';
            catTotals[cat] = (catTotals[cat] || 0) + e.amount;
          });
          const entries = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
          const maxVal = Math.max(...entries.map(([, v]) => v));
          const catColors: Record<string, string> = {
            food: '#f97316', transport: '#8b5cf6', housing: '#3b82f6',
            entertainment: '#ec4899', shopping: '#14b8a6', travel: '#06b6d4',
            health: '#22c55e', utilities: '#eab308', other: '#94a3b8',
          };
          const catLabels: Record<string, string> = {
            food: '🍽️ Food', transport: '🚗 Transport', housing: '🏠 Housing',
            entertainment: '🎉 Fun', shopping: '🛒 Shopping', travel: '✈️ Travel',
            health: '💊 Health', utilities: '🔧 Utilities', other: '💡 Other',
          };
          return (
            <div className="card card-lg" style={{ marginBottom: 24 }}>
              <h2 className="section-header" style={{ marginBottom: 16 }}>
                <Receipt style={{ width: 20, height: 20, color: '#4f46e5' }} /> Spending by Category
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {entries.map(([cat, total]) => {
                  const pct = (total / maxVal) * 100;
                  const color = catColors[cat] || '#94a3b8';
                  return (
                    <div key={cat}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{catLabels[cat] || cat}</span>
                        <span style={{ fontSize: 13, fontWeight: 900, color: '#0f172a' }}>{sym}{total.toFixed(0)}</span>
                      </div>
                      <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Settle Up Section */}
        <div className="card card-lg" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 className="section-header" style={{ margin: 0 }}>
              <Handshake style={{ width: 20, height: 20, color: '#4f46e5' }} />
              {transactions.length > 0 ? 'Settle Up' : 'All Settled!'}
            </h2>
            {settlements.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <History style={{ width: 16, height: 16 }} />
                History ({settlements.length})
                {showHistory ? <ChevronUp style={{ width: 12, height: 12 }} /> : <ChevronDown style={{ width: 12, height: 12 }} />}
              </button>
            )}
          </div>

          {transactions.length === 0 ? (
            <div style={{ borderRadius: 16, background: 'linear-gradient(to bottom, #f0fdf4, #f0fdf4)', padding: 32, textAlign: 'center', border: '1px solid #bbf7d0' }}>
              <div style={{ width: 64, height: 64, background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <PartyPopper style={{ width: 32, height: 32, color: '#22c55e' }} />
              </div>
              <p style={{ fontSize: 18, fontWeight: 900, color: '#166534', marginBottom: 4 }}>Everyone is settled up!</p>
              <p style={{ fontSize: 14, color: '#16a34a' }}>No payments needed right now.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {transactions.map((t, i) => {
                const fromName = getMemberName(t.fromUserId);
                const toName = getMemberName(t.toUserId);
                const isMyTransaction = currentUserId && (t.fromUserId === currentUserId || t.toUserId === currentUserId);

                return (
                  <div
                    key={i}
                    style={{
                      borderRadius: 16,
                      border: `1px solid ${isMyTransaction ? '#c7d2fe' : '#e2e8f0'}`,
                      background: isMyTransaction ? '#eef2ff' : '#ffffff',
                      padding: 16,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                        {/* From avatar */}
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b91c1c', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                          {fromName.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 700, color: '#0f172a', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{fromName}</p>
                          <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>pays</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px' }}>
                          <ArrowRight style={{ width: 16, height: 16, color: '#94a3b8' }} />
                          <span style={{ fontWeight: 900, color: '#4f46e5', background: '#eef2ff', padding: '4px 10px', borderRadius: 20, fontSize: 14, border: '1px solid #c7d2fe' }}>
                            {sym}{t.amount.toFixed(0)}
                          </span>
                          <ArrowRight style={{ width: 16, height: 16, color: '#94a3b8' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                          <p style={{ fontWeight: 700, color: '#0f172a', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{toName}</p>
                          <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>receives</p>
                        </div>
                        {/* To avatar */}
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#065f46', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                          {toName.charAt(0).toUpperCase()}
                        </div>
                      </div>
                    </div>
                    {currentUserId && (t.fromUserId === currentUserId || t.toUserId === currentUserId) && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {t.fromUserId === currentUserId && (() => {
                          const toMember = group?.members.find(m => m.user.id === t.toUserId);
                          const toUpiId = toMember?.user?.upiId;
                          return (
                            <>
                              <button
                                onClick={() => { setSettleTransaction(t); setShowSettleModal(true); }}
                                className="btn-primary"
                                style={{ flex: 1, fontSize: 14, justifyContent: 'center' }}
                              >
                                <Check style={{ width: 16, height: 16 }} />
                                Mark as Paid
                              </button>
                              {!toUpiId && (
                                <p style={{ flex: 1, fontSize: 11, color: '#94a3b8', margin: 0, textAlign: 'center', alignSelf: 'center' }}>
                                  💳 Ask {getMemberName(t.toUserId)} to add their UPI ID in profile for quick pay
                                </p>
                              )}
                              {toUpiId && (
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  {/* UPI ID with copy */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fef9c3', border: '1px solid #fde047', borderRadius: 10, padding: '6px 10px' }}>
                                    <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#854d0e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      💳 {toUpiId}
                                    </span>
                                    <button
                                      onClick={() => { navigator.clipboard.writeText(toUpiId); setCopiedUpi(toUpiId); setTimeout(() => setCopiedUpi(null), 2000); }}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#854d0e', padding: 0, whiteSpace: 'nowrap', flexShrink: 0 }}
                                    >
                                      {copiedUpi === toUpiId ? '✓ Copied!' : '📋 Copy'}
                                    </button>
                                  </div>
                                  {/* App-specific UPI buttons */}
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    {[
                                      { name: 'GPay', scheme: 'gpay://upi/pay', bg: '#f0fdf4', color: '#166534', border: '#86efac' },
                                      { name: 'PhonePe', scheme: 'phonepe://pay', bg: '#faf5ff', color: '#7e22ce', border: '#d8b4fe' },
                                      { name: 'Paytm', scheme: 'paytmmp://pay', bg: '#eff6ff', color: '#1d4ed8', border: '#93c5fd' },
                                    ].map(({ name, scheme, bg, color, border }) => (
                                      <a
                                        key={name}
                                        href={`${scheme}?pa=${encodeURIComponent(toUpiId)}&am=${t.amount.toFixed(2)}&cu=INR&pn=${encodeURIComponent(getMemberName(t.toUserId))}&tn=SplitEase+settlement`}
                                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '7px 4px', background: bg, border: `1px solid ${border}`, borderRadius: 10, color, fontWeight: 700, fontSize: 12, textDecoration: 'none' }}
                                      >
                                        {name}
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        })()}
                        {t.toUserId === currentUserId && (
                          <button
                            onClick={async () => {
                              const name = getMemberName(t.fromUserId);
                              setSendingRemindId(t.fromUserId);
                              try {
                                const res = await fetch(`/api/groups/${groupId}/remind`, {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    fromUserId: t.fromUserId,
                                    toUserId: t.toUserId,
                                    amount: t.amount,
                                  }),
                                });
                                if (res.ok) {
                                  setRemindToast(`📧 Reminder email sent to ${name}!`);
                                } else {
                                  setRemindToast(`⚠️ Could not send reminder to ${name}`);
                                }
                              } catch {
                                setRemindToast(`⚠️ Network error. Try again.`);
                              } finally {
                                setSendingRemindId(null);
                                setTimeout(() => setRemindToast(""), 4000);
                              }
                            }}
                            disabled={sendingRemindId === t.fromUserId}
                            className="btn-secondary"
                            style={{ flex: 1, fontSize: 14, justifyContent: 'center' }}
                          >
                            {sendingRemindId === t.fromUserId ? (
                              <div style={{ width: 14, height: 14, border: '2px solid #cbd5e1', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                            ) : (
                              <Bell style={{ width: 16, height: 16 }} />
                            )}
                            {sendingRemindId === t.fromUserId ? 'Sending…' : 'Remind'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Settlement History */}
          {showHistory && settlements.length > 0 && (
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #f1f5f9' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <History style={{ width: 16, height: 16 }} /> Settlement History
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[...settlements].reverse().map((s) => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14, padding: 12, borderRadius: 12, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle2 style={{ width: 16, height: 16, color: '#22c55e', flexShrink: 0 }} />
                      <span style={{ color: '#334155' }}>
                        <strong>{getMemberName(s.fromUserId)}</strong>
                        {' paid '}
                        <strong>{getMemberName(s.toUserId)}</strong>
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: 900, color: '#16a34a', margin: 0 }}>{sym}{s.amount.toFixed(0)}</p>
                      <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>{new Date(s.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Members & Balances */}
        <div className="card card-lg" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 className="section-header" style={{ margin: 0 }}>
              <Wallet style={{ width: 20, height: 20, color: '#4f46e5' }} /> Members & Balances
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => {
                  setShowInvitePanel(!showInvitePanel);
                  setShowAddMember(false);
                  if (!showInvitePanel && !inviteToken) handleGenerateInvite();
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: showInvitePanel ? '#4338ca' : '#64748b', background: showInvitePanel ? '#eef2ff' : '#f1f5f9', border: 'none', borderRadius: 8, padding: '5px 10px', cursor: 'pointer' }}
                title="Share invite link"
              >
                <Copy style={{ width: 14, height: 14 }} />
                Share
              </button>
              <button
                onClick={() => { setShowAddMember(!showAddMember); setAddMemberError(""); setShowInvitePanel(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer' }}
                title="Add member"
              >
                <UserPlus style={{ width: 16, height: 16 }} />
                Add
              </button>
            </div>
          </div>

          {/* Invite Link Panel */}
          {showInvitePanel && (
            <div style={{ marginBottom: 16, borderRadius: 16, background: '#f5f3ff', border: '1px solid #ddd6fe', padding: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Copy style={{ width: 14, height: 14 }} /> Share invite link
              </p>
              <p style={{ fontSize: 11, color: '#8b5cf6', marginBottom: 12 }}>
                Anyone with this link can join the group — no email needed.
              </p>
              {generatingInvite ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0' }}>
                  <div style={{ width: 16, height: 16, border: '2px solid #c4b5fd', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: 13, color: '#7c3aed', fontWeight: 600 }}>Generating link…</span>
                </div>
              ) : inviteToken ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* Link display */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'white', borderRadius: 12, border: '1.5px solid #ddd6fe', padding: '8px 12px', overflow: 'hidden' }}>
                    <span style={{ flex: 1, fontSize: 12, color: '#6d28d9', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {typeof window !== 'undefined' ? `${window.location.origin}/invite/${inviteToken}` : `/invite/${inviteToken}`}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={handleCopyInvite}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: copiedInvite ? '#d1fae5' : '#7c3aed', color: copiedInvite ? '#166534' : 'white', fontWeight: 700, fontSize: 13, padding: '9px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                      {copiedInvite ? (
                        <><CheckCircle2 style={{ width: 14, height: 14 }} /> Copied!</>
                      ) : (
                        <><Copy style={{ width: 14, height: 14 }} /> Copy Link</>
                      )}
                    </button>
                    <button
                      onClick={handleRevokeInvite}
                      disabled={revokingInvite}
                      title="Revoke this link"
                      style={{ padding: '9px 12px', borderRadius: 10, border: '1.5px solid #ddd6fe', background: 'white', color: '#94a3b8', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      {revokingInvite ? '…' : 'Revoke'}
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, textAlign: 'center' }}>
                    Link never expires · Revoke to disable it
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleGenerateInvite}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#7c3aed', color: 'white', fontWeight: 700, fontSize: 13, padding: '9px 14px', borderRadius: 10, border: 'none', cursor: 'pointer' }}
                >
                  <Copy style={{ width: 14, height: 14 }} /> Generate Link
                </button>
              )}
            </div>
          )}

          {/* Add Member Form */}
          {showAddMember && (
            <div style={{ marginBottom: 16, borderRadius: 16, background: '#eef2ff', border: '1px solid #c7d2fe', padding: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#4338ca', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Mail style={{ width: 14, height: 14 }} /> Invite by email
              </p>
              <p style={{ fontSize: 11, color: '#6366f1', marginBottom: 12 }}>
                If they don't have an account, one will be created and credentials emailed to them.
              </p>

              {addMemberError && (
                <p style={{ fontSize: 12, color: '#e11d48', marginBottom: 8, background: '#fff1f2', padding: '8px 12px', borderRadius: 12 }}>{addMemberError}</p>
              )}
              {addMemberSuccess && (
                <p style={{ fontSize: 12, color: '#16a34a', marginBottom: 8, background: '#f0fdf4', padding: '8px 12px', borderRadius: 12, border: '1px solid #bbf7d0' }}>{addMemberSuccess}</p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  type="email"
                  value={addMemberEmail}
                  onChange={(e) => { setAddMemberEmail(e.target.value); setAddMemberError(""); setAddMemberSuccess(""); }}
                  placeholder="friend@email.com"
                  className="input-field"
                  style={{ fontSize: 14, padding: '8px 12px' }}
                  onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
                />
                <input
                  type="text"
                  value={addMemberName}
                  onChange={(e) => setAddMemberName(e.target.value)}
                  placeholder="Their name (optional — for new accounts)"
                  className="input-field"
                  style={{ fontSize: 14, padding: '8px 12px' }}
                  onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
                />
                <button
                  onClick={handleAddMember}
                  disabled={addingMember || !addMemberEmail.trim()}
                  className="btn-primary"
                  style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  {addingMember ? (
                    <>
                      <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                      Sending invite…
                    </>
                  ) : (
                    <>
                      <Mail style={{ width: 14, height: 14 }} />
                      Send Invite
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {group.members.map((member) => {
              const balance = balances[member.user.id] || 0;
              const isOwed = balance > 0;
              const isOwing = balance < 0;

              return (
                <div
                  key={member.userId}
                  style={{
                    borderRadius: 16,
                    border: `1px solid ${isOwed ? '#bbf7d0' : isOwing ? '#fecdd3' : '#e2e8f0'}`,
                    background: isOwed ? '#f0fdf4' : isOwing ? '#fff1f2' : '#f8fafc',
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: isOwed ? '#dcfce7' : isOwing ? '#fee2e2' : '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 14,
                      color: isOwed ? '#166534' : isOwing ? '#b91c1c' : '#475569',
                      flexShrink: 0,
                    }}>
                      {member.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, color: '#0f172a', fontSize: 14, margin: 0 }}>{member.user.name}</p>
                      <p style={{ fontSize: 12, fontWeight: 500, color: isOwed ? '#16a34a' : isOwing ? '#e11d48' : '#94a3b8', margin: 0 }}>
                        {isOwed ? 'is owed money' : isOwing ? 'owes money' : 'settled up'}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18, fontWeight: 900, color: isOwed ? '#16a34a' : isOwing ? '#e11d48' : '#94a3b8' }}>
                      {balance > 0 ? '+' : ''}{sym}{Math.abs(balance).toFixed(0)}
                    </span>
                    <button
                      onClick={() => setRemoveConfirmMemberId(member.userId)}
                      style={{ padding: 6, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8, display: 'flex', alignItems: 'center' }}
                      title="Remove member"
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#e11d48'; (e.currentTarget as HTMLButtonElement).style.background = '#fff1f2'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8'; (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
                    >
                      <UserMinus style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expenses / Activity List */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 className="section-header" style={{ margin: 0 }}>
                <Receipt style={{ width: 20, height: 20, color: '#4f46e5' }} /> {showActivity ? 'Activity' : 'Expenses'}
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Activity Feed toggle */}
              <button
                onClick={() => {
                  const next = !showActivity;
                  setShowActivity(next);
                  if (next && activities.length === 0) fetchActivity();
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: showActivity ? '#4f46e5' : '#64748b', background: showActivity ? '#eef2ff' : '#f1f5f9', padding: '4px 10px', borderRadius: 8, border: 'none', cursor: 'pointer' }}
              >
                <History style={{ width: 14, height: 14 }} />
                {showActivity ? 'Expenses' : 'Activity'}
              </button>
              {/* Export button */}
              <button
                onClick={handleExport}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#16a34a', background: '#f0fdf4', padding: '4px 10px', borderRadius: 8, border: 'none', cursor: 'pointer' }}
                title="Export CSV"
              >
                <Download style={{ width: 14, height: 14 }} />
                Export
              </button>
            </div>
          </div>

          {/* Activity Feed */}
          {showActivity && (
            <div>
              {loadingActivity ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                  <div style={{ width: 28, height: 28, border: '3px solid #c7d2fe', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                </div>
              ) : activities.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8', fontSize: 14 }}>No activity yet</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative', paddingLeft: 28 }}>
                  {/* Timeline line */}
                  <div style={{ position: 'absolute', left: 10, top: 0, bottom: 0, width: 2, background: '#e0e7ff', borderRadius: 1 }} />
                  {activities.map((item) => (
                    <div key={item.id} style={{ position: 'relative', paddingBottom: 16 }}>
                      {/* Timeline dot */}
                      <div style={{
                        position: 'absolute',
                        left: -24,
                        top: 12,
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: item.type === 'expense' ? '#eef2ff' : '#f0fdf4',
                        border: `2px solid ${item.type === 'expense' ? '#818cf8' : '#4ade80'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 9,
                        zIndex: 2,
                      }}>
                        {item.type === 'expense' ? (CATEGORY_EMOJIS[item.category || 'other'] || '💡') : '✅'}
                      </div>
                      <div style={{ background: 'white', borderRadius: 12, padding: '10px 14px', border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</p>
                            <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>{item.subtitle}</p>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                            <p style={{ fontSize: 16, fontWeight: 900, color: item.type === 'expense' ? '#0f172a' : '#16a34a', margin: 0 }}>{sym}{item.amount.toFixed(0)}</p>
                            <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
                              {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Search bar + category filters */}
          {!showActivity && group.expenses.length > 2 && (
            <>
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none', fontSize: 16 }}>🔍</span>
                <input
                  type="text"
                  value={expenseSearch}
                  onChange={(e) => setExpenseSearch(e.target.value)}
                  placeholder="Search expenses..."
                  style={{ width: '100%', boxSizing: 'border-box', paddingLeft: 38, paddingRight: 14, paddingTop: 10, paddingBottom: 10, borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none', background: 'white', color: '#1e293b' }}
                />
                {expenseSearch && (
                  <button
                    onClick={() => setExpenseSearch("")}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2, fontSize: 16 }}
                  >✕</button>
                )}
              </div>
              {/* Category filter chips */}
              {(() => {
                const usedCats = [...new Set(group.expenses.map(e => e.category || 'other'))];
                if (usedCats.length < 2) return null;
                const catChipLabels: Record<string, string> = {
                  food: '🍽️', transport: '🚗', housing: '🏠', entertainment: '🎉',
                  shopping: '🛒', travel: '✈️', health: '💊', utilities: '🔧', other: '💡',
                };
                return (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                    <button
                      onClick={() => setCategoryFilter(null)}
                      style={{ padding: '4px 10px', borderRadius: 20, border: `1.5px solid ${categoryFilter === null ? '#4f46e5' : '#e2e8f0'}`, background: categoryFilter === null ? '#eef2ff' : 'white', color: categoryFilter === null ? '#4338ca' : '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      All
                    </button>
                    {usedCats.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                        style={{ padding: '4px 10px', borderRadius: 20, border: `1.5px solid ${categoryFilter === cat ? '#4f46e5' : '#e2e8f0'}`, background: categoryFilter === cat ? '#eef2ff' : 'white', color: categoryFilter === cat ? '#4338ca' : '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >
                        {catChipLabels[cat] || '💡'} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </button>
                    ))}
                  </div>
                );
              })()}
            </>
          )}

          {!showActivity && group.expenses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Receipt style={{ width: 32, height: 32 }} />
              </div>
              <h3 className="empty-state-title">No expenses yet</h3>
              <p className="empty-state-text">Add your first expense to start tracking</p>
              <Link href={`/groups/${groupId}/expenses/new`} className="btn-primary inline-flex">
                <Plus style={{ width: 16, height: 16 }} />
                Add Expense
              </Link>
            </div>
          ) : !showActivity ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(() => {
                const filtered = group.expenses.filter(e => {
                  const matchesSearch = !expenseSearch.trim() ||
                    e.description.toLowerCase().includes(expenseSearch.toLowerCase()) ||
                    e.paidBy?.name?.toLowerCase().includes(expenseSearch.toLowerCase()) ||
                    (e.notes && e.notes.toLowerCase().includes(expenseSearch.toLowerCase()));
                  const matchesCategory = !categoryFilter ||
                    (e.category || 'other') === categoryFilter;
                  return matchesSearch && matchesCategory;
                });
                if (filtered.length === 0) return (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: 14 }}>
                    No expenses match "{expenseSearch}"
                  </div>
                );
                return filtered.map((expense) => {
                const myShare = currentUserId
                  ? expense.splits.find(s => s.userId === currentUserId)?.amount || 0
                  : 0;
                const iPaid = currentUserId && expense.paidById === currentUserId;

                return (
                  <div
                    key={expense.id}
                    className="card-static card-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                  >
                    {/* Category emoji icon or receipt thumbnail */}
                    {expense.receiptUrl ? (
                      <div style={{ width: 44, height: 44, borderRadius: 12, overflow: 'hidden', flexShrink: 0, border: '2px solid #e2e8f0' }}>
                        <img src={expense.receiptUrl} alt="Receipt" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ) : (
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 20 }}>
                        {getCategoryEmoji(expense.category)}
                      </div>
                    )}

                    {/* Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                        <p style={{ fontWeight: 700, color: '#0f172a', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8, margin: 0 }}>
                          {expense.description}
                        </p>
                        <p style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', flexShrink: 0, margin: 0 }}>
                          {sym}{expense.amount.toFixed(0)}
                        </p>
                      </div>
                      {expense.notes && (
                        <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: 'italic' }}>
                          {expense.notes}
                        </p>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                            <span style={{ fontWeight: 500 }}>{expense.paidBy?.name}</span> paid
                          </p>
                          {currentUserId && (
                            <span style={{
                              fontSize: 12,
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: 20,
                              background: iPaid ? '#dcfce7' : '#fff1f2',
                              color: iPaid ? '#166534' : '#e11d48',
                            }}>
                              {iPaid ? `+${sym}${(expense.amount - myShare).toFixed(0)}` : `-${sym}${myShare.toFixed(0)}`}
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
                          {expense.createdAt
                            ? new Date(expense.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric', month: 'short'
                              })
                            : ''}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={() => handleDuplicateExpense(expense)}
                        style={{ padding: 8, borderRadius: 8, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        title="Duplicate"
                        disabled={duplicatingExpenseId === expense.id}
                      >
                        <Copy style={{ width: 15, height: 15 }} />
                      </button>
                      <Link
                        href={`/groups/${groupId}/expenses/${expense.id}/edit`}
                        style={{ padding: 8, borderRadius: 8, color: '#94a3b8', display: 'flex', alignItems: 'center' }}
                        title="Edit"
                      >
                        <Edit style={{ width: 16, height: 16 }} />
                      </Link>
                      <button
                        onClick={() => setDeleteConfirmExpenseId(expense.id)}
                        style={{ padding: 8, borderRadius: 8, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        title="Delete"
                        disabled={deletingExpenseId === expense.id}
                      >
                        <Trash2 style={{ width: 16, height: 16 }} />
                      </button>
                    </div>
                  </div>
                );
              });
              })()}
            </div>
          ) : null}
        </div>

        {/* Settle Up Modal */}
        {showSettleModal && settleTransaction && (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50, padding: 16 }}
            onClick={(e) => e.target === e.currentTarget && setShowSettleModal(false)}
          >
            <div style={{ background: 'white', borderRadius: 24, padding: 24, width: '100%', maxWidth: 400, boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: 0 }}>Confirm Settlement</h3>
                <button
                  onClick={() => setShowSettleModal(false)}
                  style={{ padding: 8, borderRadius: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}
                >
                  <X style={{ width: 20, height: 20 }} />
                </button>
              </div>

              <div style={{ background: '#eef2ff', borderRadius: 16, padding: 16, marginBottom: 20, border: '1px solid #c7d2fe' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ width: 40, height: 40, background: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b91c1c', fontWeight: 700, margin: '0 auto 4px' }}>
                      {getMemberName(settleTransaction.fromUserId).charAt(0).toUpperCase()}
                    </div>
                    <p style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', margin: 0 }}>{getMemberName(settleTransaction.fromUserId)}</p>
                    <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>pays</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 16px' }}>
                    <p style={{ fontSize: 24, fontWeight: 900, color: '#4f46e5', margin: 0 }}>{sym}{settleTransaction.amount.toFixed(0)}</p>
                    <ArrowRight style={{ width: 20, height: 20, color: '#818cf8', marginTop: 4 }} />
                  </div>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ width: 40, height: 40, background: '#d1fae5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#065f46', fontWeight: 700, margin: '0 auto 4px' }}>
                      {getMemberName(settleTransaction.toUserId).charAt(0).toUpperCase()}
                    </div>
                    <p style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', margin: 0 }}>{getMemberName(settleTransaction.toUserId)}</p>
                    <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>receives</p>
                  </div>
                </div>
              </div>

              <p style={{ fontSize: 14, color: '#475569', marginBottom: 16, textAlign: 'center' }}>
                This will record that you've paid <strong>{sym}{settleTransaction.amount.toFixed(0)}</strong> to <strong>{getMemberName(settleTransaction.toUserId)}</strong> and update the group balance.
              </p>

              {/* UPI Payment Section */}
              {(() => {
                const toMemberUpiId = group?.members.find(m => m.user.id === settleTransaction.toUserId)?.user?.upiId;
                if (!toMemberUpiId) return null;
                const upiParams = `pa=${encodeURIComponent(toMemberUpiId)}&am=${settleTransaction.amount.toFixed(2)}&cu=INR&pn=${encodeURIComponent(getMemberName(settleTransaction.toUserId))}&tn=SplitEase+settlement`;
                return (
                  <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: 16, padding: 16, marginBottom: 16 }}>
                    <p style={{ fontSize: 11, fontWeight: 800, color: '#854d0e', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      💳 Pay via UPI App
                    </p>
                    {/* UPI ID + copy */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'white', border: '1px solid #fde047', borderRadius: 10, padding: '8px 12px', marginBottom: 10 }}>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {toMemberUpiId}
                      </span>
                      <button
                        onClick={() => { navigator.clipboard.writeText(toMemberUpiId); setCopiedUpi(toMemberUpiId); setTimeout(() => setCopiedUpi(null), 2000); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#854d0e', padding: 0, whiteSpace: 'nowrap', flexShrink: 0 }}
                      >
                        {copiedUpi === toMemberUpiId ? '✅ Copied!' : '📋 Copy ID'}
                      </button>
                    </div>
                    {/* App buttons */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      {[
                        { name: 'GPay', scheme: 'gpay://upi/pay', bg: '#f0fdf4', color: '#166534', border: '#86efac', emoji: '💚' },
                        { name: 'PhonePe', scheme: 'phonepe://pay', bg: '#faf5ff', color: '#7e22ce', border: '#d8b4fe', emoji: '💜' },
                        { name: 'Paytm', scheme: 'paytmmp://pay', bg: '#eff6ff', color: '#1d4ed8', border: '#93c5fd', emoji: '🔵' },
                        { name: 'BHIM', scheme: 'bhim://pay', bg: '#fff7ed', color: '#c2410c', border: '#fdba74', emoji: '🇮🇳' },
                      ].map(({ name, scheme, bg, color, border, emoji }) => (
                        <a
                          key={name}
                          href={`${scheme}?${upiParams}`}
                          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 4px', background: bg, border: `1px solid ${border}`, borderRadius: 12, color, fontWeight: 700, fontSize: 11, textDecoration: 'none', gap: 2 }}
                        >
                          <span style={{ fontSize: 18 }}>{emoji}</span>
                          <span>{name}</span>
                        </a>
                      ))}
                    </div>
                    <p style={{ margin: 0, fontSize: 11, color: '#92400e', textAlign: 'center' }}>
                      After paying, tap "Confirm" below to update the group balance.
                    </p>
                  </div>
                );
              })()}

              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setShowSettleModal(false)} className="btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button onClick={handleSettleUp} disabled={settlingUp} className="btn-primary" style={{ flex: 1 }}>
                  {settlingUp ? (
                    <>
                      <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                      Settling...
                    </>
                  ) : (
                    <>
                      <Check style={{ width: 16, height: 16 }} />
                      Confirm
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Expense Modal */}
        {deleteConfirmExpenseId !== null && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
            <div style={{ background: 'white', borderRadius: 24, padding: 24, maxWidth: 400, width: '100%', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 style={{ width: 20, height: 20, color: '#e11d48' }} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: 0 }}>Delete Expense?</h3>
              </div>
              <p style={{ fontSize: 14, color: '#475569', marginBottom: 20 }}>
                This action cannot be undone. All split data for this expense will be permanently removed.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setDeleteConfirmExpenseId(null)} className="btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteExpense(deleteConfirmExpenseId)}
                  disabled={deletingExpenseId === deleteConfirmExpenseId}
                  className="btn-danger"
                  style={{ flex: 1 }}
                >
                  {deletingExpenseId === deleteConfirmExpenseId ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Remove Member Modal */}
        {removeConfirmMemberId !== null && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
            <div style={{ background: 'white', borderRadius: 24, padding: 24, maxWidth: 400, width: '100%', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
              {removeError && (
                <div className="alert-error" style={{ marginBottom: 16 }}>
                  <AlertCircle style={{ width: 20, height: 20 }} />
                  {removeError}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserMinus style={{ width: 20, height: 20, color: '#e11d48' }} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: 0 }}>Remove Member?</h3>
              </div>
              <p style={{ fontSize: 14, color: '#475569', marginBottom: 20 }}>
                Member must have zero balance before being removed. Make sure all expenses are settled first.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => { setRemoveConfirmMemberId(null); setRemoveError(""); }}
                  className="btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRemoveMember(removeConfirmMemberId)}
                  disabled={removingMemberId === removeConfirmMemberId}
                  className="btn-danger"
                  style={{ flex: 1 }}
                >
                  {removingMemberId === removeConfirmMemberId ? "Removing..." : "Remove"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
