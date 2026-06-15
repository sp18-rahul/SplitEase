"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import Link from "next/link";

const PURPLE = "#7C3AED";

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else if (result?.ok) {
        router.push("/");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #F3EEFF 0%, #EAE0FF 50%, #F0E8FF 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 16px" }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        {/* Card */}
        <div style={{ background: "#fff", borderRadius: 24, boxShadow: "0 4px 24px rgba(124,58,237,0.10)", padding: 32 }}>
          {/* Logo */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
            <div style={{ width: 64, height: 64, background: PURPLE, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M20 7H4C2.9 7 2 7.9 2 9v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2z" fill="white" opacity="0.9"/>
                <path d="M20 7l-8-5-8 5" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
                <rect x="9" y="13" width="6" height="3" rx="1" fill={PURPLE}/>
              </svg>
            </div>
            <p style={{ fontSize: 20, fontWeight: 900, color: PURPLE, margin: 0 }}>SplitEase</p>
            <p style={{ fontSize: 12, color: "#7B7487", margin: "2px 0 0" }}>Manage Expenses Together</p>
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 900, color: "#1D1A24", textAlign: "center", marginBottom: 4 }}>Welcome Back</h1>
          <p style={{ fontSize: 14, color: "#7B7487", textAlign: "center", marginBottom: 24 }}>Sign in to your account</p>

          {error && (
            <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 12, padding: "10px 14px", marginBottom: 20, color: "#e11d48", fontSize: 13, fontWeight: 600 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1D1A24", marginBottom: 6 }}>
                Email Address
              </label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#7B7487", fontSize: 18, fontFamily: "Material Symbols Outlined", lineHeight: 1 }}>
                  alternate_email
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
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#1D1A24" }}>
                  Password
                </label>
                <Link href="/auth/forgot-password" style={{ fontSize: 13, fontWeight: 600, color: PURPLE, textDecoration: "none" }}>
                  Forgot Password?
                </Link>
              </div>
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
                  autoComplete="current-password"
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
            </div>

            {/* Remember me */}
            <div style={{ display: "flex", alignItems: "center", marginBottom: 22 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#4A4455", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ accentColor: PURPLE, width: 15, height: 15 }}
                />
                Remember me for 30 days
              </label>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", padding: "14px", background: loading ? "#a78bfa" : PURPLE, color: "#fff", border: "none", borderRadius: 9999, fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 20 }}
            >
              {loading ? (
                <>
                  <svg style={{ width: 18, height: 18, animation: "spin 0.8s linear infinite" }} viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.3"/>
                    <path fill="currentColor" opacity="0.8" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Signing in...
                </>
              ) : "Sign In"}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: "#E4D9F7" }} />
            <span style={{ fontSize: 12, color: "#7B7487", whiteSpace: "nowrap" }}>Or continue with</span>
            <div style={{ flex: 1, height: 1, background: "#E4D9F7" }} />
          </div>

          {/* Social Buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 22 }}>
            <button style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", background: "#fff", border: "1px solid #E4D9F7", borderRadius: 16, fontSize: 14, fontWeight: 600, color: "#1D1A24", cursor: "pointer" }}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>
            <button style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", background: "#fff", border: "1px solid #E4D9F7", borderRadius: 16, fontSize: 14, fontWeight: 600, color: "#1D1A24", cursor: "pointer" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </button>
          </div>

          {/* Sign up link */}
          <p style={{ textAlign: "center", fontSize: 13, color: "#7B7487", margin: 0 }}>
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" style={{ color: PURPLE, fontWeight: 700, textDecoration: "none" }}>Sign Up</Link>
          </p>
        </div>

        {/* Footer links */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginTop: 20 }}>
          {["Privacy Policy", "Terms of Service", "Help Center"].map(link => (
            <span key={link} style={{ fontSize: 11, color: "#7B7487", cursor: "pointer" }}>{link}</span>
          ))}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
