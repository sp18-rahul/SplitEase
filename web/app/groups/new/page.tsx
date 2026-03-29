"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { UserPlus, Users, Loader2, Check, AlertCircle, ArrowLeft } from "lucide-react";

interface User {
  id: number;
  name: string;
  email: string;
}

export default function NewGroup() {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ? parseInt(session.user.id as string) : null;
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
      } catch (err) {
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
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create user");
        return;
      }

      const newUser = { id: parseInt(data.userId), name: newUserName, email: newUserEmail };
      setAllUsers([...allUsers, newUser]);
      setSelectedUsers([...selectedUsers, newUser.id]);

      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setSuccess(`${newUserName} added successfully!`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setAddingUser(false);
    }
  };

  const toggleUser = (userId: number) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const createGroup = async () => {
    setError("");

    if (!groupName.trim()) {
      setError("Group name is required");
      return;
    }

    if (selectedUsers.length === 0) {
      setError("Please select at least one member");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupName,
          memberIds: selectedUsers,
          currency,
          emoji,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create group");
        return;
      }

      router.push(`/groups/${data.id}`);
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-page" style={{ padding: '48px 16px' }}>
      <div className="mx-auto animate-fadeIn" style={{ maxWidth: 640 }}>
        {/* Back */}
        <div style={{ marginBottom: 16 }}>
          <Link href="/" className="btn-ghost inline-flex items-center gap-2" style={{ color: '#475569' }}>
            <ArrowLeft style={{ width: 16, height: 16 }} />
            <span style={{ fontSize: 14, fontWeight: 500 }}>Back</span>
          </Link>
        </div>

        <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
          {/* Header */}
          <div className="summary-card" style={{ borderRadius: '1.5rem 1.5rem 0 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ padding: 12, background: 'rgba(255,255,255,0.2)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.3)' }}>
                <Users style={{ width: 32, height: 32, color: 'white' }} />
              </div>
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 900, color: 'white', marginBottom: 4 }}>Create New Group</h2>
                <p style={{ fontSize: 14, color: '#e2e8f0', margin: 0 }}>Add friends and start splitting expenses.</p>
              </div>
            </div>
          </div>

          <div style={{ padding: 'clamp(16px, 4vw, 32px)' }}>
            {error && (
              <div className="alert-error" role="alert" style={{ marginBottom: 16 }}>
                <AlertCircle style={{ width: 20, height: 20, flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="alert-success" role="status" style={{ marginBottom: 16 }}>
                <Check style={{ width: 20, height: 20, flexShrink: 0 }} />
                {success}
              </div>
            )}

            {/* Group Name */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }} htmlFor="groupName">
                Group Name
              </label>
              <input
                type="text"
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="input-field"
                style={{ fontSize: 18, padding: '12px 16px' }}
                placeholder="e.g., Vegas Trip 🎰, Roommate Bills 🏠"
              />
            </div>

            {/* Group Emoji */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                Group Icon
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                <div style={{ width: 56, height: 56, borderRadius: 18, background: 'linear-gradient(135deg, #eef2ff, #f5f3ff)', border: '2px solid #c7d2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>
                  {emoji}
                </div>
                <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Pick an emoji that represents your group</p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['💰','🏠','✈️','🍕','🚗','🎉','🛒','🏖️','💼','🎮','🏋️','🎓','🎵','🎬','🍺','🏕️','🎁','🐶','💊','⚽'].map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    style={{ width: 40, height: 40, borderRadius: 10, border: `2px solid ${emoji === e ? '#4f46e5' : '#e2e8f0'}`, background: emoji === e ? '#eef2ff' : '#f8fafc', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', transform: emoji === e ? 'scale(1.15)' : 'scale(1)' }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Currency */}
            <div style={{ marginBottom: 32 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                Currency
              </label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {[
                  { code: 'INR', symbol: '₹', label: 'Indian Rupee' },
                  { code: 'USD', symbol: '$', label: 'US Dollar' },
                  { code: 'EUR', symbol: '€', label: 'Euro' },
                  { code: 'GBP', symbol: '£', label: 'British Pound' },
                  { code: 'JPY', symbol: '¥', label: 'Japanese Yen' },
                  { code: 'AED', symbol: 'د.إ', label: 'UAE Dirham' },
                ].map(({ code, symbol, label }) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setCurrency(code)}
                    title={label}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 12,
                      border: `2px solid ${currency === code ? '#4f46e5' : '#e2e8f0'}`,
                      background: currency === code ? '#eef2ff' : '#f8fafc',
                      color: currency === code ? '#4338ca' : '#475569',
                      fontWeight: 700,
                      fontSize: 15,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      boxShadow: currency === code ? '0 2px 8px rgba(79,70,229,0.15)' : 'none',
                    }}
                  >
                    {symbol} {code}
                  </button>
                ))}
              </div>
            </div>

            {/* Add New Member */}
            <div className="card-static" style={{ marginBottom: 32, padding: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserPlus style={{ width: 20, height: 20, color: '#4f46e5' }} />
                Add New Member
              </h3>
              <div className="form-grid-2" style={{ marginBottom: 12 }}>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Full Name"
                  className="input-field"
                />
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="Email Address"
                  className="input-field"
                />
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Password (min 6 characters)"
                  className="input-field"
                  style={{ flex: 1 }}
                />
                <button
                  onClick={addUser}
                  disabled={addingUser}
                  className="btn-secondary"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {addingUser ? (
                    <>
                      <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <UserPlus style={{ width: 16, height: 16 }} />
                      Add Member
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Select Members */}
            {allUsers.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Select Members</span>
                  <span className="badge badge-primary">{selectedUsers.length} selected</span>
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {allUsers.map((user) => {
                    const isSelected = selectedUsers.includes(user.id);
                    return (
                      <button
                        key={user.id}
                        onClick={() => toggleUser(user.id)}
                        aria-pressed={isSelected}
                        style={{
                          borderRadius: 16,
                          border: `2px solid ${isSelected ? '#4f46e5' : '#e2e8f0'}`,
                          background: isSelected ? '#eef2ff' : '#ffffff',
                          padding: 16,
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: isSelected ? '0 2px 8px rgba(79,70,229,0.15)' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            border: `2px solid ${isSelected ? '#4f46e5' : '#d1d5db'}`,
                            background: isSelected ? '#4f46e5' : '#f9fafb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            {isSelected && <Check style={{ width: 16, height: 16, color: 'white' }} />}
                          </div>
                          <div>
                            <p style={{ fontWeight: 700, color: isSelected ? '#312e81' : '#1e293b', margin: 0, fontSize: 14 }}>{user.name}</p>
                            <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{user.email}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12, paddingTop: 24, borderTop: '1px solid #f1f5f9' }}>
              <Link href="/" className="btn-secondary" style={{ flex: 1, justifyContent: 'center', fontSize: 16, padding: '12px 24px' }}>
                <ArrowLeft style={{ width: 20, height: 20 }} />
                Cancel
              </Link>
              <button
                onClick={createGroup}
                disabled={loading || selectedUsers.length === 0 || !groupName.trim()}
                className="btn-primary"
                style={{ flex: 2, justifyContent: 'center', fontSize: 16, padding: '12px 24px' }}
              >
                {loading ? (
                  <>
                    <Loader2 style={{ width: 20, height: 20 }} className="animate-spin" />
                    Creating Group...
                  </>
                ) : (
                  <>Create Group</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
