"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Trash2, AlertCircle, CheckCircle2, Loader2, Camera, X } from "lucide-react";

interface Member {
  id: number;
  name: string;
}

interface Expense {
  id: number;
  description: string;
  amount: number;
  paidById: number;
  notes?: string | null;
  category?: string | null;
  receiptUrl?: string | null;
  splits: { userId: number; amount: number }[];
}

const CATEGORIES = [
  { id: 'food', emoji: '🍽️', label: 'Food' },
  { id: 'transport', emoji: '🚗', label: 'Transport' },
  { id: 'housing', emoji: '🏠', label: 'Housing' },
  { id: 'entertainment', emoji: '🎉', label: 'Fun' },
  { id: 'shopping', emoji: '🛒', label: 'Shopping' },
  { id: 'travel', emoji: '✈️', label: 'Travel' },
  { id: 'health', emoji: '💊', label: 'Health' },
  { id: 'utilities', emoji: '🔧', label: 'Utilities' },
  { id: 'other', emoji: '💡', label: 'Other' },
];

export default function EditExpense() {
  const router = useRouter();
  const params = useParams();
  const { id, expenseId } = params;
  const groupId = parseInt(id as string);
  const expId = parseInt(expenseId as string);

  const [members, setMembers] = useState<Member[]>([]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidById, setPaidById] = useState<number | null>(null);
  const [splits, setSplits] = useState<{ [userId: number]: number }>({});
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState("other");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [splitMode, setSplitMode] = useState<'amount' | 'percent'>('amount');
  const [percentages, setPercentages] = useState<{ [userId: number]: number }>({});
  const [showAdvancedSplit, setShowAdvancedSplit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const splitTotal = Object.values(splits).reduce((sum, val) => sum + val, 0);
  const numAmount = parseFloat(amount || "0");
  const splitMatch = amount ? Math.abs(splitTotal - numAmount) < 0.01 : false;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [expenseRes, groupRes] = await Promise.all([
          fetch(`/api/groups/${groupId}/expenses/${expId}`),
          fetch(`/api/groups/${groupId}`),
        ]);

        if (!expenseRes.ok) throw new Error("Failed to fetch expense");
        if (!groupRes.ok) throw new Error("Failed to fetch group");

        const expenseData = await expenseRes.json();
        const groupData = await groupRes.json();

        setMembers(groupData.members.map((m: any) => m.user));
        setDescription(expenseData.description);
        setAmount(expenseData.amount.toString());
        setPaidById(expenseData.paidById);
        setNotes(expenseData.notes || "");
        setCategory(expenseData.category || "other");
        if (expenseData.receiptUrl) {
          setReceiptUrl(expenseData.receiptUrl);
          setReceiptPreview(expenseData.receiptUrl);
        }

        const splitsMap: { [userId: number]: number } = {};
        expenseData.splits.forEach((s: any) => {
          splitsMap[s.userId] = s.amount;
        });
        setSplits(splitsMap);
      } catch (err) {
        setError("Failed to load expense");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [groupId, expId]);

  const updateSplit = (userId: number, value: number) => {
    setSplits((prev) => ({ ...prev, [userId]: value }));
  };

  const distributeEqual = () => {
    if (!amount) { setError("Please enter an amount first"); return; }
    const total = parseFloat(amount);
    if (isNaN(total) || total <= 0) { setError("Invalid amount"); return; }
    const perPerson = Math.round((total / members.length) * 100) / 100;
    const newSplits: { [userId: number]: number } = {};
    members.forEach((m) => { newSplits[m.id] = perPerson; });
    setSplits(newSplits);
    const pct = Math.floor(100 / members.length);
    const remPct = 100 - pct * members.length;
    const newPcts: { [userId: number]: number } = {};
    members.forEach((m, idx) => { newPcts[m.id] = pct + (idx < remPct ? 1 : 0); });
    setPercentages(newPcts);
    setError("");
  };

  const applyPercentages = () => {
    const total = parseFloat(amount) || 0;
    const newSplits: { [userId: number]: number } = {};
    members.forEach(m => { newSplits[m.id] = Math.round(total * (percentages[m.id] || 0)) / 100; });
    setSplits(newSplits);
  };

  const uploadReceipt = async (file: File) => {
    setUploadingReceipt(true);
    const reader = new FileReader();
    reader.onload = (e) => setReceiptPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        setReceiptUrl(data.url);
      } else {
        setError(data.error || "Upload failed");
        setReceiptPreview(null);
      }
    } catch {
      setError("Upload failed. Please try again.");
      setReceiptPreview(null);
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleSave = async () => {
    setError("");
    if (!description.trim()) { setError("Description is required"); return; }
    if (!amount || parseFloat(amount) <= 0) { setError("Invalid amount"); return; }
    if (!paidById) { setError("Please select who paid"); return; }
    if (Math.abs(splitTotal - numAmount) > 0.01) {
      setError(`Split total (₹${splitTotal.toFixed(2)}) must equal amount (₹${numAmount.toFixed(2)})`);
      return;
    }

    const expenseSplits = members
      .map((m) => ({ userId: m.id, amount: Math.round((splits[m.id] || 0) * 100) / 100 }))
      .filter((s) => s.amount > 0);

    if (expenseSplits.length === 0) { setError("Please distribute the expense among members"); return; }

    setSaving(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/expenses/${expId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim(), amount: numAmount, paidById, splits: expenseSplits, notes: notes.trim() || null, category, receiptUrl }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to update expense"); return; }
      router.push(`/groups/${groupId}`);
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/expenses/${expId}`, { method: "DELETE" });
      if (!res.ok) { setError("Failed to delete expense"); return; }
      router.push(`/groups/${groupId}`);
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="app-page flex items-center justify-center min-h-screen">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p style={{ color: '#4f46e5', fontWeight: 600 }}>Loading expense...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-page" style={{ padding: '48px 16px' }}>
      <div className="animate-fadeIn" style={{ maxWidth: 640, margin: '0 auto' }}>

        {/* Back link */}
        <div style={{ marginBottom: 24 }}>
          <Link
            href={`/groups/${groupId}`}
            className="btn-ghost inline-flex items-center gap-2"
            style={{ color: '#475569' }}
          >
            <ArrowLeft style={{ width: 16, height: 16 }} />
            <span style={{ fontSize: 14, fontWeight: 500 }}>Back to group</span>
          </Link>
        </div>

        <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
          {/* Header */}
          <div className="summary-card" style={{ borderRadius: '1.5rem 1.5rem 0 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ padding: 12, background: 'rgba(255,255,255,0.2)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.3)' }}>
                <Save style={{ width: 32, height: 32, color: 'white' }} />
              </div>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 900, color: 'white', marginBottom: 4 }}>Edit Expense</h1>
                <p style={{ fontSize: 14, color: '#e2e8f0', margin: 0 }}>Update the expense details below.</p>
              </div>
            </div>
          </div>

          <div style={{ padding: 32 }}>
            {/* Error */}
            {error && (
              <div className="alert-error" role="alert" style={{ marginBottom: 20 }}>
                <AlertCircle style={{ width: 18, height: 18, flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Description */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }} htmlFor="description">
                Description
              </label>
              <input
                type="text"
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-field"
                placeholder="e.g., Dinner, Hotel, Gas"
              />
            </div>

            {/* Amount */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }} htmlFor="amount">
                Amount (₹)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 600 }}>₹</span>
                <input
                  type="number"
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: 32 }}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            {/* Who Paid */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }} htmlFor="paidById">
                Who Paid?
              </label>
              <select
                id="paidById"
                value={paidById || ""}
                onChange={(e) => setPaidById(parseInt(e.target.value))}
                className="input-field"
                style={{ background: 'white' }}
              >
                <option value="">Select member</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                Category
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                      borderRadius: 20, border: `2px solid ${category === cat.id ? '#4f46e5' : '#e2e8f0'}`,
                      background: category === cat.id ? '#eef2ff' : 'white',
                      cursor: 'pointer', fontSize: 13, fontWeight: 600,
                      color: category === cat.id ? '#4338ca' : '#64748b',
                    }}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }} htmlFor="notes">
                Notes <span style={{ fontWeight: 400, textTransform: 'none', color: '#94a3b8' }}>(optional)</span>
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input-field"
                style={{ minHeight: 72, resize: 'none', lineHeight: 1.5 }}
                placeholder="Add a note, receipt number, or reminder..."
              />
            </div>

            {/* Receipt Upload */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                Receipt Photo <span style={{ fontWeight: 400, textTransform: 'none', color: '#94a3b8' }}>(optional)</span>
              </label>
              {receiptPreview ? (
                <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                  <img
                    src={receiptPreview}
                    alt="Receipt preview"
                    style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 12, border: '2px solid #e2e8f0' }}
                  />
                  {uploadingReceipt && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Loader2 style={{ width: 24, height: 24, color: '#4f46e5' }} className="animate-spin" />
                    </div>
                  )}
                  {!uploadingReceipt && (
                    <button
                      type="button"
                      onClick={() => { setReceiptUrl(null); setReceiptPreview(null); }}
                      style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <X style={{ width: 14, height: 14 }} />
                    </button>
                  )}
                </div>
              ) : (
                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '20px 16px', borderRadius: 12, border: '2px dashed #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}>
                  <Camera style={{ width: 24, height: 24, color: '#94a3b8' }} />
                  <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Tap to upload receipt</span>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>JPG, PNG, WebP · Max 5MB</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadReceipt(file);
                    }}
                  />
                </label>
              )}
            </div>

            {/* Split section */}
            <div style={{ borderRadius: 16, border: '2px solid #e0e7ff', background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 50%, #fff1f2 100%)', padding: 24, marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0 }}>Split Among</h2>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {showAdvancedSplit && (
                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.7)', borderRadius: 10, padding: 3, gap: 2 }}>
                      <button onClick={() => setSplitMode('amount')} style={{ padding: '4px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: splitMode === 'amount' ? '#4f46e5' : 'transparent', color: splitMode === 'amount' ? 'white' : '#64748b', transition: 'all 0.2s' }}>₹ Amt</button>
                      <button onClick={() => setSplitMode('percent')} style={{ padding: '4px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: splitMode === 'percent' ? '#4f46e5' : 'transparent', color: splitMode === 'percent' ? 'white' : '#64748b', transition: 'all 0.2s' }}>% Pct</button>
                    </div>
                  )}
                  <button
                    onClick={() => { setShowAdvancedSplit(v => !v); if (showAdvancedSplit) setSplitMode('amount'); }}
                    style={{ fontSize: 11, fontWeight: 700, color: showAdvancedSplit ? '#be123c' : '#4f46e5', background: showAdvancedSplit ? '#fee2e2' : '#eef2ff', border: 'none', borderRadius: 20, padding: '4px 10px', cursor: 'pointer' }}
                  >
                    {showAdvancedSplit ? '✕ Simple' : '⚙️ Custom'}
                  </button>
                </div>
              </div>

              {splitMode === 'amount' ? (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {members.map((member) => (
                      <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'white', padding: '12px 16px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #818cf8, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ flex: 1, fontWeight: 600, color: '#1e293b', fontSize: 14 }}>{member.name}</span>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 600, fontSize: 13 }}>₹</span>
                          <input
                            type="number"
                            value={splits[member.id] === 0 ? "" : (splits[member.id] || "")}
                            onChange={(e) => updateSplit(member.id, parseFloat(e.target.value) || 0)}
                            style={{ width: 88, paddingLeft: 26, paddingRight: 8, paddingTop: 8, paddingBottom: 8, border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontWeight: 600, outline: 'none', color: '#1e293b' }}
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  {amount && (
                    <button onClick={distributeEqual} className="btn-secondary" style={{ marginTop: 12, fontSize: 13, padding: '6px 14px' }}>
                      ⚖️ Split Equally
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {members.map((member) => {
                      const pct = percentages[member.id] || 0;
                      const totalAmount = parseFloat(amount) || 0;
                      const derived = Math.round(totalAmount * pct) / 100;
                      return (
                        <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'white', padding: '12px 16px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #818cf8, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>{member.name}</p>
                            <input type="range" min={0} max={100} value={pct} onChange={e => setPercentages(prev => ({ ...prev, [member.id]: parseInt(e.target.value) }))} style={{ width: '100%', accentColor: '#4f46e5' }} />
                          </div>
                          <div style={{ textAlign: 'right', minWidth: 60 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}>
                              <input type="number" min={0} max={100} value={pct === 0 ? "" : pct} onChange={e => setPercentages(prev => ({ ...prev, [member.id]: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) }))} style={{ width: 40, textAlign: 'center', fontSize: 15, fontWeight: 900, color: '#4f46e5', border: 'none', borderBottom: '2px solid #c7d2fe', background: 'transparent', outline: 'none', padding: '2px 0' }} />
                              <span style={{ fontSize: 14, fontWeight: 700, color: '#4f46e5' }}>%</span>
                            </div>
                            <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0', fontWeight: 600 }}>₹{derived.toFixed(0)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, padding: '10px 14px', borderRadius: 10, background: (() => { const t = Object.values(percentages).reduce((s,v)=>s+v,0); return t === 100 ? '#f0fdf4' : '#fff7ed'; })(), border: `1.5px solid ${(() => { const t = Object.values(percentages).reduce((s,v)=>s+v,0); return t === 100 ? '#bbf7d0' : '#fed7aa'; })()}` }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>Total: {Object.values(percentages).reduce((s,v)=>s+v,0)}%</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={applyPercentages} style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5', background: '#eef2ff', padding: '4px 10px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>Apply →</button>
                      <button onClick={distributeEqual} style={{ fontSize: 12, fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '4px 10px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>Equal</button>
                    </div>
                  </div>
                </>
              )}

              {/* Split total indicator (always shown) */}
              {amount && splitMode === 'amount' && (
                <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 12, border: `2px solid ${splitMatch ? '#bbf7d0' : '#fecdd3'}`, background: splitMatch ? '#f0fdf4' : '#fff1f2' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: '#475569', fontSize: 14 }}>Total Split:</span>
                    <span style={{ fontSize: 20, fontWeight: 900, color: splitMatch ? '#16a34a' : '#e11d48' }}>₹{splitTotal.toFixed(2)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Target: ₹{numAmount.toFixed(2)}</div>
                  {splitMatch ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, color: '#16a34a', fontSize: 13, fontWeight: 600 }}>
                      <CheckCircle2 style={{ width: 16, height: 16 }} />
                      Perfect split!
                    </div>
                  ) : (
                    <div style={{ marginTop: 8, color: '#e11d48', fontSize: 13, fontWeight: 600 }}>
                      Remaining: ₹{(numAmount - splitTotal).toFixed(2)}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={handleSave}
                disabled={!description || !amount || !paidById || saving}
                className="btn-primary"
                style={{ flex: 2, justifyContent: 'center', fontSize: 16, padding: '12px 24px' }}
              >
                {saving ? (
                  <>
                    <Loader2 style={{ width: 18, height: 18 }} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save style={{ width: 18, height: 18 }} />
                    Save Changes
                  </>
                )}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="btn-danger"
                style={{ flex: 1, justifyContent: 'center', fontSize: 16, padding: '12px 24px' }}
              >
                <Trash2 style={{ width: 18, height: 18 }} />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="card"
            style={{ maxWidth: 380, width: '100%', padding: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertCircle style={{ width: 24, height: 24, color: '#e11d48' }} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>Delete Expense?</h3>
            </div>
            <p style={{ color: '#475569', marginBottom: 24, fontSize: 15, lineHeight: 1.5 }}>
              Are you sure you want to delete this expense? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-secondary"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="btn-danger"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                {deleting ? (
                  <>
                    <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
