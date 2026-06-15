"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppShell } from "@/app/components/AppSidebar";
import Link from "next/link";

const CATEGORIES = [
  { value: "food", label: "🍔 Food & Drink" },
  { value: "transport", label: "🚗 Transport" },
  { value: "entertainment", label: "🎬 Entertainment" },
  { value: "rent", label: "🏠 Rent & Bills" },
  { value: "groceries", label: "🛒 Groceries" },
  { value: "other", label: "💼 Other" },
];

export default function AddExpensePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [splitType, setSplitType] = useState<"equal" | "unequal">("equal");
  const [paidBy, setPaidBy] = useState("you");
  const [loading, setLoading] = useState(false);

  const participants = [
    { id: "you", label: "You", initials: session?.user?.name?.charAt(0) || "Y", color: "#7C3AED" },
    { id: "alex", label: "Alex J.", initials: "AJ", color: "#6B7280" },
    { id: "maya", label: "Maya S.", initials: "MS", color: "#1F1B2E" },
  ];

  const perShare = amount ? (parseFloat(amount) / participants.length).toFixed(2) : "0.00";
  const pct = amount ? (100 / participants.length).toFixed(1) : "0.0";

  const handleSubmit = async () => {
    if (!description || !amount) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    router.push("/");
  };

  return (
    <AppShell activeTab="dashboard">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .se-header {
          position: fixed; top: 0; right: 0; left: 0; z-index: 30;
          background: white; border-bottom: 1px solid #F0EEFF;
          height: 72px; display: flex; align-items: center; gap: 16px; padding: 0 24px;
        }
        @media (min-width: 1024px) { .se-header { left: 260px !important; } }
        .ae-add-grid {
          display: grid; grid-template-columns: 1fr; gap: 24px;
        }
        @media (min-width: 1024px) {
          .ae-add-grid { grid-template-columns: 1.15fr 0.85fr; }
        }
        .ae-split-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
        }
      `}</style>

      {/* Header */}
      <header className="se-header">
        <Link href="/" style={{ width: 36, height: 36, borderRadius: "50%", background: "#F5F0FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, textDecoration: "none" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#7C3AED" }}>arrow_back</span>
        </Link>
        <span style={{ fontSize: 18, fontWeight: 900, color: "#7C3AED", letterSpacing: "-0.3px", whiteSpace: "nowrap" }}>Add Expense</span>
        <div style={{ flex: 1, maxWidth: 280 }}>
          <div style={{ position: "relative" }}>
            <span className="material-symbols-outlined" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: "#9CA3AF" }}>search</span>
            <input
              style={{ width: "100%", background: "#F5F0FF", border: "none", borderRadius: 999, padding: "9px 16px 9px 36px", fontSize: 14, outline: "none", color: "#1D1A24", boxSizing: "border-box" }}
              placeholder="Search..."
            />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
          <button style={{ width: 36, height: 36, borderRadius: "50%", background: "none", border: "1.5px solid #EDE9FE", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#4A4455" }}>notifications</span>
          </button>
          <button style={{ width: 36, height: 36, borderRadius: "50%", background: "none", border: "1.5px solid #EDE9FE", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#4A4455" }}>settings</span>
          </button>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(124,58,237,0.15)", border: "2px solid #7C3AED", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: "#7C3AED" }}>
            {session?.user?.name?.charAt(0).toUpperCase() || "?"}
          </div>
        </div>
      </header>

      <main style={{ background: "#F8F5FF", minHeight: "100vh", paddingTop: 96, paddingBottom: 60, paddingLeft: 28, paddingRight: 28 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="ae-add-grid">

            {/* LEFT column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Description */}
              <div style={{ background: "white", borderRadius: 18, border: "1px solid #F0EEFF", padding: "20px 20px 16px" }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#7B7487", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Description</p>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What was it for?"
                  rows={3}
                  style={{ width: "100%", background: "transparent", border: "none", resize: "none", outline: "none", fontSize: 15, color: "#1D1A24", lineHeight: 1.6, boxSizing: "border-box", fontFamily: "inherit" }}
                />
              </div>

              {/* Amount + Category */}
              <div style={{ background: "white", borderRadius: 18, border: "1px solid #F0EEFF", padding: 20 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#7B7487", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Amount</p>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 15, fontWeight: 900, color: "#7C3AED" }}>$</span>
                      <input
                        type="number"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder="0.00"
                        style={{ width: "100%", border: "1.5px solid #EDE9FE", borderRadius: 12, padding: "12px 12px 12px 28px", fontSize: 15, outline: "none", background: "white", boxSizing: "border-box", color: "#1D1A24" }}
                      />
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#7B7487", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Category</p>
                    <div style={{ position: "relative" }}>
                      <select
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        style={{ width: "100%", border: "1.5px solid #EDE9FE", borderRadius: 12, padding: "12px 36px 12px 12px", fontSize: 14, outline: "none", background: "white", cursor: "pointer", appearance: "none", color: "#1D1A24", boxSizing: "border-box" }}
                      >
                        {CATEGORIES.map(c => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 20, color: "#9CA3AF", pointerEvents: "none" }}>expand_more</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Who paid */}
              <div style={{ background: "white", borderRadius: 18, border: "1px solid #F0EEFF", padding: 20 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#7B7487", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Who paid?</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {participants.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setPaidBy(p.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        borderRadius: 999, padding: "8px 16px 8px 8px",
                        fontSize: 14, fontWeight: 700,
                        background: paidBy === p.id ? "#7C3AED" : "white",
                        color: paidBy === p.id ? "white" : "#4A4455",
                        border: paidBy === p.id ? "none" : "1.5px solid #EDE9FE",
                        cursor: "pointer", transition: "all 0.15s",
                      }}
                    >
                      <div style={{ width: 26, height: 26, borderRadius: "50%", background: paidBy === p.id ? "rgba(255,255,255,0.25)" : p.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: "white" }}>
                        {p.initials}
                      </div>
                      {p.label}
                    </button>
                  ))}
                  <button style={{ width: 40, height: 40, borderRadius: "50%", border: "2px dashed #C4B5FD", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#7C3AED" }}>add</span>
                  </button>
                </div>
              </div>

              {/* How to Split */}
              <div style={{ background: "white", borderRadius: 18, border: "1px solid #F0EEFF", padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <p style={{ fontSize: 16, fontWeight: 900, color: "#1D1A24", margin: 0 }}>How to Split</p>
                  <div style={{ display: "flex", background: "#F5F0FF", borderRadius: 999, padding: 4 }}>
                    <button
                      onClick={() => setSplitType("equal")}
                      style={{ borderRadius: 999, padding: "6px 18px", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", background: splitType === "equal" ? "#7C3AED" : "transparent", color: splitType === "equal" ? "white" : "#4A4455", transition: "all 0.15s" }}
                    >Equal</button>
                    <button
                      onClick={() => setSplitType("unequal")}
                      style={{ borderRadius: 999, padding: "6px 18px", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", background: splitType === "unequal" ? "#7C3AED" : "transparent", color: splitType === "unequal" ? "white" : "#4A4455", transition: "all 0.15s" }}
                    >Unequal</button>
                  </div>
                </div>
                <div className="ae-split-grid">
                  {participants.map(p => (
                    <div key={p.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "#F8F5FF", borderRadius: 16, padding: "20px 12px 16px" }}>
                      <div style={{ width: 62, height: 62, borderRadius: "50%", background: p.id === "you" ? "#7C3AED" : p.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: p.id === "you" ? 13 : 18, fontWeight: 900, color: "white", marginBottom: 10 }}>
                        {p.id === "you" ? "You" : p.initials}
                      </div>
                      <p style={{ fontSize: 12, color: "#7B7487", margin: "0 0 4px" }}>{pct}% Share</p>
                      <p style={{ fontSize: 18, fontWeight: 900, color: "#7C3AED", margin: 0 }}>${perShare}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Receipt card */}
              <div style={{ background: "white", borderRadius: 18, border: "1px solid #F0EEFF", padding: 20 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#1D1A24", margin: "0 0 14px" }}>Receipt (Optional)</p>
                <label style={{ cursor: "pointer", display: "block" }}>
                  <div style={{ border: "2px dashed #C4B5FD", borderRadius: 14, padding: "40px 20px 32px", textAlign: "center" }}>
                    <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#EDE9FE", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 30, color: "#7C3AED", fontVariationSettings: "'FILL' 1" }}>receipt_long</span>
                    </div>
                    <p style={{ fontSize: 16, fontWeight: 700, color: "#1D1A24", margin: "0 0 6px" }}>Upload Receipt</p>
                    <p style={{ fontSize: 13, color: "#7B7487", margin: "0 0 4px" }}>Drag and drop or click to browse</p>
                    <p style={{ fontSize: 11, color: "#9CA3AF", margin: "0 0 22px" }}>Supports JPG, PNG, PDF (Max 5MB)</p>
                    <span style={{ display: "inline-block", border: "2px solid #EDE9FE", borderRadius: 999, padding: "10px 28px", fontSize: 14, fontWeight: 700, color: "#7C3AED", background: "#F5F0FF" }}>
                      Browse Files
                    </span>
                  </div>
                  <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" style={{ display: "none" }} />
                </label>
              </div>

              {/* Action buttons */}
              <button
                onClick={handleSubmit}
                disabled={loading || !description || !amount}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: loading || !description || !amount ? "#C4B5FD" : "#7C3AED", color: "white", fontWeight: 700, fontSize: 16, padding: "16px 24px", borderRadius: 999, border: "none", cursor: loading || !description || !amount ? "not-allowed" : "pointer", boxSizing: "border-box" }}
              >
                {loading ? (
                  <>
                    <div style={{ width: 20, height: 20, border: "3px solid rgba(255,255,255,0.4)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    Adding…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>add_circle</span>
                    Add Expense
                  </>
                )}
              </button>
              <button
                onClick={() => router.back()}
                style={{ width: "100%", background: "white", border: "1.5px solid #EDE9FE", color: "#4A4455", borderRadius: 999, padding: "14px 24px", fontSize: 15, fontWeight: 700, cursor: "pointer", boxSizing: "border-box" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
