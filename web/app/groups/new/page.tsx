"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { AppShell } from "@/app/components/AppSidebar";

const PURPLE     = "#7C3AED";
const PURPLE_MID = "#6D28D9";
const PAGE_BG    = "#F8F5FF";

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
  const [memberSearch, setMemberSearch] = useState("");

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

  const filteredUsers = allUsers.filter(u =>
    u.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const EMOJIS = ["💰","🏠","✈️","🍕","🚗","🎉","🛒","🏖️","💼","🎮","🏋️","🎓","🎵","🎬","🍺","🏕️","🎁","🐶","💊","⚽"];

  const CURRENCIES = [
    { code: "INR", symbol: "₹", label: "Indian Rupee" },
    { code: "USD", symbol: "$", label: "US Dollar" },
    { code: "EUR", symbol: "€", label: "Euro" },
    { code: "GBP", symbol: "£", label: "British Pound" },
    { code: "JPY", symbol: "¥", label: "Japanese Yen" },
    { code: "AED", symbol: "د.إ", label: "UAE Dirham" },
  ];

  return (
    <AppShell activeTab="groups">
      <div style={{ background: PAGE_BG, minHeight: "100vh" }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
          .se-gnew-input:focus { border-color: ${PURPLE} !important; }
        `}</style>

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
            <Link href="/profile" style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${PURPLE}, #5B21B6)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "white", textDecoration: "none" }}>
              {initial}
            </Link>
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div style={{ padding: "88px 24px 60px", maxWidth: 720, margin: "0 auto", animation: "fadeIn 0.3s ease" }}>

          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: "#1D1A24", margin: "0 0 6px" }}>Create Group</h2>
            <p style={{ fontSize: 14, color: "#7B7487", margin: 0 }}>Set up a new group to start splitting expenses with friends.</p>
          </div>

          {/* Alerts */}
          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 14, background: "#FFF1F2", border: "1px solid #FECDD3", color: "#E11D48", fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>error</span>
              {error}
            </div>
          )}
          {success && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 14, background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#16A34A", fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              {success}
            </div>
          )}

          {/* Top card: emoji + name + currency */}
          <div style={{ background: "white", borderRadius: 16, border: "1px solid #F0EEFF", padding: 24, marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
              {/* Emoji picker */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => {/* emoji picker toggle */}}
                  style={{ width: 96, height: 96, borderRadius: "50%", background: PURPLE, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, border: "none", cursor: "pointer" }}
                >
                  {emoji}
                </button>
                <div style={{ position: "absolute", bottom: 2, right: 2, width: 24, height: 24, borderRadius: "50%", background: "white", border: `2px solid ${PURPLE}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14, color: PURPLE }}>edit</span>
                </div>
              </div>

              {/* Name + Currency */}
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#7B7487", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                    Group Name
                  </label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={e => setGroupName(e.target.value)}
                    className="se-gnew-input"
                    placeholder="e.g., Vegas Trip, Roommate Bills"
                    style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: "1.5px solid #E4D9F7", fontSize: 15, color: "#1D1A24", background: "white", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#7B7487", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: "1.5px solid #E4D9F7", fontSize: 14, color: "#1D1A24", background: "white", outline: "none", cursor: "pointer" }}
                  >
                    {CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Emoji grid */}
            <div style={{ marginTop: 20 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#7B7487", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                Pick an Emoji
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {EMOJIS.map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    style={{ width: 40, height: 40, borderRadius: 10, border: `2px solid ${emoji === e ? PURPLE : "#E4D9F7"}`, background: emoji === e ? "#EDE9FE" : "#F8FAFC", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", transform: emoji === e ? "scale(1.15)" : "scale(1)" }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Add Members Card */}
          <div style={{ background: "white", borderRadius: 16, border: "1px solid #F0EEFF", padding: 24, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#1D1A24", margin: 0 }}>Add Members</h3>
              <span style={{ background: PURPLE, color: "white", borderRadius: 999, padding: "3px 12px", fontSize: 13, fontWeight: 700 }}>
                {selectedUsers.length + 1} Selected
              </span>
            </div>

            {/* Search / add input */}
            <div style={{ position: "relative", marginBottom: 16 }}>
              <span className="material-symbols-outlined" style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 20, color: "#7B7487" }}>person_add</span>
              <input
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                placeholder="Search or add members..."
                style={{ width: "100%", background: "#F5F0FF", borderRadius: 999, padding: "12px 16px 12px 48px", border: "none", outline: "none", fontSize: 14, color: "#1D1A24", boxSizing: "border-box" }}
              />
            </div>

            {/* Creator row */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #F0EEFF", marginBottom: 8 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: PURPLE, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: "white", flexShrink: 0 }}>
                {initial}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#1D1A24", margin: "0 0 2px" }}>{session?.user?.name} (You)</p>
                <p style={{ fontSize: 12, color: "#7B7487", margin: 0 }}>{session?.user?.email}</p>
              </div>
              <span style={{ background: "#F0EEFF", color: PURPLE, borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>Creator</span>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#7B7487" }}>lock</span>
            </div>

            {/* Member list */}
            {filteredUsers.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {filteredUsers.map(user => {
                  const isSelected = selectedUsers.includes(user.id);
                  return (
                    <div
                      key={user.id}
                      onClick={() => toggleUser(user.id)}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 12, cursor: "pointer", background: isSelected ? "#F5F0FF" : "transparent", border: `1.5px solid ${isSelected ? PURPLE : "transparent"}`, transition: "all 0.15s" }}
                    >
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: isSelected ? PURPLE : "#E4D9F7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: isSelected ? "white" : PURPLE, flexShrink: 0 }}>
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#1D1A24", margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</p>
                        <p style={{ fontSize: 12, color: "#7B7487", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</p>
                      </div>
                      {isSelected ? (
                        <div style={{ width: 24, height: 24, borderRadius: "50%", background: PURPLE, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 14, color: "white", fontVariationSettings: "'FILL' 1" }}>check</span>
                        </div>
                      ) : (
                        <button style={{ background: "none", border: "none", cursor: "pointer", color: "#7B7487", display: "flex" }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_circle</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Create Group Button */}
          <button
            onClick={createGroup}
            disabled={loading || selectedUsers.length === 0 || !groupName.trim()}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "16px 24px", borderRadius: 999, background: (loading || selectedUsers.length === 0 || !groupName.trim()) ? "#C4B5FD" : PURPLE, color: "white", border: "none", cursor: (loading || selectedUsers.length === 0 || !groupName.trim()) ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 16, marginBottom: 12 }}
          >
            {loading ? (
              <>
                <div style={{ width: 20, height: 20, border: "3px solid rgba(255,255,255,0.4)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                Creating...
              </>
            ) : (
              <><span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>group_add</span> Create Group</>
            )}
          </button>

          <p style={{ textAlign: "center", fontSize: 12, color: "#7B7487", margin: 0 }}>
            By creating a group, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
