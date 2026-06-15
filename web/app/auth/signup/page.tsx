"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PURPLE = "#7C3AED";

function getPasswordStrength(pwd: string): number {
  if (pwd.length === 0) return 0;
  if (pwd.length < 4) return 1;
  if (pwd.length < 6) return 2;
  if (pwd.length < 10) return 3;
  return 4;
}

export default function SignUp() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (!agreedToTerms) {
      setError("Please agree to the Terms of Service and Privacy Policy");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Signup failed");
        return;
      }

      router.push("/auth/signin");
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const strength = getPasswordStrength(password);
  const strengthColors = ["#E4D9F7", "#E11D48", "#F59E0B", "#7C3AED", "#10B981"];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #F3EEFF 0%, #EAE0FF 50%, #F0E8FF 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 16px" }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        {/* Card */}
        <div style={{ background: "#fff", borderRadius: 24, boxShadow: "0 4px 24px rgba(124,58,237,0.10)", padding: 32 }}>
          {/* Logo — centered, same as Sign In */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
            <div style={{ width: 56, height: 56, background: PURPLE, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M20 7H4C2.9 7 2 7.9 2 9v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2z" fill="white" opacity="0.9"/>
                <path d="M20 7l-8-5-8 5" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
                <rect x="9" y="13" width="6" height="3" rx="1" fill={PURPLE}/>
              </svg>
            </div>
            <p style={{ fontSize: 18, fontWeight: 900, color: PURPLE, margin: 0 }}>SplitEase</p>
          </div>

          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#1D1A24", textAlign: "center", marginBottom: 4 }}>Join SplitEase</h1>
          <p style={{ fontSize: 14, color: "#7B7487", textAlign: "center", marginBottom: 22 }}>Create your account to start splitting bills</p>

          {error && (
            <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 12, padding: "10px 14px", marginBottom: 20, color: "#e11d48", fontSize: 13, fontWeight: 600 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Full Name */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1D1A24", marginBottom: 6 }}>
                Full Name
              </label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#7B7487", fontSize: 18, fontFamily: "Material Symbols Outlined", lineHeight: 1 }}>
                  person
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                  autoComplete="name"
                  style={{ width: "100%", padding: "12px 16px 12px 44px", border: "1px solid #E4D9F7", borderRadius: 12, fontSize: 14, color: "#1D1A24", background: "#fff", outline: "none", boxSizing: "border-box" }}
                />
              </div>
            </div>

            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1D1A24", marginBottom: 6 }}>
                Email
              </label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#7B7487", fontSize: 18, fontFamily: "Material Symbols Outlined", lineHeight: 1 }}>
                  mail
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  autoComplete="email"
                  style={{ width: "100%", padding: "12px 16px 12px 44px", border: "1px solid #E4D9F7", borderRadius: 12, fontSize: 14, color: "#1D1A24", background: "#fff", outline: "none", boxSizing: "border-box" }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1D1A24", marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#7B7487", fontSize: 18, fontFamily: "Material Symbols Outlined", lineHeight: 1 }}>
                  lock
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                  style={{ width: "100%", padding: "12px 44px 12px 44px", border: "1px solid #E4D9F7", borderRadius: 12, fontSize: 14, color: "#1D1A24", background: "#fff", outline: "none", boxSizing: "border-box" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#7B7487", fontSize: 18, padding: 0, fontFamily: "Material Symbols Outlined", lineHeight: 1 }}
                >
                  {showPassword ? "visibility_off" : "visibility"}
                </button>
              </div>
              {/* Password strength bars */}
              <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                {[1, 2, 3, 4].map(level => (
                  <div
                    key={level}
                    style={{ flex: 1, height: 6, borderRadius: 3, background: strength >= level ? strengthColors[strength] : "#E4D9F7", transition: "background 0.2s" }}
                  />
                ))}
              </div>
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1D1A24", marginBottom: 6 }}>
                Confirm Password
              </label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#7B7487", fontSize: 18, fontFamily: "Material Symbols Outlined", lineHeight: 1 }}>
                  lock_reset
                </span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                  style={{ width: "100%", padding: "12px 16px 12px 44px", border: "1px solid #E4D9F7", borderRadius: 12, fontSize: 14, color: "#1D1A24", background: "#fff", outline: "none", boxSizing: "border-box" }}
                />
              </div>
            </div>

            {/* Terms checkbox */}
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 22, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                style={{ accentColor: PURPLE, width: 15, height: 15, marginTop: 2, flexShrink: 0 }}
              />
              <span style={{ fontSize: 13, color: "#4A4455", lineHeight: 1.5 }}>
                I agree to the{" "}
                <Link href="/terms" style={{ color: PURPLE, fontWeight: 700, textDecoration: "none" }}>Terms &amp; Conditions</Link>
                {" "}and{" "}
                <Link href="/privacy" style={{ color: PURPLE, fontWeight: 700, textDecoration: "none" }}>Privacy Policy</Link>
              </span>
            </label>

            {/* Sign Up Button */}
            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", padding: "14px", background: loading ? "#a78bfa" : PURPLE, color: "#fff", border: "none", borderRadius: 9999, fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              {loading ? (
                <>
                  <svg style={{ width: 18, height: 18, animation: "spin 0.8s linear infinite" }} viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.3"/>
                    <path fill="currentColor" opacity="0.8" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Creating Account...
                </>
              ) : (
                <>
                  Sign Up
                  <span style={{ fontFamily: "Material Symbols Outlined", fontSize: 18 }}>arrow_forward</span>
                </>
              )}
            </button>
          </form>

          {/* Sign in footer */}
          <p style={{ textAlign: "center", fontSize: 13, color: "#7B7487", marginTop: 20, marginBottom: 0 }}>
            Already have an account?{" "}
            <Link href="/auth/signin" style={{ color: PURPLE, fontWeight: 700, textDecoration: "none" }}>Sign In</Link>
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
