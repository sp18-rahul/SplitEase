"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppShell } from "@/app/components/AppSidebar";

interface Member {
  id: number;
  name: string;
}

const CATEGORIES = [
  { id: 'food',          emoji: '🍔', label: 'Food & Drink' },
  { id: 'transport',     emoji: '🚗', label: 'Transport' },
  { id: 'housing',       emoji: '🏠', label: 'Housing' },
  { id: 'entertainment', emoji: '🎉', label: 'Entertainment' },
  { id: 'shopping',      emoji: '🛒', label: 'Shopping' },
  { id: 'travel',        emoji: '✈️', label: 'Travel' },
  { id: 'health',        emoji: '💊', label: 'Health' },
  { id: 'utilities',     emoji: '🔧', label: 'Utilities' },
  { id: 'other',         emoji: '💡', label: 'Other' },
];

const AVATAR_BG = ['#7C3AED','#10B981','#F59E0B','#3B82F6','#EC4899','#14B8A6'];

const detectCategory = (desc: string): string => {
  const d = desc.toLowerCase();
  if (/dinner|lunch|breakfast|food|restaurant|cafe|pizza|burger|coffee|drink|bar/.test(d)) return 'food';
  if (/uber|taxi|cab|bus|metro|train|fuel|petrol|gas|parking|flight/.test(d)) return 'transport';
  if (/hotel|rent|apartment|house|pg|hostel|airbnb/.test(d)) return 'housing';
  if (/movie|concert|party|club|show|ticket|netflix|spotify/.test(d)) return 'entertainment';
  if (/amazon|grocery|mall|shop|buy|market|supermarket/.test(d)) return 'shopping';
  if (/trip|tour|travel|holiday|vacation|trek|beach|resort/.test(d)) return 'travel';
  if (/doctor|medicine|pharmacy|hospital|gym|fitness/.test(d)) return 'health';
  if (/electricity|water|wifi|internet|phone|bill/.test(d)) return 'utilities';
  return 'other';
};

export default function NewExpensePage() {
  const router = useRouter();
  const routeParams = useParams();
  const groupId = parseInt(routeParams.id as string);
  const { data: session } = useSession();
  const initial = session?.user?.name?.charAt(0).toUpperCase() || "?";

  const [members, setMembers] = useState<Member[]>([]);
  const [currency, setCurrency] = useState("USD");
  const [loadingMembers, setLoadingMembers] = useState(true);

  const [description, setDescription] = useState("");
  const [amount, setAmount]           = useState("");
  const [category, setCategory]       = useState("food");
  const [paidById, setPaidById]       = useState<number | null>(null);
  const [splitMode, setSplitMode]     = useState<"equal" | "unequal">("equal");
  const [splits, setSplits]           = useState<{ [id: number]: number }>({});
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl]   = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [showCategoryDrop, setShowCategoryDrop] = useState(false);

  // Currency symbol helper
  const sym = (c = currency) =>
    ({ USD: "$", EUR: "€", GBP: "£", INR: "₹", JPY: "¥", AED: "د.إ" }[c] || "$");

  useEffect(() => {
    if (Number.isNaN(groupId)) { setError("Invalid group"); setLoadingMembers(false); return; }
    fetch(`/api/groups/${groupId}`)
      .then(r => r.json())
      .then(data => {
        const ms: Member[] = data.members.map((m: any) => m.user);
        setMembers(ms);
        if (data.currency) setCurrency(data.currency);
        // Default: current user paid, all members split
        const meId = session?.user?.id ? parseInt(session.user.id as string) : null;
        const me = meId ? ms.find(m => m.id === meId) : null;
        if (me) setPaidById(me.id);
        const initSplits: { [id: number]: number } = {};
        ms.forEach(m => { initSplits[m.id] = 0; });
        setSplits(initSplits);
      })
      .catch(() => setError("Failed to load group"))
      .finally(() => setLoadingMembers(false));
  }, [groupId]);

  // Auto-recalculate equal splits when amount or mode changes
  useEffect(() => {
    if (splitMode !== "equal" || members.length === 0) return;
    const total = parseFloat(amount) || 0;
    const n = members.length;
    if (n === 0) return;
    const base = Math.floor((total * 100) / n) / 100;
    const rem = Math.round((total - base * n) * 100) / 100;
    const newSplits: { [id: number]: number } = {};
    members.forEach((m, i) => { newSplits[m.id] = base + (i === 0 ? rem : 0); });
    setSplits(newSplits);
  }, [amount, splitMode, members]);

  const uploadReceipt = async (file: File) => {
    setUploadingReceipt(true);
    const reader = new FileReader();
    reader.onload = e => setReceiptPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) setReceiptUrl(data.url);
      else { setError(data.error || "Upload failed"); setReceiptPreview(null); }
    } catch { setError("Upload failed."); setReceiptPreview(null); }
    finally { setUploadingReceipt(false); }
  };

  const handleSubmit = async () => {
    if (!description.trim()) { setError("Please enter a description."); return; }
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) { setError("Please enter a valid amount."); return; }
    if (!paidById) { setError("Please select who paid."); return; }

    const expenseSplits = members.map(m => ({
      userId: m.id,
      amount: Math.round((splits[m.id] || 0) * 100) / 100,
    })).filter(s => s.amount > 0);

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/groups/${groupId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          amount: numAmount,
          paidById,
          splits: expenseSplits,
          category,
          receiptUrl: receiptUrl || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to create expense");
        setLoading(false);
        return;
      }
      router.push(`/groups/${groupId}`);
    } catch { setError("Network error. Please try again."); setLoading(false); }
  };

  const selectedCat = CATEGORIES.find(c => c.id === category) || CATEGORIES[0];
  const meId = session?.user?.id ? parseInt(session.user.id as string) : null;

  if (loadingMembers) {
    return (
      <AppShell activeTab="groups">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#F8F5FF" }}>
          <div style={{ width: 44, height: 44, border: "4px solid #EDE9FE", borderTopColor: "#7C3AED", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell activeTab="groups">
      <div style={{ background: "#F8F5FF", minHeight: "100vh" }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
          .ae-grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
          @media (min-width: 1024px) { .ae-grid { grid-template-columns: 1.1fr 0.9fr; } }
          .cat-drop { position: absolute; top: calc(100% + 6px); left: 0; right: 0; background: white; border: 1px solid #EDE9FE; border-radius: 14px; z-index: 50; box-shadow: 0 8px 24px rgba(124,58,237,0.14); padding: 6px; max-height: 260px; overflow-y: auto; }
        `}</style>

        {/* ── HEADER ── */}
        <header className="se-header" style={{ background: "white", borderBottom: "1px solid #F0EEFF", height: 72, display: "flex", alignItems: "center", padding: "0 20px", gap: 12 }}>
          <button
            onClick={() => router.push(`/groups/${groupId}`)}
            style={{ width: 36, height: 36, borderRadius: "50%", background: "#F5F0FF", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#7C3AED" }}>arrow_back</span>
          </button>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: "#7C3AED", margin: 0, flexShrink: 0 }}>Add Expense</h1>

          <div style={{ flex: 1, position: "relative", maxWidth: 400, marginLeft: "auto" }}>
            <span className="material-symbols-outlined" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: "#9CA3AF" }}>search</span>
            <input placeholder="Search..." style={{ width: "100%", background: "#F5F0FF", border: "1px solid #EDE9FE", borderRadius: 999, padding: "9px 16px 9px 40px", fontSize: 14, color: "#1D1A24", outline: "none", boxSizing: "border-box" }} />
          </div>
          <button style={{ width: 36, height: 36, borderRadius: "50%", background: "#F5F0FF", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#7B7487" }}>notifications</span>
          </button>
          <button style={{ width: 36, height: 36, borderRadius: "50%", background: "#F5F0FF", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#7B7487" }}>settings</span>
          </button>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #7C3AED, #5B21B6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: "white", flexShrink: 0 }}>
            {initial}
          </div>
        </header>

        {/* ── MAIN ── */}
        <main style={{ paddingTop: 96, paddingBottom: 60, paddingLeft: 28, paddingRight: 28, maxWidth: 960, margin: "0 auto" }}>

          {error && (
            <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 12, padding: "10px 16px", marginBottom: 16, color: "#e11d48", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>error</span>
              {error}
            </div>
          )}

          <div className="ae-grid">
            {/* ── LEFT COLUMN ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Form card */}
              <div style={{ background: "white", borderRadius: 18, border: "1px solid #F0EEFF", padding: 24 }}>

                {/* Description */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#7B7487", marginBottom: 8 }}>Description</label>
                  <textarea
                    value={description}
                    onChange={e => { setDescription(e.target.value); if (e.target.value.trim()) setCategory(detectCategory(e.target.value)); }}
                    placeholder="What was it for?"
                    rows={3}
                    style={{ width: "100%", border: "1px solid #EDE9FE", borderRadius: 12, padding: "14px 16px", fontSize: 15, color: "#1D1A24", outline: "none", resize: "none", boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.5, background: "white" }}
                  />
                </div>

                {/* Amount + Category */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
                  {/* Amount */}
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#7B7487", marginBottom: 8 }}>Amount</label>
                    <div style={{ display: "flex", alignItems: "center", border: "1px solid #EDE9FE", borderRadius: 12, padding: "12px 16px", background: "white", gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 16, color: "#7B7487" }}>{sym()}</span>
                      <input
                        type="number"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        style={{ flex: 1, border: "none", outline: "none", fontSize: 16, fontWeight: 700, color: "#1D1A24", background: "transparent", minWidth: 0 }}
                      />
                    </div>
                  </div>

                  {/* Category dropdown */}
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#7B7487", marginBottom: 8 }}>Category</label>
                    <div style={{ position: "relative" }}>
                      <button
                        onClick={() => setShowCategoryDrop(v => !v)}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, border: "1px solid #EDE9FE", borderRadius: 12, padding: "12px 16px", background: "white", cursor: "pointer", textAlign: "left" }}
                      >
                        <span style={{ fontSize: 18 }}>{selectedCat.emoji}</span>
                        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#1D1A24" }}>{selectedCat.label}</span>
                        <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#9CA3AF" }}>expand_more</span>
                      </button>
                      {showCategoryDrop && (
                        <div className="cat-drop">
                          {CATEGORIES.map(cat => (
                            <button
                              key={cat.id}
                              onClick={() => { setCategory(cat.id); setShowCategoryDrop(false); }}
                              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: "none", background: category === cat.id ? "#F0EEFF" : "transparent", cursor: "pointer", fontSize: 14, fontWeight: 600, color: category === cat.id ? "#7C3AED" : "#1D1A24" }}
                            >
                              <span style={{ fontSize: 18 }}>{cat.emoji}</span>
                              {cat.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Who paid */}
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#7B7487", marginBottom: 10 }}>Who paid?</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                    {members.map((m, i) => {
                      const isMe = m.id === meId;
                      const isPaid = m.id === paidById;
                      const bg = AVATAR_BG[i % AVATAR_BG.length];
                      return (
                        <button
                          key={m.id}
                          onClick={() => setPaidById(m.id)}
                          style={{
                            display: "flex", alignItems: "center", gap: 7,
                            padding: "5px 14px 5px 5px",
                            borderRadius: 999,
                            border: `2px solid ${isPaid ? "#7C3AED" : "#EDE9FE"}`,
                            background: isPaid ? "#7C3AED" : "white",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ width: 30, height: 30, borderRadius: "50%", background: isPaid ? "rgba(255,255,255,0.22)" : bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "white", flexShrink: 0 }}>
                            {isMe ? "Y" : m.name.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: isPaid ? "white" : "#4A4455" }}>
                            {isMe ? "You" : m.name.split(" ")[0]}
                          </span>
                        </button>
                      );
                    })}
                    {/* + add button */}
                    <button style={{ width: 42, height: 42, borderRadius: "50%", border: "2px dashed #C4B5FD", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#7C3AED" }}>add</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* How to Split card */}
              <div style={{ background: "white", borderRadius: 18, border: "1px solid #F0EEFF", padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 900, color: "#1D1A24", margin: 0 }}>How to Split</h2>
                  {/* Equal / Unequal toggle */}
                  <div style={{ display: "flex", background: "#F5F0FF", borderRadius: 999, padding: 4, gap: 4 }}>
                    {(["equal", "unequal"] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setSplitMode(mode)}
                        style={{
                          borderRadius: 999, padding: "6px 16px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
                          background: splitMode === mode ? "#7C3AED" : "transparent",
                          color: splitMode === mode ? "white" : "#7B7487",
                          transition: "all 0.15s",
                        }}
                      >
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Member split cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 12 }}>
                  {members.map((m, i) => {
                    const isMe = m.id === meId;
                    const bg = AVATAR_BG[i % AVATAR_BG.length];
                    const pct = members.length > 0 ? (100 / members.length).toFixed(1) : "0";
                    const shareAmt = splits[m.id] || 0;

                    return (
                      <div key={m.id} style={{ background: "white", borderRadius: 16, padding: "20px 12px 16px", textAlign: "center", border: "1px solid #F0EEFF", boxShadow: "0 1px 4px rgba(124,58,237,0.04)" }}>
                        {/* Large avatar */}
                        <div style={{ width: 62, height: 62, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMe ? 16 : 22, fontWeight: 900, color: "white", margin: "0 auto 12px" }}>
                          {isMe ? "You" : m.name.charAt(0).toUpperCase()}
                        </div>
                        <p style={{ fontSize: 12, color: "#7B7487", margin: "0 0 6px", fontWeight: 600 }}>
                          {pct}% Share
                        </p>
                        {splitMode === "equal" ? (
                          <p style={{ fontSize: 17, fontWeight: 900, color: "#7C3AED", margin: 0 }}>
                            {sym()}{shareAmt.toFixed(2)}
                          </p>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#7B7487" }}>{sym()}</span>
                            <input
                              type="number"
                              value={splits[m.id] || ""}
                              onChange={e => setSplits(prev => ({ ...prev, [m.id]: parseFloat(e.target.value) || 0 }))}
                              placeholder="0.00"
                              step="0.01"
                              style={{ width: 64, textAlign: "center", border: "none", borderBottom: "2px solid #C4B5FD", background: "transparent", outline: "none", fontSize: 15, fontWeight: 900, color: "#7C3AED", padding: "2px 0" }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {/* Placeholder card */}
                  <div style={{ background: "white", borderRadius: 16, padding: "20px 12px 16px", textAlign: "center", border: "1px solid #F0EEFF", boxShadow: "0 1px 4px rgba(124,58,237,0.04)" }}>
                    <div style={{ width: 62, height: 62, borderRadius: "50%", background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 28, color: "#D1D5DB" }}>person_add</span>
                    </div>
                    <p style={{ fontSize: 12, color: "#D1D5DB", margin: "0 0 6px", fontWeight: 600 }}>---</p>
                    <p style={{ fontSize: 17, fontWeight: 900, color: "#D1D5DB", margin: 0 }}>{sym()}0.00</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── RIGHT COLUMN ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Receipt card */}
              <div style={{ background: "white", borderRadius: 18, border: "1px solid #F0EEFF", padding: 20 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#1D1A24", margin: "0 0 14px" }}>Receipt (Optional)</p>
                {receiptPreview ? (
                  <div style={{ position: "relative", borderRadius: 12, overflow: "hidden" }}>
                    <img src={receiptPreview} alt="Receipt" style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 12, border: "2px solid #EDE9FE" }} />
                    {uploadingReceipt && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.8)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 12 }}>
                        <div style={{ width: 32, height: 32, border: "3px solid #EDE9FE", borderTopColor: "#7C3AED", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                      </div>
                    )}
                    {!uploadingReceipt && (
                      <button
                        onClick={() => { setReceiptUrl(null); setReceiptPreview(null); }}
                        style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "50%", background: "rgba(0,0,0,0.55)", border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
                      </button>
                    )}
                  </div>
                ) : (
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
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      style={{ display: "none" }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadReceipt(f); }}
                    />
                  </label>
                )}
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: loading ? "#A78BFA" : "#7C3AED", color: "white", border: "none", borderRadius: 999, padding: "16px 24px", fontSize: 16, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", boxShadow: "0 4px 16px rgba(124,58,237,0.30)" }}
                >
                  {loading ? (
                    <>
                      <div style={{ width: 20, height: 20, border: "3px solid rgba(255,255,255,0.4)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                      Saving...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>receipt</span>
                      Add Expense
                    </>
                  )}
                </button>
                <button
                  onClick={() => router.push(`/groups/${groupId}`)}
                  style={{ width: "100%", background: "white", color: "#4A4455", border: "1.5px solid #EDE9FE", borderRadius: 999, padding: "14px 24px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AppShell>
  );
}
