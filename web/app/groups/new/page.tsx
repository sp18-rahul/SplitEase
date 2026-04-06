"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { UserPlus, Users, Loader2, Check, AlertCircle, ArrowLeft, Bell, Settings } from "lucide-react";
import { AppShell } from "@/app/components/AppSidebar";

const PURPLE     = "#7C3AED";
const PURPLE_MID = "#6D28D9";
const PAGE_BG    = "#F0EEFF";

interface User {
  id: number;
  name: string;
  email: string;
}

export default function NewGroup() {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ? parseInt(session.user.id as string) : null;
  const initial = session?.user?.name?.charAt(0).toUpperCase() || "?";

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [groupName, setGroupName] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [emoji, setEmoji] = useState("💰");
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [addingUser, setAddingUser] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users");
        if (!res.ok) throw new Error("Failed to fetch users");
        const data = await res.json();
        setAllUsers(data.filter((u: User) => u.id !== currentUserId));
      } catch {
        setError("Failed to load users");
      }
    };
    fetchUsers();
  }, []);

  const addUser = async () => {
    setError("");
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      setError("All fields are required");
      return;
    }
    if (newUserPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUserEmail)) {
      setError("Invalid email format");
      return;
    }
    setAddingUser(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newUserName, email: newUserEmail, password: newUserPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to create user"); return; }
      const newUser = { id: parseInt(data.userId), name: newUserName, email: newUserEmail };
      setAllUsers([...allUsers, newUser]);
      setSelectedUsers([...selectedUsers, newUser.id]);
      setNewUserName(""); setNewUserEmail(""); setNewUserPassword("");
      setSuccess(`${newUserName} added successfully!`);
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setAddingUser(false);
    }
  };

  const toggleUser = (userId: number) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const createGroup = async () => {
    setError("");
    if (!groupName.trim()) { setError("Group name is required"); return; }
    if (selectedUsers.length === 0) { setError("Please select at least one member"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: groupName, memberIds: selectedUsers, currency, emoji }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to create group"); return; }
      router.push(`/groups/${data.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "11px 14px",
    borderRadius: 12,
    border: "1.5px solid #E2E8F0",
    fontSize: 15,
    color: "#0f172a",
    background: "white",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  };

  return (
    <AppShell activeTab="groups">
      <div style={{ background: PAGE_BG, minHeight: "100vh" }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
          .se-gnew-deskhead { display: none; }
          .se-gnew-mobhead  { display: flex; }
          .se-gnew-content  { padding: 0 16px 100px; }
          @media (min-width: 1024px) {
            .se-gnew-deskhead { display: flex !important; }
            .se-gnew-mobhead  { display: none !important; }
            .se-gnew-content  { padding: 24px 32px 60px !important; max-width: 680px; }
          }
          .se-gnew-input:focus { border-color: ${PURPLE} !important; }
        `}</style>

        {/* ── DESKTOP HEADER ── */}
        <div className="se-gnew-deskhead" style={{ alignItems: "center", justifyContent: "space-between", padding: "16px 28px", background: "white", borderBottom: "1px solid #F3F0FF", position: "sticky", top: 0, zIndex: 30 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/groups" style={{ width: 36, height: 36, borderRadius: "50%", background: "#F8F5FF", border: "1px solid #EDE9FE", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
              <ArrowLeft size={16} color={PURPLE} />
            </Link>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 900, color: "#0f172a", margin: 0 }}>Create New Group</h1>
              <p style={{ fontSize: 13, color: "#94a3b8", margin: "2px 0 0" }}>Add members and start splitting</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
        <div className="se-gnew-mobhead" style={{ alignItems: "center", gap: 12, padding: "20px 18px 14px" }}>
          <Link href="/groups" style={{ width: 36, height: 36, borderRadius: "50%", background: "white", border: "1px solid #EDE9FE", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", flexShrink: 0 }}>
            <ArrowLeft size={16} color={PURPLE} />
          </Link>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: "#0f172a", margin: 0 }}>New Group</h1>
            <p style={{ fontSize: 13, color: "#64748b", margin: "2px 0 0" }}>Add members and split expenses</p>
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div className="se-gnew-content" style={{ animation: "fadeIn 0.3s ease" }}>

          {/* Hero banner */}
          <div style={{ borderRadius: 20, background: `linear-gradient(135deg, ${PURPLE} 0%, #4F46E5 60%, #6366F1 100%)`, boxShadow: `0 10px 36px ${PURPLE}44`, padding: "22px 22px 24px", marginBottom: 20, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ padding: 14, background: "rgba(255,255,255,0.2)", borderRadius: 18, border: "1px solid rgba(255,255,255,0.3)", backdropFilter: "blur(8px)", flexShrink: 0 }}>
              <Users size={32} color="white" />
            </div>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: "white", margin: "0 0 4px" }}>Create New Group</h2>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", margin: 0 }}>Add friends and start splitting expenses together.</p>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 14, background: "#FFF1F2", border: "1px solid #FECDD3", color: "#E11D48", fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
              <AlertCircle size={18} />
              {error}
            </div>
          )}
          {success && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 14, background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#16A34A", fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
              <Check size={18} />
              {success}
            </div>
          )}

          {/* Form card */}
          <div style={{ background: "white", borderRadius: 20, border: "1px solid #F3F0FF", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", padding: "clamp(16px, 4vw, 28px)", marginBottom: 12 }}>

            {/* Group Name */}
            <div style={{ marginBottom: 22 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                Group Name
              </label>
              <input
                type="text"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                className="se-gnew-input"
                style={{ ...inputStyle, fontSize: 18, padding: "12px 16px" }}
                placeholder="e.g., Vegas Trip 🎰, Roommate Bills 🏠"
              />
            </div>

            {/* Group Icon */}
            <div style={{ marginBottom: 22 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                Group Icon
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                <div style={{ width: 56, height: 56, borderRadius: 18, background: `linear-gradient(135deg, #EDE9FE, #F5F3FF)`, border: `2px solid #C4B5FD`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>
                  {emoji}
                </div>
                <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Pick an emoji that represents your group</p>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {["💰","🏠","✈️","🍕","🚗","🎉","🛒","🏖️","💼","🎮","🏋️","🎓","🎵","🎬","🍺","🏕️","🎁","🐶","💊","⚽"].map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    style={{ width: 40, height: 40, borderRadius: 10, border: `2px solid ${emoji === e ? PURPLE : "#E2E8F0"}`, background: emoji === e ? "#EDE9FE" : "#F8FAFC", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", transform: emoji === e ? "scale(1.15)" : "scale(1)" }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Currency */}
            <div style={{ marginBottom: 28 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                Currency
              </label>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {[
                  { code: "INR", symbol: "₹", label: "Indian Rupee" },
                  { code: "USD", symbol: "$", label: "US Dollar" },
                  { code: "EUR", symbol: "€", label: "Euro" },
                  { code: "GBP", symbol: "£", label: "British Pound" },
                  { code: "JPY", symbol: "¥", label: "Japanese Yen" },
                  { code: "AED", symbol: "د.إ", label: "UAE Dirham" },
                ].map(({ code, symbol, label }) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setCurrency(code)}
                    title={label}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 12,
                      border: `2px solid ${currency === code ? PURPLE : "#E2E8F0"}`,
                      background: currency === code ? "#EDE9FE" : "#F8FAFC",
                      color: currency === code ? PURPLE_MID : "#475569",
                      fontWeight: 700,
                      fontSize: 15,
                      cursor: "pointer",
                      transition: "all 0.15s",
                      boxShadow: currency === code ? `0 2px 8px ${PURPLE}25` : "none",
                    }}
                  >
                    {symbol} {code}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Add New Member card */}
          <div style={{ background: "white", borderRadius: 20, border: "1px solid #F3F0FF", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", padding: "clamp(16px, 4vw, 24px)", marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", marginBottom: 18, display: "flex", alignItems: "center", gap: 8, margin: "0 0 18px" }}>
              <UserPlus size={18} color={PURPLE} />
              Add New Member
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <input
                type="text"
                value={newUserName}
                onChange={e => setNewUserName(e.target.value)}
                placeholder="Full Name"
                className="se-gnew-input"
                style={inputStyle}
              />
              <input
                type="email"
                value={newUserEmail}
                onChange={e => setNewUserEmail(e.target.value)}
                placeholder="Email Address"
                className="se-gnew-input"
                style={inputStyle}
              />
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                type="password"
                value={newUserPassword}
                onChange={e => setNewUserPassword(e.target.value)}
                placeholder="Password (min 6 characters)"
                className="se-gnew-input"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={addUser}
                disabled={addingUser}
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "11px 18px", borderRadius: 12, background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_MID})`, color: "white", border: "none", cursor: addingUser ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 13, opacity: addingUser ? 0.7 : 1, whiteSpace: "nowrap", boxShadow: `0 3px 10px ${PURPLE}44`, flexShrink: 0 }}
              >
                {addingUser ? <><Loader2 size={15} style={{ animation: "spin 0.8s linear infinite" }} /> Adding...</> : <><UserPlus size={15} /> Add</>}
              </button>
            </div>
          </div>

          {/* Select Members card */}
          {allUsers.length > 0 && (
            <div style={{ background: "white", borderRadius: 20, border: "1px solid #F3F0FF", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", padding: "clamp(16px, 4vw, 24px)", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", margin: 0 }}>Select Members</h3>
                <span style={{ padding: "4px 12px", borderRadius: 20, background: "#EDE9FE", color: PURPLE, fontSize: 12, fontWeight: 700 }}>
                  {selectedUsers.length} selected
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {allUsers.map(user => {
                  const isSelected = selectedUsers.includes(user.id);
                  return (
                    <button
                      key={user.id}
                      onClick={() => toggleUser(user.id)}
                      style={{
                        borderRadius: 14,
                        border: `2px solid ${isSelected ? PURPLE : "#E2E8F0"}`,
                        background: isSelected ? "#EDE9FE" : "white",
                        padding: "14px 12px",
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "all 0.15s",
                        boxShadow: isSelected ? `0 2px 8px ${PURPLE}25` : "none",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: "50%", border: `2px solid ${isSelected ? PURPLE : "#D1D5DB"}`, background: isSelected ? PURPLE : "#F9FAFB", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {isSelected && <Check size={14} color="white" />}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontWeight: 700, color: isSelected ? PURPLE_MID : "#1e293b", margin: 0, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</p>
                          <p style={{ fontSize: 11, color: "#64748b", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 12, paddingTop: 4 }}>
            <Link
              href="/groups"
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 20px", borderRadius: 14, background: "white", border: "1.5px solid #E2E8F0", color: "#475569", fontWeight: 700, fontSize: 15, textDecoration: "none" }}
            >
              <ArrowLeft size={18} /> Cancel
            </Link>
            <button
              onClick={createGroup}
              disabled={loading || selectedUsers.length === 0 || !groupName.trim()}
              style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 20px", borderRadius: 14, background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_MID})`, color: "white", border: "none", cursor: (loading || selectedUsers.length === 0 || !groupName.trim()) ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 15, opacity: (selectedUsers.length === 0 || !groupName.trim()) ? 0.6 : 1, boxShadow: `0 4px 14px ${PURPLE}44` }}
            >
              {loading ? <><Loader2 size={18} style={{ animation: "spin 0.8s linear infinite" }} /> Creating...</> : <>Create Group</>}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
