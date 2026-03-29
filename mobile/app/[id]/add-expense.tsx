import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { groups, expenses } from "@/api/client";
import { useAuth } from "@/context/auth";
import { useResponsive } from "@/utils/responsive";

const INDIGO = "#4f46e5";

const CATEGORIES = [
  { id: "food", emoji: "🍽️", label: "Food" },
  { id: "transport", emoji: "🚗", label: "Transport" },
  { id: "housing", emoji: "🏠", label: "Housing" },
  { id: "entertainment", emoji: "🎉", label: "Fun" },
  { id: "shopping", emoji: "🛒", label: "Shopping" },
  { id: "travel", emoji: "✈️", label: "Travel" },
  { id: "health", emoji: "💊", label: "Health" },
  { id: "utilities", emoji: "🔧", label: "Utilities" },
  { id: "other", emoji: "💡", label: "Other" },
];

const KEYWORDS: Record<string, string[]> = {
  food: ["food", "dinner", "lunch", "breakfast", "cafe", "restaurant", "pizza", "burger", "meal", "groceries", "grocery"],
  transport: ["uber", "ola", "taxi", "cab", "metro", "bus", "train", "fuel", "petrol", "parking", "toll"],
  housing: ["rent", "hotel", "airbnb", "accommodation", "hostel", "apartment"],
  entertainment: ["movie", "cinema", "concert", "party", "club", "bar", "drinks", "game"],
  shopping: ["shopping", "clothes", "shoes", "amazon", "flipkart", "market"],
  travel: ["flight", "airline", "trip", "tour", "sightseeing", "visa", "passport"],
  health: ["medicine", "doctor", "hospital", "pharmacy", "gym"],
  utilities: ["electricity", "water", "internet", "wifi", "gas", "bill", "recharge"],
};

function detectCategory(desc: string): string {
  const lower = desc.toLowerCase();
  for (const [cat, words] of Object.entries(KEYWORDS)) {
    if (words.some((w) => lower.includes(w))) return cat;
  }
  return "other";
}

interface Member { id: number; name: string; }

export default function AddExpenseScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const r = useResponsive();
  const insets = useSafeAreaInsets();
  const groupId = parseInt(id as string);

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidById, setPaidById] = useState<number | null>(null);
  const [category, setCategory] = useState("other");
  const [notes, setNotes] = useState("");
  const [splitMode, setSplitMode] = useState<"equal" | "percent">("equal");
  const [percentages, setPercentages] = useState<Record<number, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await groups.getById(groupId);
        const mList: Member[] = res.data.members.map((m: { userId: number; user: Member }) => m.user);
        setMembers(mList);
        setPaidById(user?.userId || mList[0]?.id || null);
        const initPct: Record<number, string> = {};
        mList.forEach((m) => { initPct[m.id] = (100 / mList.length).toFixed(1); });
        setPercentages(initPct);
      } catch { Alert.alert("Error", "Failed to load group"); router.back(); }
      finally { setLoading(false); }
    })();
  }, [groupId]);

  useEffect(() => {
    if (description.length > 2) setCategory(detectCategory(description));
  }, [description]);

  const totalPct = Object.values(percentages).reduce((s, v) => s + parseFloat(v || "0"), 0);

  const buildSplits = () => {
    const amt = parseFloat(amount);
    if (splitMode === "equal") {
      return members.map((m) => ({ userId: m.id, amount: parseFloat((amt / members.length).toFixed(2)) }));
    }
    return members.map((m) => ({ userId: m.id, amount: parseFloat(((parseFloat(percentages[m.id] || "0") / 100) * amt).toFixed(2)) }));
  };

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (!description.trim()) { Alert.alert("Error", "Enter a description"); return; }
    if (isNaN(amt) || amt <= 0) { Alert.alert("Error", "Enter a valid amount"); return; }
    if (!paidById) { Alert.alert("Error", "Select who paid"); return; }
    if (splitMode === "percent" && Math.abs(totalPct - 100) > 0.5) {
      Alert.alert("Error", `Percentages must total 100% (currently ${totalPct.toFixed(1)}%)`); return;
    }
    setSubmitting(true);
    try {
      await expenses.create(groupId, {
        description: description.trim(), amount: amt, paidById,
        splits: buildSplits(), category, notes: notes.trim() || undefined,
      });
      router.back();
    } catch { Alert.alert("Error", "Failed to add expense. Try again."); }
    finally { setSubmitting(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={INDIGO} /></View>;

  const numAmt = parseFloat(amount) || 0;
  const hPad = r.hPad + r.s(16);
  // On tablet, show a 2-col form layout
  const isWide = r.isTablet;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView
        style={styles.root}
        contentContainerStyle={{ paddingBottom: insets.bottom + r.s(100), paddingHorizontal: hPad, paddingTop: r.s(12) }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Description + Amount card */}
        <View style={[styles.formCard, { borderRadius: r.s(18), padding: r.s(18), marginBottom: r.s(12) }]}>
          {isWide ? (
            <View style={{ flexDirection: "row", gap: r.s(16) }}>
              <View style={{ flex: 2 }}>
                <Text style={[styles.label, { fontSize: r.fs(12), marginBottom: r.s(10) }]}>Description</Text>
                <TextInput style={[styles.input, { fontSize: r.fs(15), padding: r.s(14) }]}
                  placeholder="What was this expense for?" placeholderTextColor="#94a3b8"
                  value={description} onChangeText={setDescription} returnKeyType="next" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { fontSize: r.fs(12), marginBottom: r.s(10) }]}>Amount</Text>
                <TextInput style={[styles.input, { fontSize: r.fs(15), padding: r.s(14) }]}
                  placeholder="0.00" placeholderTextColor="#94a3b8"
                  keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
              </View>
            </View>
          ) : (
            <>
              <Text style={[styles.label, { fontSize: r.fs(12), marginBottom: r.s(10) }]}>Description</Text>
              <TextInput style={[styles.input, { fontSize: r.fs(15), padding: r.s(14), marginBottom: r.s(16) }]}
                placeholder="What was this expense for?" placeholderTextColor="#94a3b8"
                value={description} onChangeText={setDescription} returnKeyType="next" />
              <Text style={[styles.label, { fontSize: r.fs(12), marginBottom: r.s(10) }]}>Amount</Text>
              <TextInput style={[styles.input, { fontSize: r.fs(15), padding: r.s(14) }]}
                placeholder="0.00" placeholderTextColor="#94a3b8"
                keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
            </>
          )}
        </View>

        {/* Category card */}
        <View style={[styles.formCard, { borderRadius: r.s(18), padding: r.s(18), marginBottom: r.s(12) }]}>
          <Text style={[styles.label, { fontSize: r.fs(12), marginBottom: r.s(12) }]}>Category</Text>
          <View style={[styles.catGrid, { gap: r.s(8) }]}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity key={c.id}
                style={[styles.catBtn, { gap: r.s(6), paddingHorizontal: r.s(12), paddingVertical: r.s(9), borderRadius: r.s(20) }, category === c.id && styles.catBtnActive]}
                onPress={() => setCategory(c.id)}>
                <Text style={{ fontSize: r.fs(16) }}>{c.emoji}</Text>
                <Text style={[styles.catLabel, { fontSize: r.fs(12) }, category === c.id && styles.catLabelActive]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Paid By card */}
        <View style={[styles.formCard, { borderRadius: r.s(18), padding: r.s(18), marginBottom: r.s(12) }]}>
          <Text style={[styles.label, { fontSize: r.fs(12), marginBottom: r.s(12) }]}>Paid By</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: r.s(8) }}>
            {members.map((m) => (
              <TouchableOpacity key={m.id}
                style={[styles.paidPill, { gap: r.s(8), paddingHorizontal: r.s(14), paddingVertical: r.s(10), borderRadius: r.s(24) }, paidById === m.id && styles.paidPillActive]}
                onPress={() => setPaidById(m.id)}>
                <View style={[styles.pillAv, { width: r.s(28), height: r.s(28), borderRadius: r.s(14) }, paidById === m.id && styles.pillAvActive]}>
                  <Text style={{ fontSize: r.fs(13), fontWeight: "800", color: paidById === m.id ? "#fff" : "#475569" }}>{m.name.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={[styles.pillName, { fontSize: r.fs(13) }, paidById === m.id && styles.pillNameActive]}>
                  {m.id === user?.userId ? "You" : m.name.split(" ")[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Split card */}
        <View style={[styles.formCard, { borderRadius: r.s(18), padding: r.s(18), marginBottom: r.s(12) }]}>
          <Text style={[styles.label, { fontSize: r.fs(12), marginBottom: r.s(12) }]}>Split Method</Text>
          <View style={[styles.toggleRow, { gap: r.s(8), marginBottom: r.s(16) }]}>
            <TouchableOpacity style={[styles.toggleBtn, { paddingVertical: r.s(12), borderRadius: r.s(24) }, splitMode === "equal" && styles.toggleActive]}
              onPress={() => setSplitMode("equal")}>
              <Text style={[styles.toggleText, { fontSize: r.fs(13) }, splitMode === "equal" && styles.toggleTextActive]}>⚖️ Equal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toggleBtn, { paddingVertical: r.s(12), borderRadius: r.s(24) }, splitMode === "percent" && styles.toggleActive]}
              onPress={() => setSplitMode("percent")}>
              <Text style={[styles.toggleText, { fontSize: r.fs(13) }, splitMode === "percent" && styles.toggleTextActive]}>% Custom</Text>
            </TouchableOpacity>
          </View>

          {splitMode === "equal" ? (
            members.map((m) => (
              <View key={m.id} style={[styles.splitRow, { gap: r.s(10), borderRadius: r.s(12), padding: r.s(12), marginBottom: r.s(6) }]}>
                <View style={[styles.splitAv, { width: r.s(34), height: r.s(34), borderRadius: r.s(10) }]}>
                  <Text style={{ fontSize: r.fs(14), fontWeight: "700", color: INDIGO }}>{m.name.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={[styles.splitName, { fontSize: r.fs(14) }]}>{m.id === user?.userId ? "You" : m.name}</Text>
                <Text style={[styles.splitAmt, { fontSize: r.fs(14) }]}>₹{(numAmt / members.length).toFixed(2)}</Text>
              </View>
            ))
          ) : (
            <>
              <View style={[styles.pctHeader, { marginBottom: r.s(10) }]}>
                <Text style={[styles.label, { fontSize: r.fs(12) }]}>Custom %</Text>
                <Text style={[styles.pctTotal, { fontSize: r.fs(14) }, Math.abs(totalPct - 100) < 0.5 ? styles.pctOk : styles.pctErr]}>
                  {totalPct.toFixed(1)}%
                </Text>
              </View>
              {members.map((m) => {
                const pct = parseFloat(percentages[m.id] || "0");
                return (
                  <View key={m.id} style={[styles.pctRow, { gap: r.s(8), borderRadius: r.s(10), padding: r.s(10), marginBottom: r.s(6) }]}>
                    <View style={[styles.splitAv, { width: r.s(32), height: r.s(32), borderRadius: r.s(10) }]}>
                      <Text style={{ fontSize: r.fs(13), fontWeight: "700", color: INDIGO }}>{m.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={[styles.pctName, { fontSize: r.fs(13) }]}>{m.id === user?.userId ? "You" : m.name}</Text>
                    <View style={styles.pctInWrap}>
                      <TextInput style={[styles.pctIn, { width: r.s(60), borderRadius: r.s(8), padding: r.s(8), fontSize: r.fs(14) }]}
                        value={percentages[m.id] || ""}
                        onChangeText={(v) => setPercentages((p) => ({ ...p, [m.id]: v }))}
                        keyboardType="decimal-pad" placeholder="0" placeholderTextColor="#94a3b8" />
                      <Text style={[styles.pctSign, { fontSize: r.fs(14) }]}>%</Text>
                    </View>
                    <Text style={[styles.pctAmt, { width: r.s(66), fontSize: r.fs(13) }]}>₹{((pct / 100) * numAmt).toFixed(2)}</Text>
                  </View>
                );
              })}
              <TouchableOpacity style={[styles.resetBtn, { marginTop: r.s(10), paddingVertical: r.s(10), borderRadius: r.s(10) }]}
                onPress={() => {
                  const eq = (100 / members.length).toFixed(1);
                  const rr: Record<number, string> = {};
                  members.forEach((m) => { rr[m.id] = eq; });
                  setPercentages(rr);
                }}>
                <Text style={[styles.resetBtnText, { fontSize: r.fs(13) }]}>Reset to Equal</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Notes card */}
        <View style={[styles.formCard, { borderRadius: r.s(18), padding: r.s(18), marginBottom: r.s(12) }]}>
          <Text style={[styles.label, { fontSize: r.fs(12), marginBottom: r.s(10) }]}>
            Notes <Text style={{ fontWeight: "400", color: "#94a3b8", textTransform: "none" }}>(optional)</Text>
          </Text>
          <TextInput style={[styles.input, { height: r.s(80), textAlignVertical: "top", fontSize: r.fs(15), padding: r.s(14) }]}
            placeholder="Add any extra details..." placeholderTextColor="#94a3b8"
            multiline value={notes} onChangeText={setNotes} />
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingHorizontal: hPad, paddingBottom: insets.bottom + r.s(16) }]}>
        <TouchableOpacity
          style={[styles.btn, { padding: r.s(16), borderRadius: r.s(14) }, (submitting || !description.trim() || !amount) && styles.btnDisabled]}
          onPress={handleSubmit} disabled={submitting || !description.trim() || !amount} activeOpacity={0.85}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={[styles.btnText, { fontSize: r.fs(16) }]}>Add Expense</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f1f0ff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  formCard: {
    backgroundColor: "#fff",
    shadowColor: "#4f46e5",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  label: { fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 },
  input: { borderWidth: 1.5, borderColor: "#e2e8f0", borderRadius: 12, color: "#0f172a", backgroundColor: "#f8fafc" },
  catGrid: { flexDirection: "row", flexWrap: "wrap" },
  catBtn: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: "#e2e8f0", backgroundColor: "#fff" },
  catBtnActive: { borderColor: INDIGO, backgroundColor: "#eef2ff" },
  catLabel: { fontWeight: "600", color: "#64748b" },
  catLabelActive: { color: INDIGO },
  paidPill: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: "#e2e8f0", backgroundColor: "#f8fafc" },
  paidPillActive: { borderColor: INDIGO, backgroundColor: INDIGO },
  pillAv: { backgroundColor: "#e2e8f0", alignItems: "center", justifyContent: "center" },
  pillAvActive: { backgroundColor: "rgba(255,255,255,0.25)" },
  pillName: { fontWeight: "600", color: "#475569" },
  pillNameActive: { color: "#fff" },
  toggleRow: { flexDirection: "row" },
  toggleBtn: { flex: 1, borderWidth: 1.5, borderColor: "#e2e8f0", backgroundColor: "#f8fafc", alignItems: "center" },
  toggleActive: { borderColor: INDIGO, backgroundColor: INDIGO },
  toggleText: { fontWeight: "700", color: "#64748b" },
  toggleTextActive: { color: "#fff" },
  splitRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: "#f1f5f9" },
  splitAv: { backgroundColor: "#eef2ff", alignItems: "center", justifyContent: "center" },
  splitName: { flex: 1, fontWeight: "600", color: "#0f172a" },
  splitAmt: { fontWeight: "700", color: "#475569" },
  pctHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  pctTotal: { fontWeight: "800" },
  pctOk: { color: "#16a34a" },
  pctErr: { color: "#e11d48" },
  pctRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: "#f1f5f9" },
  pctName: { flex: 1, fontWeight: "600", color: "#0f172a" },
  pctInWrap: { flexDirection: "row", alignItems: "center", gap: 2 },
  pctIn: { borderWidth: 1.5, borderColor: "#c7d2fe", color: "#0f172a", backgroundColor: "#f8fafc", textAlign: "center" },
  pctSign: { fontWeight: "700", color: INDIGO },
  pctAmt: { fontWeight: "600", color: "#475569", textAlign: "right" },
  resetBtn: { backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0", alignItems: "center" },
  resetBtnText: { color: "#64748b", fontWeight: "600" },
  bottomBar: { backgroundColor: "#f1f0ff", paddingTop: 16, borderTopWidth: 1, borderColor: "#e2e8f0" },
  btn: { backgroundColor: INDIGO, alignItems: "center" },
  btnDisabled: { backgroundColor: "#a5b4fc" },
  btnText: { color: "#fff", fontWeight: "700" },
});
