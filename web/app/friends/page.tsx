"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/app/components/AppSidebar";

interface FriendBalance {
  userId: number;
  name: string;
  email: string;
  balance: number; // positive = they owe you, negative = you owe them
  mutualGroups: number;
}

interface GroupMember {
  userId: number;
  user: { id: number; name: string; email: string };
}

interface Group {
  id: number;
  name: string;
  members: GroupMember[];
  expenses: { amount: number; paidById: number; splits: { userId: number; amount: number }[] }[];
}

const AVATAR_COLORS = ["#7C3AED", "#10B981", "#F59E0B", "#3B82F6", "#EF4444", "#8B5CF6", "#EC4899"];

// ── ADD FRIEND MODAL ───────────────────────────────────────────────────────────
function AddFriendModal({
  isOpen,
  onClose,
  searchQuery,
  onSearchChange,
  searchResults,
  isSearching,
  friendBalances,
  sentRequests,
  sendingRequest,
  onSendRequest,
}: {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchResults: any[];
  isSearching: boolean;
  friendBalances: FriendBalance[];
  sentRequests: Set<number>;
  sendingRequest: number | null;
  onSendRequest: (userId: number) => Promise<void>;
}) {
  if (!isOpen) return null;

  const existingFriendIds = new Set(friendBalances.map(f => f.userId));

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        background: "rgba(15,23,42,0.55)",
        backdropFilter: "blur(6px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "white",
          borderRadius: "24px 24px 0 0",
          width: "100%",
          maxWidth: 540,
          padding: "16px 0 48px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
          maxHeight: "85vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "center", padding: "16px 0 12px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "#E4D9F7" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px 20px" }}>
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: "#1D1A24", margin: 0 }}>Add Friend</h2>
            <p style={{ fontSize: 14, color: "#7B7487", margin: "6px 0 0" }}>Search and invite friends</p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "#F5F0FF",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#4A4455" }}>
              close
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div style={{ padding: "0 24px", marginBottom: 24 }}>
          <div style={{ position: "relative" }}>
            <span
              className="material-symbols-outlined"
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 18,
                color: "#9CA3AF",
              }}
            >
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by name or email..."
              autoFocus
              style={{
                width: "100%",
                background: "#F5F0FF",
                border: "1px solid #EDE9FE",
                borderRadius: 999,
                padding: "11px 16px 11px 42px",
                fontSize: 14,
                color: "#1D1A24",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* Results */}
        <div style={{ padding: "0 24px" }}>
          {isSearching ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#7B7487" }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  border: "3px solid #EDE9FE",
                  borderTopColor: "#7C3AED",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                  margin: "0 auto 12px",
                }}
              />
              <p style={{ margin: 0, fontSize: 14 }}>Searching...</p>
            </div>
          ) : searchQuery.trim() && searchResults.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#7B7487" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 48, color: "#C4B5FD", display: "block", marginBottom: 12 }}>
                person_off
              </span>
              <p style={{ fontSize: 14, margin: 0 }}>No users found</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {searchResults.map((user) => {
                const isAlreadyFriend = existingFriendIds.has(user.id);
                return (
                  <div
                    key={user.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 16px",
                      background: "#F5F0FF",
                      borderRadius: 12,
                      border: "1px solid #EDE9FE",
                      opacity: isAlreadyFriend ? 0.6 : 1,
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        background: AVATAR_COLORS[user.id % AVATAR_COLORS.length],
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                        fontWeight: 900,
                        color: "white",
                        flexShrink: 0,
                      }}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#1D1A24", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {user.name}
                      </p>
                      <p style={{ fontSize: 12, color: "#7B7487", margin: "3px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {user.email}
                      </p>
                    </div>

                    {/* Status */}
                    {isAlreadyFriend ? (
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#10B981", background: "#DCFCE7", padding: "4px 10px", borderRadius: 999 }}>
                        Already friends
                      </span>
                    ) : sentRequests.has(user.id) ? (
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#7C3AED", background: "#EDE9FE", padding: "4px 10px", borderRadius: 999 }}>
                        Request sent
                      </span>
                    ) : (
                      <button
                        onClick={() => onSendRequest(user.id)}
                        disabled={sendingRequest === user.id}
                        style={{
                          background: "#7C3AED",
                          color: "white",
                          border: "none",
                          borderRadius: 8,
                          padding: "8px 16px",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: sendingRequest === user.id ? "not-allowed" : "pointer",
                          whiteSpace: "nowrap",
                          opacity: sendingRequest === user.id ? 0.6 : 1,
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14, marginRight: 4, display: "inline-block", verticalAlign: "middle" }}>
                          {sendingRequest === user.id ? "hourglass_empty" : "person_add"}
                        </span>
                        {sendingRequest === user.id ? "Sending..." : "Add"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Note */}
        {!searchQuery.trim() && (
          <div style={{ padding: "20px 24px 0", borderTop: "1px solid #F0EEFF", marginTop: 24, textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "#7B7487", margin: 0 }}>
              Friends are people you share groups with. Search to find and connect with them!
            </p>
          </div>
        )}

        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
}

export default function FriendsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [friendBalances, setFriendBalances] = useState<FriendBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [addFriendSearchQuery, setAddFriendSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<Set<number>>(new Set());
  const [sendingRequest, setSendingRequest] = useState<number | null>(null);

  const currentUserId = session?.user?.id ? parseInt(session.user.id as string) : null;
  const initial = session?.user?.name?.charAt(0).toUpperCase() || "?";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated" || !currentUserId) return;
    (async () => {
      try {
        const groupsData = await fetch("/api/groups").then(r => r.json());
        const groupsList: Group[] = Array.isArray(groupsData) ? groupsData : [];
        const friendMap: Record<number, FriendBalance> = {};

        for (const group of groupsList) {
          for (const member of group.members) {
            const memberId = member.userId || member.user?.id;
            if (!memberId || memberId === currentUserId) continue;
            if (!friendMap[memberId]) {
              friendMap[memberId] = {
                userId: memberId,
                name: member.user?.name || "Unknown",
                email: member.user?.email || "",
                balance: 0,
                mutualGroups: 0,
              };
            }
            friendMap[memberId].mutualGroups += 1;
          }
        }
        setFriendBalances(Object.values(friendMap));
        await fetchPendingRequests();
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [status, currentUserId]);

  const handleSearchUsers = async (query: string) => {
    setAddFriendSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/friends/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSearchResults(data.users || []);
    } catch (e) {
      console.error(e);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const res = await fetch("/api/friends/request");
      const data = await res.json();
      setPendingRequests(data.requests || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendFriendRequest = async (toUserId: number) => {
    setSendingRequest(toUserId);
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId }),
      });

      if (res.ok) {
        setSentRequests(new Set([...sentRequests, toUserId]));
      } else {
        const error = await res.json();
        alert(error.error || "Failed to send friend request");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to send friend request");
    } finally {
      setSendingRequest(null);
    }
  };

  const handleRespondToRequest = async (requestId: number, action: "accept" | "reject") => {
    try {
      const res = await fetch(`/api/friends/request/${requestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        setPendingRequests(pendingRequests.filter(r => r.id !== requestId));
        if (action === "accept") {
          await fetchFriendsAndRequests();
        }
      } else {
        alert("Failed to respond to request");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to respond to request");
    }
  };

  const fetchFriendsAndRequests = async () => {
    await Promise.all([fetchPendingRequests()]);
  };

  const totalOwedToYou = friendBalances.reduce((s, f) => s + Math.max(0, f.balance), 0);
  const totalYouOwe    = friendBalances.reduce((s, f) => s + Math.max(0, -f.balance), 0);

  const filtered = friendBalances.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const alphaGroups: Record<string, FriendBalance[]> = {};
  for (const f of filtered) {
    const l = f.name.charAt(0).toUpperCase();
    if (!alphaGroups[l]) alphaGroups[l] = [];
    alphaGroups[l].push(f);
  }
  const letters = Object.keys(alphaGroups).sort();

  if (status === "loading" || loading) {
    return (
      <AppShell activeTab="friends">
        <div style={{ minHeight: "100vh", background: "#F8F5FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 44, height: 44, border: "4px solid #EDE9FE", borderTopColor: "#7C3AED", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell activeTab="friends">
      <div style={{ minHeight: "100vh", background: "#F8F5FF" }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

        {/* ── FIXED HEADER ─────────────────────────────────────────────────── */}
        <div
          className="se-header"
          style={{
            height: 72, background: "white", borderBottom: "1px solid #F0EEFF",
            display: "flex", alignItems: "center", padding: "0 28px", gap: 16,
          }}
        >
          {/* Search */}
          <div style={{ flex: 1, position: "relative" }}>
            <span className="material-symbols-outlined" style={{
              position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
              fontSize: 18, color: "#9CA3AF",
            }}>search</span>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search friends..."
              style={{
                width: "100%", background: "#F5F0FF", border: "1px solid #EDE9FE",
                borderRadius: 999, padding: "9px 16px 9px 42px",
                fontSize: 14, color: "#1D1A24", outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
          {/* Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <button style={{ width: 36, height: 36, borderRadius: "50%", background: "none", border: "1.5px solid #EDE9FE", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#4A4455" }}>notifications</span>
            </button>
            <button style={{ width: 36, height: 36, borderRadius: "50%", background: "none", border: "1.5px solid #EDE9FE", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#4A4455" }}>settings</span>
            </button>
            <Link href="/profile" style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "linear-gradient(135deg, #7C3AED, #5B21B6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 800, color: "white", textDecoration: "none",
            }}>{initial}</Link>
          </div>
        </div>

        {/* ── CONTENT ──────────────────────────────────────────────────────── */}
        <div style={{ paddingTop: 96, paddingBottom: 80, paddingLeft: 28, paddingRight: 28 }}>

          {/* Page title row */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
            <div>
              <h1 style={{ fontSize: 34, fontWeight: 900, color: "#1D1A24", margin: "0 0 6px", letterSpacing: "-0.5px" }}>Friends</h1>
              <p style={{ fontSize: 14, color: "#7B7487", margin: 0 }}>Manage your connections and balances.</p>
            </div>
            <button
              onClick={() => setShowAddFriendModal(true)}
              style={{
                background: "#7C3AED", color: "white", borderRadius: 999,
                padding: "11px 22px", fontSize: 14, fontWeight: 700,
                border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_add</span>
              Add Friend
            </button>
          </div>

          {/* ── PENDING REQUESTS ────────────────────────────────────────────── */}
          {pendingRequests.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1D1A24", margin: "0 0 16px" }}>
                Pending Friend Requests ({pendingRequests.length})
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    style={{
                      background: "white",
                      borderRadius: 16,
                      border: "1px solid #F0EEFF",
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    {/* User Info */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: "50%",
                          background: AVATAR_COLORS[request.fromUser.id % AVATAR_COLORS.length],
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 16,
                          fontWeight: 900,
                          color: "white",
                          flexShrink: 0,
                        }}
                      >
                        {request.fromUser.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#1D1A24", margin: 0 }}>
                          {request.fromUser.name}
                        </p>
                        <p style={{ fontSize: 12, color: "#7B7487", margin: "3px 0 0" }}>
                          {request.fromUser.email}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => handleRespondToRequest(request.id, "accept")}
                        style={{
                          flex: 1,
                          background: "#10B981",
                          color: "white",
                          border: "none",
                          borderRadius: 8,
                          padding: "8px 12px",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14, marginRight: 4, display: "inline-block", verticalAlign: "middle" }}>
                          check
                        </span>
                        Accept
                      </button>
                      <button
                        onClick={() => handleRespondToRequest(request.id, "reject")}
                        style={{
                          flex: 1,
                          background: "#EF4444",
                          color: "white",
                          border: "none",
                          borderRadius: 8,
                          padding: "8px 12px",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14, marginRight: 4, display: "inline-block", verticalAlign: "middle" }}>
                          close
                        </span>
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STAT CARDS ─────────────────────────────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16, marginBottom: 36 }}>

            {/* Card 1 — Total Owed to You */}
            <div style={{
              background: "white", borderRadius: 18, border: "1px solid #F0EEFF",
              padding: "24px 24px", display: "flex", alignItems: "center", gap: 20,
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%", background: "#7C3AED",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: "white", fontVariationSettings: "'FILL' 1" }}>credit_card</span>
              </div>
              <div>
                <p style={{ fontSize: 13, color: "#7B7487", margin: "0 0 6px", fontWeight: 500 }}>Total Owed to You</p>
                <p style={{ fontSize: 28, fontWeight: 900, color: "#7C3AED", margin: 0, letterSpacing: "-0.5px" }}>
                  ₹{totalOwedToYou.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Card 2 — You Owe Total + Active Connections */}
            <div style={{
              background: "white", borderRadius: 18, border: "1px solid #F0EEFF",
              padding: "24px 24px", display: "flex", alignItems: "center",
            }}>
              {/* Left: You Owe Total */}
              <div style={{ display: "flex", alignItems: "center", gap: 20, flex: 1 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: "50%", background: "#92400E",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 32, color: "white", fontVariationSettings: "'FILL' 1" }}>volunteer_activism</span>
                </div>
                <div>
                  <p style={{ fontSize: 13, color: "#7B7487", margin: "0 0 6px", fontWeight: 500 }}>You Owe Total</p>
                  <p style={{ fontSize: 28, fontWeight: 900, color: "#92400E", margin: 0, letterSpacing: "-0.5px" }}>
                    ₹{totalYouOwe.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div style={{ width: 1, height: 48, background: "#F0EEFF", margin: "0 28px", flexShrink: 0 }} />

              {/* Right: Active Connections */}
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p style={{ fontSize: 13, color: "#7B7487", margin: "0 0 6px", fontWeight: 500 }}>Active Connections</p>
                <p style={{ fontSize: 28, fontWeight: 900, color: "#1D1A24", margin: 0, letterSpacing: "-0.5px" }}>
                  {friendBalances.length} Friends
                </p>
              </div>
            </div>
          </div>

          {/* ── FRIEND LIST ────────────────────────────────────────────────── */}
          {friendBalances.length === 0 ? (
            <div style={{
              background: "white", borderRadius: 18, border: "1px solid #F0EEFF",
              padding: "56px 40px", textAlign: "center",
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 56, color: "#C4B5FD", display: "block", marginBottom: 16 }}>group</span>
              <p style={{ fontSize: 18, fontWeight: 700, color: "#1D1A24", margin: "0 0 8px" }}>No friends yet</p>
              <p style={{ fontSize: 14, color: "#7B7487", margin: "0 0 20px" }}>Join a group with others to see them here</p>
              <Link href="/groups/new" style={{ background: "#7C3AED", color: "white", borderRadius: 999, padding: "11px 28px", fontSize: 14, fontWeight: 700, textDecoration: "none", display: "inline-block" }}>
                Create a Group
              </Link>
            </div>
          ) : (
            letters.map(letter => (
              <div key={letter} style={{ marginBottom: 32 }}>

                {/* Alpha section header: large letter + divider */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                  <span style={{ fontSize: 28, fontWeight: 900, color: "#7C3AED", lineHeight: 1, flexShrink: 0 }}>{letter}</span>
                  <div style={{ flex: 1, height: 1, background: "#E4D9F7" }} />
                </div>

                {/* 2-col grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {alphaGroups[letter].map((friend, idx) => {
                    const isOwed     = friend.balance > 0;
                    const isOwing    = friend.balance < 0;
                    const avatarBg   = AVATAR_COLORS[friend.userId % AVATAR_COLORS.length];
                    const balLabel   = isOwed ? "owes you" : isOwing ? "you owe" : "settled up";
                    const balColor   = isOwed ? "#7C3AED" : isOwing ? "#92400E" : "#9CA3AF";
                    const balAmount  = friend.balance !== 0
                      ? `₹${Math.abs(friend.balance).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : "₹0.00";

                    return (
                      <div
                        key={friend.userId}
                        style={{
                          background: "white", borderRadius: 16, border: "1px solid #F0EEFF",
                          padding: "16px 18px", display: "flex", alignItems: "center", gap: 14,
                          transition: "box-shadow 0.15s",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(124,58,237,0.08)")}
                        onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
                      >
                        {/* Avatar with optional online dot */}
                        <div style={{ position: "relative", flexShrink: 0 }}>
                          <div style={{
                            width: 52, height: 52, borderRadius: "50%",
                            background: avatarBg,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 20, fontWeight: 900, color: "white",
                          }}>
                            {friend.name.charAt(0).toUpperCase()}
                          </div>
                          {/* Green online dot — show for users with active balance */}
                          {friend.balance !== 0 && (
                            <div style={{
                              position: "absolute", bottom: 2, right: 2,
                              width: 12, height: 12, borderRadius: "50%",
                              background: "#10B981", border: "2px solid white",
                            }} />
                          )}
                        </div>

                        {/* Name + mutual groups */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 15, fontWeight: 700, color: "#1D1A24", margin: "0 0 5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {friend.name}
                          </p>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#9CA3AF" }}>group</span>
                            <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>
                              {friend.mutualGroups} mutual group{friend.mutualGroups !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>

                        {/* Balance */}
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <p style={{ fontSize: 11, color: "#9CA3AF", margin: "0 0 3px", fontWeight: 500 }}>{balLabel}</p>
                          <p style={{ fontSize: 18, fontWeight: 800, color: balColor, margin: 0, letterSpacing: "-0.3px" }}>
                            {balAmount}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Friend Modal */}
      <AddFriendModal
        isOpen={showAddFriendModal}
        onClose={() => {
          setShowAddFriendModal(false);
          setAddFriendSearchQuery("");
          setSearchResults([]);
        }}
        searchQuery={addFriendSearchQuery}
        onSearchChange={handleSearchUsers}
        searchResults={searchResults}
        isSearching={searching}
        friendBalances={friendBalances}
        sentRequests={sentRequests}
        sendingRequest={sendingRequest}
        onSendRequest={handleSendFriendRequest}
      />
    </AppShell>
  );
}
