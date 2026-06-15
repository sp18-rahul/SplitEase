"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface GroupInfo {
  id: number;
  name: string;
  emoji?: string;
  currency?: string;
  memberCount: number;
  members: { id: number; name: string }[];
  alreadyMember: boolean;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥", AED: "د.إ",
};

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const { data: session, status: authStatus } = useSession();

  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const res = await fetch(`/api/invite/${token}`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Invalid invite link");
          return;
        }
        const data = await res.json();
        setGroup(data);
        if (data.alreadyMember) setJoined(true);
      } catch {
        setError("Failed to load invite. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();
  }, [token]);

  const handleJoin = async () => {
    if (!session) return;
    setJoining(true);
    setError("");
    try {
      const res = await fetch(`/api/invite/${token}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to join group");
        return;
      }
      setJoined(true);
      // Redirect to the group after a short delay
      setTimeout(() => router.push(`/groups/${data.groupId}`), 1200);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  if (loading || authStatus === "loading") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8F5FF" }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 48, height: 48, border: "4px solid #EDE9FE", borderTopColor: "#7C3AED", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <p style={{ color: "#7C3AED", fontWeight: 600, fontSize: 16, margin: 0 }}>Loading invite…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F8F5FF", display: "flex", flexDirection: "column" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />

      {/* ── HEADER ── */}
      <div style={{ background: "white", borderBottom: "1px solid #F0EEFF", height: 72, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#F0EEFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#7C3AED" }}>group_add</span>
          </div>
          <span style={{ fontSize: 18, fontWeight: 900, color: "#1D1A24", letterSpacing: "-0.5px" }}>SplitEase</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <a href="#" style={{ fontSize: 14, color: "#7B7487", textDecoration: "none", fontWeight: 500 }}>How it works</a>
          <a href="#" style={{ fontSize: 14, color: "#7B7487", textDecoration: "none", fontWeight: 500 }}>Support</a>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 16px" }}>
        <div style={{ width: "100%", maxWidth: 560, animation: "fadeIn 0.4s ease" }}>

          {/* Main Card */}
          <div style={{ background: "white", borderRadius: 24, boxShadow: "0 4px 24px rgba(124,58,237,0.10)", border: "1px solid #F0EEFF", padding: 32 }}>

            {error && !group ? (
              /* Error state */
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#fff1f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 32, color: "#e11d48", fontVariationSettings: "'FILL' 1" }}>error</span>
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1D1A24", marginBottom: 8 }}>Invite Not Found</h2>
                <p style={{ fontSize: 14, color: "#7B7487", marginBottom: 24 }}>{error}</p>
                <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#7C3AED", color: "white", fontWeight: 700, fontSize: 15, padding: "12px 24px", borderRadius: 999, textDecoration: "none" }}>
                  Go to SplitEase
                </Link>
              </div>
            ) : group ? (
              <>
                {/* Header icon + title */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#F0EEFF", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 32, color: "#7C3AED" }}>group_add</span>
                  </div>
                  <h1 style={{ fontSize: 24, fontWeight: 900, color: "#1D1A24", textAlign: "center", margin: "0 0 8px" }}>You&apos;re invited to join a group!</h1>
                  <p style={{ fontSize: 14, color: "#7B7487", textAlign: "center", margin: 0 }}>
                    Someone has invited you to collaborate on <strong>{group.name}</strong>
                  </p>
                </div>

                {/* Group preview grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, margin: "24px 0" }}>
                  {/* Left: group info */}
                  <div style={{ background: "#F8F5FF", borderRadius: 16, padding: 20, textAlign: "center", border: "1px solid #F0EEFF" }}>
                    <div style={{ fontSize: 40, marginBottom: 10 }}>{group.emoji || "💰"}</div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "#1D1A24", margin: "0 0 8px" }}>{group.name}</p>
                    <span style={{ background: "#F0EEFF", color: "#7C3AED", borderRadius: 999, padding: "4px 12px", fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>language</span>
                      {group.currency || "INR"}
                    </span>
                  </div>

                  {/* Right: inviter + members */}
                  <div style={{ background: "#F8F5FF", borderRadius: 16, padding: 20, border: "1px solid #F0EEFF" }}>
                    {/* Inviter */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #7C3AED, #5B21B6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: "white", flexShrink: 0 }}>
                        {group.members[0]?.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#1D1A24", margin: 0 }}>
                          {group.members[0]?.name || "Someone"} invited you
                        </p>
                        <p style={{ fontSize: 12, color: "#7B7487", margin: 0 }}>2 days ago</p>
                      </div>
                    </div>

                    {/* Stacked avatars */}
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <div style={{ display: "flex" }}>
                        {group.members.slice(0, 4).map((m, i) => (
                          <div
                            key={m.id}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              background: `hsl(${(i * 60 + 250) % 360}, 60%, 55%)`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 11,
                              fontWeight: 900,
                              color: "white",
                              border: "2px solid white",
                              marginLeft: i === 0 ? 0 : -8,
                              zIndex: 4 - i,
                              position: "relative",
                            }}
                          >
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                        ))}
                      </div>
                      <p style={{ fontSize: 12, color: "#7B7487", margin: "0 0 0 8px" }}>
                        {group.memberCount} member{group.memberCount !== 1 ? "s" : ""} already in group
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                {joined ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#F0FDF4", border: "1px solid #bbf7d0", borderRadius: 14, padding: "14px 16px" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 22, color: "#22c55e", flexShrink: 0, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      <p style={{ fontSize: 15, fontWeight: 700, color: "#166534", margin: 0 }}>
                        {group.alreadyMember ? "You&apos;re already in this group!" : "You&apos;ve joined! Redirecting…"}
                      </p>
                    </div>
                    <Link href={`/groups/${group.id}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#7C3AED", color: "white", fontWeight: 700, fontSize: 15, padding: "14px 24px", borderRadius: 999, textDecoration: "none" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>group</span>
                      Go to Group
                    </Link>
                  </div>
                ) : session ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {error && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 12, padding: "10px 14px" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#e11d48", flexShrink: 0, fontVariationSettings: "'FILL' 1" }}>error</span>
                        <p style={{ fontSize: 13, color: "#e11d48", margin: 0 }}>{error}</p>
                      </div>
                    )}
                    <button
                      onClick={handleJoin}
                      disabled={joining}
                      style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: joining ? "#C4B5FD" : "#7C3AED", color: "white", fontWeight: 700, fontSize: 16, padding: "14px 24px", borderRadius: 999, border: "none", cursor: joining ? "not-allowed" : "pointer", marginBottom: 4 }}
                    >
                      {joining ? (
                        <>
                          <div style={{ width: 20, height: 20, border: "3px solid rgba(255,255,255,0.4)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                          Joining…
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>check_circle</span>
                          Join Group
                        </>
                      )}
                    </button>
                    <button
                      style={{ width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "center", padding: "8px", fontSize: 14, fontWeight: 600, color: "#4A4455" }}
                      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = "#E11D48"}
                      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "#4A4455"}
                    >
                      Decline Invitation
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <p style={{ textAlign: "center", fontSize: 14, color: "#7B7487", marginBottom: 4 }}>
                      Sign in to join this group
                    </p>
                    <Link
                      href={`/auth/signin?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#7C3AED", color: "white", fontWeight: 700, fontSize: 15, padding: "13px 24px", borderRadius: 999, textDecoration: "none" }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>login</span>
                      Sign In
                    </Link>
                    <Link
                      href={`/auth/signup?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#F5F0FF", color: "#7C3AED", fontWeight: 700, fontSize: 15, padding: "13px 24px", borderRadius: 999, textDecoration: "none", border: "1px solid #E4D9F7" }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_add</span>
                      Create Account
                    </Link>
                  </div>
                )}

                {/* Trust badge */}
                <div style={{ borderTop: "1px solid #F0EEFF", marginTop: 20, paddingTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#7B7487" }}>lock</span>
                  <p style={{ fontSize: 12, color: "#7B7487", margin: 0 }}>Secure invitation by SplitEase</p>
                </div>
              </>
            ) : null}
          </div>

          {/* Footer outside card */}
          {session && (
            <p style={{ textAlign: "center", fontSize: 13, color: "#7B7487", marginTop: 20 }}>
              Logged in as <strong style={{ color: "#1D1A24" }}>{session.user?.email}</strong> · <a href="/auth/signin" style={{ color: "#7C3AED", textDecoration: "none", fontWeight: 600 }}>Switch account</a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
