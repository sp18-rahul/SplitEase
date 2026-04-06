"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, User, Mail, LogOut, Edit2, Save, X,
  ChevronRight, Wallet, Receipt,
  TrendingUp, TrendingDown, Check, Users, Plus, Smartphone
} from "lucide-react";
import { AppShell } from "@/app/components/AppSidebar";

interface Group {
  id: number;
  name: string;
  members: { userId: number; user: { id: number; name: string } }[];
  expenses: {
    amount: number;
    paidById: number;
    splits: { userId: number; amount: number }[];
  }[];
}

interface GroupBalance {
  groupId: number;
  balance: number; // positive = owed to you, negative = you owe
}

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupBalances, setGroupBalances] = useState<GroupBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [upiId, setUpiId] = useState("");
  const [editingUpi, setEditingUpi] = useState(false);
  const [newUpiId, setNewUpiId] = useState("");
  const [savingUpi, setSavingUpi] = useState(false);
  const [upiError, setUpiError] = useState("");
  const [upiSuccess, setUpiSuccess] = useState(false);

  const currentUserId = session?.user?.id ? parseInt(session.user.id as string) : null;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const fetchData = async () => {
      try {
        const [groupsRes, profileRes] = await Promise.all([
          fetch("/api/groups"),
          fetch("/api/users/profile"),
        ]);
        const groupsData = await groupsRes.json();
        const groupsList: Group[] = Array.isArray(groupsData) ? groupsData : [];
        setGroups(groupsList);
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setUpiId(profileData.upiId || "");
        }
        // Fetch per-group balances (includes settlements) in parallel
        if (groupsList.length > 0 && session?.user?.id) {
          const uid = parseInt(session.user.id as string);
          const balResults = await Promise.all(
            groupsList.map(g => fetch(`/api/groups/${g.id}/balances`).then(r => r.json()).catch(() => null))
          );
          const gb: GroupBalance[] = balResults
            .map((data, i) => data ? { groupId: groupsList[i].id, balance: data.balances?.[uid] ?? 0 } : null)
            .filter(Boolean) as GroupBalance[];
          setGroupBalances(gb);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [status]);

  const handleSaveUpi = async () => {
    setSavingUpi(true);
    setUpiError("");
    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upiId: newUpiId.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json();
        setUpiError(data.error || "Failed to save UPI ID");
        return;
      }
      const data = await res.json();
      setUpiId(data.upiId || "");
      setEditingUpi(false);
      setUpiSuccess(true);
      setTimeout(() => setUpiSuccess(false), 3000);
    } catch {
      setUpiError("Network error. Please try again.");
    } finally {
      setSavingUpi(false);
    }
  };

  const PURPLE     = "#7C3AED";
  const PURPLE_MID = "#6D28D9";
  const PAGE_BG    = "#F0EEFF";
  const initial    = session?.user?.name?.charAt(0).toUpperCase() || "?";

  if (status === "loading") {
    return (
      <AppShell activeTab="profile">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#F0EEFF" }}>
          <div style={{ width: 44, height: 44, border: "4px solid #EDE9FE", borderTopColor: "#7C3AED", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </AppShell>
    );
  }

  const totalExpenses = groups.reduce((sum, g) =>
    sum + g.expenses.reduce((s, e) => s + e.amount, 0), 0);

  // Use settlement-aware balances if available, fall back to expense-only calculation
  const youOwe = groupBalances.length > 0
    ? groupBalances.reduce((sum, gb) => sum + Math.max(0, -gb.balance), 0)
    : currentUserId ? groups.reduce((sum, group) => {
        const expenses = group.expenses;
        const paid = expenses.reduce((s, e) => s + (e.paidById === currentUserId ? e.amount : 0), 0);
        const owes = expenses.reduce((s, e) => {
          const split = e.splits.find(sp => sp.userId === currentUserId);
          return s + (split ? split.amount : 0);
        }, 0);
        return sum + Math.max(0, owes - paid);
      }, 0) : 0;

  const youGet = groupBalances.length > 0
    ? groupBalances.reduce((sum, gb) => sum + Math.max(0, gb.balance), 0)
    : currentUserId ? groups.reduce((sum, group) => {
        const expenses = group.expenses;
        const paid = expenses.reduce((s, e) => s + (e.paidById === currentUserId ? e.amount : 0), 0);
        const owes = expenses.reduce((s, e) => {
          const split = e.splits.find(sp => sp.userId === currentUserId);
          return s + (split ? split.amount : 0);
        }, 0);
        return sum + Math.max(0, paid - owes);
      }, 0) : 0;

  const handleSaveName = async () => {
    if (!newName.trim() || newName.trim() === session?.user?.name) {
      setEditingName(false);
      return;
    }

    setSavingName(true);
    setSaveError("");
    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setSaveError(data.error || "Failed to update name");
        return;
      }

      await update({ name: newName.trim() });
      setEditingName(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError("Network error. Please try again.");
    } finally {
      setSavingName(false);
    }
  };

  return (
    <AppShell activeTab="profile">
    <div style={{ minHeight: "100vh", background: PAGE_BG }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .se-pro-deskhead { display: none; }
        .se-pro-mobhead  { display: flex; }
        .se-pro-content  { padding: 0 16px 100px; }
        .se-pro-signout  { display: block; }
        @media (min-width: 1024px) {
          .se-pro-deskhead { display: flex !important; }
          .se-pro-mobhead  { display: none !important; }
          .se-pro-content  { padding: 24px 32px 60px !important; max-width: 640px; }
          .se-pro-signout  { display: none !important; }
        }
      `}</style>

      {/* ── DESKTOP HEADER ── */}
      <div className="se-pro-deskhead" style={{ alignItems: "center", justifyContent: "space-between", padding: "16px 28px", background: "white", borderBottom: "1px solid #F3F0FF", position: "sticky", top: 0, zIndex: 30 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: "#0f172a", margin: 0 }}>My Profile</h1>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: "2px 0 0" }}>Manage your account and preferences</p>
        </div>
        <button onClick={() => signOut({ callbackUrl: "/auth/signin" })} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 12, background: "#FFF1F2", border: "1px solid #FECDD3", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#E11D48" }}>
          <LogOut size={15} /> Sign Out
        </button>
      </div>

      {/* ── MOBILE HEADER ── */}
      <div className="se-pro-mobhead" style={{ alignItems: "center", justifyContent: "space-between", padding: "20px 18px 14px" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "#0f172a", margin: 0 }}>My Profile</h1>
          <p style={{ fontSize: 13, color: "#64748b", margin: "3px 0 0" }}>Account settings</p>
        </div>
      </div>

      <div className="se-pro-content">

        {/* ── PROFILE HERO CARD ── */}
        <div style={{ borderRadius: 20, overflow: "hidden", marginBottom: 20, background: "linear-gradient(135deg, #7C3AED 0%, #4F46E5 60%, #6366F1 100%)", boxShadow: "0 10px 36px rgba(124,58,237,0.28)", padding: "22px 22px 24px" }}>
          <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', gap: 20 }}>
            {/* Avatar */}
            <div style={{
              width: 80,
              height: 80,
              borderRadius: 24,
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 900,
              fontSize: 32,
              flexShrink: 0,
              border: '2px solid rgba(255,255,255,0.3)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            }}>
              {session?.user?.name?.charAt(0).toUpperCase() || "?"}
            </div>

            {/* Name / Email */}
            <div style={{ flex: 1 }}>
              {editingName ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.4)',
                      borderRadius: 12,
                      padding: '8px 12px',
                      fontWeight: 700,
                      fontSize: 20,
                      outline: 'none',
                    }}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveName();
                      if (e.key === "Escape") setEditingName(false);
                    }}
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={savingName}
                    style={{ padding: 8, background: 'rgba(255,255,255,0.2)', borderRadius: 12, border: 'none', cursor: 'pointer', color: 'white', display: 'flex' }}
                  >
                    <Save style={{ width: 16, height: 16 }} />
                  </button>
                  <button
                    onClick={() => setEditingName(false)}
                    style={{ padding: 8, background: 'rgba(255,255,255,0.2)', borderRadius: 12, border: 'none', cursor: 'pointer', color: 'white', display: 'flex' }}
                  >
                    <X style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <h1 style={{ fontSize: 24, fontWeight: 900, color: 'white', margin: 0 }}>{session?.user?.name}</h1>
                  <button
                    onClick={() => {
                      setNewName(session?.user?.name || "");
                      setEditingName(true);
                    }}
                    style={{ padding: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 8, border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', display: 'flex' }}
                    title="Edit name"
                  >
                    <Edit2 style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              )}
              {saveError && <p style={{ color: '#fda4af', fontSize: 12, marginBottom: 4 }}>{saveError}</p>}
              <p style={{ fontSize: 14, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                <Mail style={{ width: 16, height: 16 }} />
                {session?.user?.email}
              </p>
            </div>
          </div>

          {saveSuccess && (
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, color: '#6ee7b7', fontSize: 14 }}>
              <Check style={{ width: 16, height: 16 }} />
              Name updated successfully!
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
          <div style={{ background: "white", borderRadius: 18, border: "1px solid #F3F0FF", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", padding: "16px 12px", textAlign: "center" }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "#EDE9FE", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>
              <Users style={{ width: 16, height: 16, color: PURPLE }} />
            </div>
            <p style={{ fontSize: "clamp(16px, 4vw, 22px)", fontWeight: 900, color: "#0f172a", margin: 0 }}>{groups.length}</p>
            <p style={{ fontSize: 11, fontWeight: 500, color: "#64748b", margin: 0 }}>Groups</p>
          </div>
          <div style={{ background: "white", borderRadius: 18, border: "1px solid #F3F0FF", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", padding: "16px 12px", textAlign: "center" }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "#fff1f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>
              <TrendingDown style={{ width: 16, height: 16, color: "#e11d48" }} />
            </div>
            <p style={{ fontSize: "clamp(14px, 3.5vw, 22px)", fontWeight: 900, color: "#e11d48", margin: 0 }}>₹{youOwe.toFixed(0)}</p>
            <p style={{ fontSize: 11, fontWeight: 500, color: "#64748b", margin: 0 }}>You Owe</p>
          </div>
          <div style={{ background: "white", borderRadius: 18, border: "1px solid #F3F0FF", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", padding: "16px 12px", textAlign: "center" }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>
              <TrendingUp style={{ width: 16, height: 16, color: "#16a34a" }} />
            </div>
            <p style={{ fontSize: "clamp(14px, 3.5vw, 22px)", fontWeight: 900, color: "#16a34a", margin: 0 }}>₹{youGet.toFixed(0)}</p>
            <p style={{ fontSize: 11, fontWeight: 500, color: "#64748b", margin: 0 }}>Owed to You</p>
          </div>
        </div>

        {/* Account Section */}
        <div style={{ background: "white", borderRadius: 18, border: "1px solid #F3F0FF", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 16, overflow: "hidden" }}>
          <div style={{ padding: 4 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", padding: "12px 16px 8px" }}>Account</p>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: "#EDE9FE", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <User style={{ width: 16, height: 16, color: PURPLE }} />
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: 0 }}>Display Name</p>
                  <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{session?.user?.name}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setNewName(session?.user?.name || "");
                  setEditingName(true);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                style={{ fontSize: 12, fontWeight: 600, color: PURPLE, background: "none", border: "none", cursor: "pointer" }}
              >
                Edit
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: "#F5F3FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Mail style={{ width: 16, height: 16, color: PURPLE }} />
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: 0 }}>Email Address</p>
                  <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{session?.user?.email}</p>
                </div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#94a3b8', background: '#f1f5f9', padding: '2px 10px', borderRadius: 20 }}>Verified</span>
            </div>

            {/* UPI ID row */}
            <div style={{ borderTop: '1px solid #f1f5f9', margin: '0 16px' }} />
            <div style={{ padding: '12px 16px', borderRadius: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Smartphone style={{ width: 16, height: 16, color: '#16a34a' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: 0 }}>UPI ID</p>
                    {editingUpi ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <input
                          type="text"
                          value={newUpiId}
                          onChange={e => setNewUpiId(e.target.value)}
                          placeholder="yourname@upi"
                          style={{ fontSize: 13, border: `1.5px solid ${PURPLE}`, borderRadius: 8, padding: "4px 8px", outline: "none", color: "#0f172a", width: 160 }}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveUpi(); if (e.key === 'Escape') setEditingUpi(false); }}
                          autoFocus
                        />
                        <button onClick={handleSaveUpi} disabled={savingUpi} style={{ padding: 4, background: PURPLE, borderRadius: 6, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Save style={{ width: 12, height: 12, color: 'white' }} />
                        </button>
                        <button onClick={() => setEditingUpi(false)} style={{ padding: 4, background: '#f1f5f9', borderRadius: 6, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <X style={{ width: 12, height: 12, color: '#475569' }} />
                        </button>
                      </div>
                    ) : (
                      <p style={{ fontSize: 12, color: upiId ? '#16a34a' : '#94a3b8', margin: 0, fontFamily: 'monospace' }}>{upiId || 'Not set — add to receive UPI payments'}</p>
                    )}
                    {upiError && <p style={{ fontSize: 11, color: '#e11d48', margin: '2px 0 0' }}>{upiError}</p>}
                  </div>
                </div>
                {!editingUpi && (
                  <button
                    onClick={() => { setNewUpiId(upiId); setEditingUpi(true); setUpiError(""); }}
                    style={{ fontSize: 12, fontWeight: 600, color: '#16a34a', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    {upiId ? 'Edit' : 'Add'}
                  </button>
                )}
              </div>
              {upiSuccess && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, color: '#16a34a', fontSize: 12 }}>
                  <Check style={{ width: 14, height: 14 }} />
                  UPI ID saved!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Groups Section */}
        {groups.length > 0 && (
          <div style={{ background: "white", borderRadius: 18, border: "1px solid #F3F0FF", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 16, overflow: "hidden" }}>
            <div style={{ padding: 4 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '12px 16px 8px' }}>
                Your Groups ({groups.length})
              </p>
              {groups.slice(0, 5).map((group) => (
                <Link
                  key={group.id}
                  href={`/groups/${group.id}`}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 16, textDecoration: 'none', color: 'inherit' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #818cf8, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14 }}>
                      {group.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: 0 }}>{group.name}</p>
                      <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{group.members.length} members</p>
                    </div>
                  </div>
                  <ChevronRight style={{ width: 16, height: 16, color: '#94a3b8' }} />
                </Link>
              ))}
              {groups.length > 5 && (
                <Link
                  href="/"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 16px", fontSize: 14, fontWeight: 600, color: PURPLE, textDecoration: "none" }}
                >
                  View all {groups.length} groups
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Sign Out */}
        <div className="se-pro-signout" style={{ background: "white", borderRadius: 18, border: "1px solid #F3F0FF", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <div style={{ padding: 4 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '12px 16px 8px' }}>Actions</p>
            <button
              onClick={() => signOut({ callbackUrl: "/auth/signin" })}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 16, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#fff1f2'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'none'}
            >
              <div style={{ width: 32, height: 32, borderRadius: 10, background: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LogOut style={{ width: 16, height: 16, color: '#e11d48' }} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#e11d48', margin: 0 }}>Sign Out</p>
                <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Sign out of your account</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
    </AppShell>
  );
}
