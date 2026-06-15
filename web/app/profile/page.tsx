"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { AppShell } from "@/app/components/AppSidebar";
import { useTheme } from "@/lib/theme-context";

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
  const { theme, setTheme: setThemePreference } = useTheme();
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

  const [themeSuccess, setThemeSuccess] = useState(false);

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

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
    try {
      await setThemePreference(newTheme);
      setThemeSuccess(true);
      setTimeout(() => setThemeSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to update theme:', error);
    }
  };

  const initial = session?.user?.name?.charAt(0).toUpperCase() || "?";

  if (status === "loading") {
    return (
      <AppShell activeTab="profile">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#F8F5FF" }}>
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
      <div style={{ minHeight: "100vh", background: "#F8F5FF" }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        {/* ── HEADER — se-header handles responsive offset ── */}
        <div
          className="se-header"
          style={{
            height: 72, background: "white", borderBottom: "1px solid #F0EEFF",
            display: "flex", alignItems: "center", padding: "0 28px", gap: 16,
          }}
        >
          <div style={{ flex: 1, position: "relative" }}>
            <span className="material-symbols-outlined" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: "#9CA3AF" }}>search</span>
            <input
              placeholder="Search expenses..."
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
            <Link href="/profile" style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #7C3AED, #5B21B6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "white", textDecoration: "none" }}>
              {initial}
            </Link>
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div style={{ padding: "88px 24px 60px", maxWidth: 720, margin: "0 auto" }}>

          {/* Profile Hero Card */}
          <div className="bg-white rounded-2xl border border-[#F0EEFF] p-6 flex flex-col md:flex-row items-start md:items-center gap-5 mb-5"
            style={{ background: "white", borderRadius: 16, border: "1px solid #F0EEFF", padding: 24, display: "flex", flexDirection: "row", alignItems: "center", gap: 20, marginBottom: 20 }}>
            {/* Avatar */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{ width: 96, height: 96, borderRadius: "50%", border: "4px solid #EDE9FE", background: "linear-gradient(135deg, #7C3AED, #5B21B6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 900, color: "white" }}>
                {initial}
              </div>
              <button
                onClick={() => { setNewName(session?.user?.name || ""); setEditingName(true); }}
                style={{ position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: "50%", background: "#7C3AED", border: "2px solid white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: "white" }}>edit</span>
              </button>
            </div>

            {/* Name / Email */}
            <div style={{ flex: 1 }}>
              {editingName ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    style={{ border: "1.5px solid #7C3AED", borderRadius: 10, padding: "6px 12px", fontWeight: 700, fontSize: 18, outline: "none", color: "#1D1A24" }}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveName();
                      if (e.key === "Escape") setEditingName(false);
                    }}
                  />
                  <button onClick={handleSaveName} disabled={savingName} style={{ padding: 6, background: "#7C3AED", borderRadius: 8, border: "none", cursor: "pointer", display: "flex" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, color: "white" }}>save</span>
                  </button>
                  <button onClick={() => setEditingName(false)} style={{ padding: 6, background: "#F1F5F9", borderRadius: 8, border: "none", cursor: "pointer", display: "flex" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#475569" }}>close</span>
                  </button>
                </div>
              ) : (
                <h1 style={{ fontSize: 24, fontWeight: 900, color: "#1D1A24", margin: "0 0 4px" }}>{session?.user?.name}</h1>
              )}
              {saveError && <p style={{ color: "#E11D48", fontSize: 12, margin: "2px 0 4px" }}>{saveError}</p>}
              {saveSuccess && <p style={{ color: "#16a34a", fontSize: 12, margin: "2px 0 4px" }}>Name updated!</p>}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#7C3AED" }}>verified_user</span>
                <p style={{ fontSize: 14, color: "#7B7487", margin: 0 }}>{session?.user?.email}</p>
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
              <button
                onClick={() => { setNewName(session?.user?.name || ""); setEditingName(true); }}
                style={{ background: "#7C3AED", color: "white", borderRadius: 999, padding: "8px 20px", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer" }}
              >
                Edit Profile
              </button>
              <button style={{ border: "1.5px solid #7C3AED", color: "#7C3AED", borderRadius: 999, padding: "8px 20px", fontSize: 14, fontWeight: 700, background: "white", cursor: "pointer" }}>
                Manage Accounts
              </button>
            </div>
          </div>

          {/* Stats Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
            <div style={{ background: "white", borderRadius: 16, border: "1px solid #F0EEFF", padding: 20, textAlign: "center" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 28, color: "#7C3AED", display: "block", marginBottom: 8 }}>group</span>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#7B7487", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 6px" }}>Active Groups</p>
              <p style={{ fontSize: 28, fontWeight: 900, color: "#1D1A24", margin: 0 }}>{groups.length}</p>
            </div>
            <div style={{ background: "white", borderRadius: 16, border: "1px solid #F0EEFF", padding: 20, textAlign: "center" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 28, color: "#7C3AED", display: "block", marginBottom: 8 }}>arrow_circle_up</span>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#7B7487", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 6px" }}>Total You&apos;re Owed</p>
              <p style={{ fontSize: 24, fontWeight: 900, color: "#7C3AED", margin: 0 }}>${youGet.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div style={{ background: "white", borderRadius: 16, border: "1px solid #F0EEFF", padding: 20, textAlign: "center" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 28, color: "#E11D48", display: "block", marginBottom: 8 }}>arrow_circle_down</span>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#7B7487", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 6px" }}>Total You Owe</p>
              <p style={{ fontSize: 24, fontWeight: 900, color: "#E11D48", margin: 0 }}>${youOwe.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>

          {/* Payment Details Card */}
          <div style={{ background: "white", borderRadius: 16, border: "1px solid #F0EEFF", padding: 24, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: "white" }}>payments</span>
              </div>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#1D1A24", margin: 0 }}>Payment Details</p>
            </div>

            <p style={{ fontSize: 12, fontWeight: 600, color: "#7B7487", margin: "0 0 8px" }}>Default UPI ID</p>
            <div style={{ display: "flex", alignItems: "center", background: "#F5F0FF", borderRadius: 12, padding: "12px 16px", marginBottom: 8 }}>
              {editingUpi ? (
                <>
                  <input
                    type="text"
                    value={newUpiId}
                    onChange={e => setNewUpiId(e.target.value)}
                    placeholder="yourname@upi"
                    style={{ flex: 1, border: "none", background: "transparent", fontSize: 14, color: "#1D1A24", outline: "none", fontFamily: "monospace" }}
                    onKeyDown={e => { if (e.key === "Enter") handleSaveUpi(); if (e.key === "Escape") setEditingUpi(false); }}
                    autoFocus
                  />
                  <button onClick={handleSaveUpi} disabled={savingUpi} style={{ background: "#7C3AED", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: "white", fontSize: 12, fontWeight: 600, marginRight: 6 }}>Save</button>
                  <button onClick={() => setEditingUpi(false)} style={{ background: "#F1F5F9", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: "#475569", fontSize: 12 }}>Cancel</button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, fontSize: 14, color: upiId ? "#1D1A24" : "#7B7487", fontFamily: "monospace" }}>{upiId || "Not set"}</span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(upiId); }}
                    style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}
                    title="Copy UPI ID"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#7B7487" }}>content_copy</span>
                  </button>
                </>
              )}
            </div>
            {upiError && <p style={{ fontSize: 12, color: "#E11D48", margin: "4px 0" }}>{upiError}</p>}
            {upiSuccess && <p style={{ fontSize: 12, color: "#16a34a", margin: "4px 0" }}>UPI ID saved!</p>}
            <p style={{ fontSize: 12, color: "#7B7487", margin: "8px 0 16px" }}>This ID will be shared with group members to settle debts.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ border: "1.5px solid #E4D9F7", borderRadius: 999, padding: "10px 20px", fontSize: 14, fontWeight: 700, background: "white", color: "#1D1A24", cursor: "pointer" }}>
                View QR Code
              </button>
              <button
                onClick={() => { setNewUpiId(upiId); setEditingUpi(true); setUpiError(""); }}
                style={{ background: "#7C3AED", color: "white", borderRadius: 999, padding: "10px 20px", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer" }}
              >
                Update ID
              </button>
            </div>
          </div>

          {/* App Preferences Card */}
          <div style={{ background: "white", borderRadius: 16, border: "1px solid #F0EEFF", padding: 24, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "#F0EEFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#7C3AED" }}>tune</span>
              </div>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#1D1A24", margin: 0 }}>App Preferences</p>
            </div>

            {/* Currency Preference */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 16, borderBottom: "1px solid #F0EEFF" }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#1D1A24", margin: "0 0 2px" }}>Currency Preference</p>
                <p style={{ fontSize: 12, color: "#7B7487", margin: 0 }}>Set your default currency for new groups</p>
              </div>
              <select style={{ border: "1.5px solid #E4D9F7", borderRadius: 10, padding: "8px 12px", fontSize: 14, color: "#1D1A24", outline: "none", cursor: "pointer" }}>
                <option>₹ INR</option>
                <option>$ USD</option>
                <option>€ EUR</option>
              </select>
            </div>

            {/* Dark Mode */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: "1px solid #F0EEFF" }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#1D1A24", margin: "0 0 2px" }}>Dark Mode</p>
                <p style={{ fontSize: 12, color: "#7B7487", margin: 0 }}>Switch to dark theme</p>
              </div>
              <select
                value={theme}
                onChange={(e) => handleThemeChange(e.target.value as 'light' | 'dark' | 'system')}
                style={{ border: "1.5px solid #E4D9F7", borderRadius: 10, padding: "8px 12px", fontSize: 14, color: "#1D1A24", outline: "none", cursor: "pointer" }}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </div>
            {themeSuccess && (
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", padding: "10px 12px", borderRadius: 8, fontSize: 12, marginBottom: 16, animation: "slideInDown 0.3s ease-out" }}>
                ✓ Theme preference updated
              </div>
            )}

            {/* Smart Split */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 16 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#1D1A24", margin: "0 0 2px" }}>Smart Split</p>
                <p style={{ fontSize: 12, color: "#7B7487", margin: 0 }}>Auto-suggest equal splits for expenses</p>
              </div>
              <div style={{ width: 20, height: 20, borderRadius: 6, border: "2px solid #7C3AED", background: "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 13, color: "white", fontVariationSettings: "'FILL' 1" }}>check</span>
              </div>
            </div>
          </div>

          {/* Danger Zone Card */}
          <div style={{ background: "white", borderRadius: 16, border: "1px solid #fecdd3", padding: 24, position: "relative", overflow: "hidden" }}>
            {/* Diagonal pattern top-right */}
            <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, opacity: 0.1, backgroundImage: "repeating-linear-gradient(45deg, #E11D48 0px, #E11D48 2px, transparent 2px, transparent 10px)", pointerEvents: "none" }} />

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "#E11D48", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: "white" }}>gpp_maybe</span>
              </div>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#E11D48", margin: 0 }}>Danger Zone</p>
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <button
                onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                style={{ border: "2px solid #E11D48", color: "#E11D48", borderRadius: 999, padding: "10px 20px", fontSize: 14, fontWeight: 700, background: "white", cursor: "pointer" }}
              >
                Sign Out
              </button>
              <button style={{ background: "#E11D48", color: "white", borderRadius: 999, padding: "10px 20px", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer" }}>
                Delete Account
              </button>
            </div>
            <p style={{ fontSize: 12, color: "#E11D48", margin: 0 }}>Deleting your account is permanent and cannot be undone. All your data will be removed.</p>
          </div>

        </div>
      </div>
    </AppShell>
  );
}
