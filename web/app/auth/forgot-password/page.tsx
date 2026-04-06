"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

const PURPLE = "#7C3AED";
const PURPLE_MID = "#6D28D9";
const BLUE = "#4F46E5";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
      } else {
        setSubmitted(true);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex" }}>

      {/* ── LEFT BRAND PANEL (desktop only) ── */}
      <div className="hidden lg:flex" style={{
        width: "42%",
        flexShrink: 0,
        flexDirection: "column",
        justifyContent: "space-between",
        background: `linear-gradient(145deg, #3D0A8E 0%, ${PURPLE} 45%, ${BLUE} 100%)`,
        padding: "48px 52px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Orbs */}
        <div style={{ position: "absolute", top: "-60px", right: "-60px", width: 260, height: 260, borderRadius: "50%", background: "rgba(255,255,255,0.07)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-40px", left: "-40px", width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />

        {/* Logo */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontWeight: 900, fontSize: 17 }}>S</span>
            </div>
            <span style={{ color: "#fff", fontWeight: 900, fontSize: 22, letterSpacing: "-0.3px" }}>SplitEase</span>
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "1.5px", paddingLeft: 50 }}>PREMIUM LEDGER</span>
        </div>

        {/* Center */}
        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Lock icon */}
          <div style={{ width: 64, height: 64, borderRadius: 20, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, backdropFilter: "blur(8px)" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div style={{ fontSize: 34, fontWeight: 900, color: "#fff", lineHeight: 1.2, marginBottom: 16, letterSpacing: "-0.5px" }}>
            Secure account<br />recovery.
          </div>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 14, lineHeight: 1.7, maxWidth: 280 }}>
            We'll send a secure, time-limited link to your email so you can get back in safely.
          </p>

          {/* Steps */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 28 }}>
            {[
              { step: "1", text: "Enter your email address" },
              { step: "2", text: "Click the link in your inbox" },
              { step: "3", text: "Choose a new password" },
            ].map((item) => (
              <div key={item.step} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.9)", flexShrink: 0 }}>
                  {item.step}
                </div>
                <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: 500 }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            🔒 Encrypted · Secure · Private
          </p>
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ── */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(135deg, #FBF8FF 0%, #F5F2FC 50%, #EFECF6 100%)",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Mobile orbs */}
        <div className="lg:hidden" style={{ position: "fixed", top: "-10%", left: "-10%", width: "50%", height: "50%", borderRadius: "50%", background: PURPLE, opacity: 0.08, filter: "blur(120px)", zIndex: 0, pointerEvents: "none" }} />

        {/* Mobile nav */}
        <nav className="lg:hidden" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", position: "relative", zIndex: 10 }}>
          <Link href="/" style={{ fontWeight: 900, fontSize: 20, color: PURPLE, letterSpacing: "-0.3px", textDecoration: "none" }}>SplitEase</Link>
          <Link href="/auth/signin" style={{ fontSize: 14, fontWeight: 600, color: PURPLE, textDecoration: "none" }}>Log In</Link>
        </nav>

        {/* Form */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px", position: "relative", zIndex: 5 }}>
          <div style={{ width: "100%", maxWidth: 400 }}>

            {/* Desktop top bar */}
            <div className="hidden lg:flex" style={{ justifyContent: "flex-end", marginBottom: 40, alignItems: "center" }}>
              <Link href="/auth/signin" style={{ fontSize: 14, fontWeight: 600, color: PURPLE, background: "#EDE9FE", borderRadius: 20, padding: "7px 18px", textDecoration: "none" }}>
                ← Back to Login
              </Link>
            </div>

            {submitted ? (
              /* ── SUCCESS STATE ── */
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 72, height: 72, borderRadius: 22, background: "#F0FDF4", border: "2px solid #BBF7D0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: 32 }}>
                  📬
                </div>
                <h2 style={{ fontSize: 26, fontWeight: 900, color: "#0f172a", marginBottom: 12, letterSpacing: "-0.3px" }}>Check your inbox!</h2>
                <p style={{ color: "#475569", fontSize: 14, lineHeight: 1.7, marginBottom: 8 }}>
                  If <strong style={{ color: "#0f172a" }}>{email}</strong> is registered with SplitEase, you'll receive a password reset link shortly.
                </p>
                <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 28 }}>
                  The link expires in 1 hour. Check your spam folder if you don't see it, or{" "}
                  <button
                    onClick={() => setSubmitted(false)}
                    style={{ color: PURPLE, background: "none", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, padding: 0, textDecoration: "underline" }}
                  >
                    try again
                  </button>.
                </p>
                <Link
                  href="/auth/signin"
                  style={{
                    display: "block", textAlign: "center", padding: "14px",
                    background: `linear-gradient(135deg, ${PURPLE} 0%, ${PURPLE_MID} 100%)`,
                    color: "#fff", borderRadius: 14, fontSize: 15, fontWeight: 700,
                    textDecoration: "none", boxShadow: `0 4px 16px ${PURPLE}44`,
                  }}
                >
                  Back to Login
                </Link>
              </div>
            ) : (
              /* ── FORM STATE ── */
              <>
                {/* Icon badge */}
                <div style={{ width: 56, height: 56, borderRadius: 18, background: "#EDE9FE", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={PURPLE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>

                <h1 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", marginBottom: 8, letterSpacing: "-0.3px" }}>Reset your password</h1>
                <p style={{ fontSize: 14, color: "#64748b", marginBottom: 28, lineHeight: 1.7 }}>
                  Enter your email and we'll send a secure link to reset your password.
                </p>

                {error && (
                  <div style={{ background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: 10, padding: "10px 14px", marginBottom: 20, color: "#E11D48", fontSize: 13, fontWeight: 600 }}>
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane@example.com"
                      required
                      autoComplete="email"
                      style={{ width: "100%", padding: "13px 16px", border: "1.5px solid #E2E8F0", borderRadius: 12, fontSize: 14, color: "#0f172a", background: "#fff", outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
                      onFocus={(e) => e.currentTarget.style.borderColor = PURPLE}
                      onBlur={(e) => e.currentTarget.style.borderColor = "#E2E8F0"}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: "100%", padding: "14px",
                      background: loading ? `${PURPLE}99` : `linear-gradient(135deg, ${PURPLE} 0%, ${PURPLE_MID} 100%)`,
                      color: "#fff", border: "none", borderRadius: 12,
                      fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      boxShadow: loading ? "none" : `0 4px 16px ${PURPLE}44`,
                      marginBottom: 20,
                    }}
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin" style={{ width: 18, height: 18 }} viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.3"/>
                          <path fill="currentColor" opacity="0.8" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        Sending reset link...
                      </>
                    ) : "Send Reset Link →"}
                  </button>
                </form>

                <p style={{ textAlign: "center", fontSize: 13, color: "#64748b" }}>
                  Remembered it?{" "}
                  <Link href="/auth/signin" style={{ color: PURPLE, fontWeight: 700, textDecoration: "none" }}>Back to Login</Link>
                </p>

                <div style={{ marginTop: 24, padding: "14px 16px", background: "#F8F5FF", borderRadius: 12, border: "1px solid #EDE9FE" }}>
                  <p style={{ fontSize: 12, color: "#64748b", margin: 0, lineHeight: 1.6 }}>
                    Still having trouble?{" "}
                    <Link href="mailto:support@splitease.com" style={{ color: PURPLE, fontWeight: 700, textDecoration: "none" }}>
                      Contact our support team
                    </Link>{" "}
                    for immediate assistance.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
