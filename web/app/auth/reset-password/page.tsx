"use client";

import { FormEvent, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const PURPLE = "#7C3AED";

function getPasswordStrength(pwd: string): number {
  if (pwd.length === 0) return 0;
  if (pwd.length < 4) return 1;
  if (pwd.length < 6) return 2;
  if (pwd.length < 10) return 3;
  return 4;
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing reset token. Please request a new reset link.");
    }
  }, [token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
      } else {
        setSuccess(true);
        setTimeout(() => router.push("/auth/signin"), 3000);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const strength = getPasswordStrength(password);
  const strengthColors = ["#E4D9F7", "#E11D48", "#F59E0B", PURPLE, "#10B981"];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #F3EEFF 0%, #EAE0FF 50%, #F0E8FF 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 16px" }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        {/* Logo above card */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
          <div style={{ width: 64, height: 64, background: PURPLE, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M20 7H4C2.9 7 2 7.9 2 9v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2z" fill="white" opacity="0.9"/>
              <path d="M20 7l-8-5-8 5" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
              <rect x="9" y="13" width="6" height="3" rx="1" fill={PURPLE}/>
            </svg>
          </div>
          <p style={{ fontSize: 20, fontWeight: 900, color: PURPLE, margin: 0 }}>SplitEase</p>
        </div>

        {/* Card */}
        <div style={{ background: "#fff", borderRadius: 24, boxShadow: "0 2px 16px rgba(124,58,237,0.08)", padding: 32 }}>
          {success ? (
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: "#1D1A24", textAlign: "center", marginBottom: 8 }}>Password Reset!</h1>
              <p style={{ fontSize: 14, color: "#7B7487", textAlign: "center", marginBottom: 24 }}>Your password has been updated successfully.</p>
              <p style={{ fontSize: 13, color: "#7B7487", marginBottom: 24 }}>You&apos;ll be redirected to the sign-in page in a moment...</p>
              <Link href="/auth/signin" style={{ display: "block", textAlign: "center", padding: "14px", background: PURPLE, color: "#fff", borderRadius: 9999, fontSize: 15, fontWeight: 700, textDecoration: "none" }}>
                Sign In Now
              </Link>
            </div>
          ) : (
            <>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: "#1D1A24", textAlign: "center", marginBottom: 6 }}>Reset Your Password</h1>
              <p style={{ fontSize: 14, color: "#7B7487", textAlign: "center", marginBottom: 24 }}>Enter your new password</p>

              {error && (
                <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 12, padding: "10px 14px", marginBottom: 20, color: "#e11d48", fontSize: 13, fontWeight: 600 }}>
                  {error}
                  {(error.includes("invalid") || error.includes("expired")) && (
                    <div style={{ marginTop: 8 }}>
                      <Link href="/auth/forgot-password" style={{ color: PURPLE, fontWeight: 600, fontSize: 13, textDecoration: "none" }}>
                        Request a new reset link →
                      </Link>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* New Password */}
                <div style={{ marginBottom: 8 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1D1A24", marginBottom: 6 }}>
                    New Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#7B7487", fontSize: 18, fontFamily: "Material Symbols Outlined", lineHeight: 1 }}>
                      lock
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      style={{ width: "100%", padding: "12px 44px 12px 44px", border: "1px solid #E4D9F7", borderRadius: 12, fontSize: 14, color: "#1D1A24", background: "#fff", outline: "none", boxSizing: "border-box" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#7B7487", fontSize: 18, padding: 0, fontFamily: "Material Symbols Outlined", lineHeight: 1 }}
                    >
                      {showPassword ? "visibility_off" : "visibility"}
                    </button>
                  </div>

                  {/* Password strength bars */}
                  <div style={{ display: "flex", gap: 4, marginTop: 8, height: 6 }}>
                    {[1, 2, 3, 4].map(level => (
                      <div
                        key={level}
                        style={{ flex: 1, borderRadius: 3, background: strength >= level ? strengthColors[strength] : "#E4D9F7", transition: "background 0.2s" }}
                      />
                    ))}
                  </div>
                </div>

                {/* Confirm Password */}
                <div style={{ marginBottom: 22, marginTop: 16 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1D1A24", marginBottom: 6 }}>
                    Confirm Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#7B7487", fontSize: 18, fontFamily: "Material Symbols Outlined", lineHeight: 1 }}>
                      verified_user
                    </span>
                    <input
                      type={showConfirm ? "text" : "password"}
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your new password"
                      required
                      autoComplete="new-password"
                      style={{ width: "100%", padding: "12px 44px 12px 44px", border: "1px solid #E4D9F7", borderRadius: 12, fontSize: 14, color: "#1D1A24", background: "#fff", outline: "none", boxSizing: "border-box" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      tabIndex={-1}
                      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#7B7487", fontSize: 18, padding: 0, fontFamily: "Material Symbols Outlined", lineHeight: 1 }}
                    >
                      {showConfirm ? "visibility_off" : "visibility"}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && (
                    <p style={{ fontSize: 12, marginTop: 6, color: password === confirmPassword ? "#10B981" : "#E11D48" }}>
                      {password === confirmPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
                    </p>
                  )}
                </div>

                {/* Update Password button */}
                <button
                  type="submit"
                  disabled={loading || !token}
                  style={{ width: "100%", padding: "14px", background: loading || !token ? "#a78bfa" : PURPLE, color: "#fff", border: "none", borderRadius: 9999, fontSize: 15, fontWeight: 700, cursor: loading || !token ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 }}
                >
                  {loading ? (
                    <>
                      <svg style={{ width: 18, height: 18, animation: "spin 0.8s linear infinite" }} viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.3"/>
                        <path fill="currentColor" opacity="0.8" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Updating...
                    </>
                  ) : (
                    <>
                      Update Password
                      <span>→</span>
                    </>
                  )}
                </button>

                {/* Back to sign in */}
                <div style={{ textAlign: "center" }}>
                  <Link href="/auth/signin" style={{ color: PURPLE, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                    ← Back to Sign In
                  </Link>
                </div>
              </form>

              {/* Footer security badges */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontFamily: "Material Symbols Outlined", fontSize: 14, color: "#7B7487" }}>lock</span>
                  <span style={{ fontSize: 10, color: "#7B7487", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase" }}>SECURE SSL</span>
                </div>
                <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#E4D9F7" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontFamily: "Material Symbols Outlined", fontSize: 14, color: "#7B7487" }}>shield</span>
                  <span style={{ fontSize: 10, color: "#7B7487", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase" }}>END-TO-END</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #F3EEFF 0%, #EAE0FF 50%, #F0E8FF 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ color: PURPLE, fontSize: 14, fontWeight: 600 }}>Loading...</div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
