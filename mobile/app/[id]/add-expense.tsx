import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Switch, Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { groups, expenses } from "@/api/client";
import { useAuth } from "@/context/auth";
import { useTheme } from "@/context/theme";
import { useResponsive } from "@/utils/responsive";

const PURPLE = "#7C3AED";
const PURPLE_LIGHT = "#EDE9FE";
const BG = "#F8F5FF";
const AVATAR_COLORS = [PURPLE, "#A78BFA", "#6D28D9", "#8B5CF6", "#C4B5FD"];

const CATEGORIES = [
  { id: "food", emoji: "🍽️", label: "Food" },
  { id: "transport", emoji: "🚗", label: "Transport" },
  { id: "housing", emoji: "🏠", label: "Rent" },
  { id: "shopping", emoji: "🛍️", label: "Shopping" },
  { id: "entertainment", emoji: "🎉", label: "Fun" },
  { id: "travel", emoji: "✈️", label: "Travel" },
  { id: "health", emoji: "💊", label: "Health" },
  { id: "utilities", emoji: "🔧", label: "Bills" },
  { id: "other", emoji: "💡", label: "Other" },
];

const KEYWORDS: Record<string, string[]> = {
  food: ["food", "dinner", "lunch", "breakfast", "cafe", "restaurant", "pizza", "burger", "meal", "groceries"],
  transport: ["uber", "ola", "taxi", "cab", "metro", "bus", "train", "fuel", "petrol", "parking"],
  housing: ["rent", "hotel", "airbnb", "accommodation", "hostel", "apartment"],
  entertainment: ["movie", "cinema", "concert", "party", "club", "bar", "drinks", "game"],
  shopping: ["shopping", "clothes", "shoes", "amazon", "flipkart"],
  travel: ["flight", "airline", "trip", "tour", "sightseeing", "visa"],
  health: ["medicine", "doctor", "hospital", "pharmacy", "gym"],
  utilities: ["electricity", "water", "internet", "wifi", "gas", "bill"],
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
  const { colors, isDark } = useTheme();
  const r = useResponsive();
  const insets = useSafeAreaInsets();
  const groupId = parseInt(id as string);

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidById, setPaidById] = useState<number | null>(null);
  const [category, setCategory] = useState("food");
  const [splitMode, setSplitMode] = useState<"equal" | "percent" | "exact">("equal");
  const [percentages, setPercentages] = useState<Record<number, string>>({});
  const [exactAmounts, setExactAmounts] = useState<Record<number, string>>({});
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [showPaidByList, setShowPaidByList] = useState(false);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await groups.getById(groupId);
        const mList: Member[] = res.data.members.map((m: { userId: number; user: Member }) => m.user);
        setMembers(mList);
        setPaidById(user?.userId || mList[0]?.id || null);
        const initPct: Record<number, string> = {};
        const initAmt: Record<number, string> = {};
        mList.forEach((m) => {
          initPct[m.id] = (100 / mList.length).toFixed(1);
          initAmt[m.id] = "";
        });
        setPercentages(initPct);
        setExactAmounts(initAmt);
      } catch (error: any) {
        console.error("Error loading group:", error);
        const msg = error.response?.data?.error || error.message || "Failed to load group";
        Alert.alert("Error", msg);
        router.back();
      }
      finally { setLoading(false); }
    })();
  }, [groupId]);

  useEffect(() => {
    if (description.length > 2) setCategory(detectCategory(description));
  }, [description]);

  const numAmt = parseFloat(amount) || 0;
  const includedMembers = members.filter((m) => !excluded.has(m.id));

  const buildSplits = () => {
    const amt = parseFloat(amount);
    if (splitMode === "equal") {
      return includedMembers.map((m) => ({
        userId: m.id,
        amount: parseFloat((amt / includedMembers.length).toFixed(2)),
      }));
    }
    if (splitMode === "percent") {
      return members.map((m) => ({
        userId: m.id,
        amount: parseFloat(((parseFloat(percentages[m.id] || "0") / 100) * amt).toFixed(2)),
      }));
    }
    // exact
    return members.map((m) => ({
      userId: m.id,
      amount: parseFloat(exactAmounts[m.id] || "0"),
    }));
  };

  const yourShare = (() => {
    if (!user?.userId || numAmt === 0) return 0;
    if (splitMode === "equal") {
      if (excluded.has(user.userId)) return 0;
      return includedMembers.length > 0 ? numAmt / includedMembers.length : 0;
    }
    if (splitMode === "percent") return (parseFloat(percentages[user.userId] || "0") / 100) * numAmt;
    return parseFloat(exactAmounts[user.userId] || "0");
  })();

  const owedToYou = paidById === user?.userId ? Math.max(0, numAmt - yourShare) : 0;

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        setReceiptUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (!description.trim()) { Alert.alert("Error", "Enter a description"); return; }
    if (isNaN(amt) || amt <= 0) { Alert.alert("Error", "Enter a valid amount"); return; }
    if (!paidById) { Alert.alert("Error", "Select who paid"); return; }
    setSubmitting(true);
    try {
      await expenses.create(groupId, {
        description: description.trim(), amount: amt, paidById,
        splits: buildSplits(), category, receiptUri: receiptUri || undefined,
      });
      router.back();
    } catch (error: any) {
      console.error("Error adding expense:", error);
      const msg = error.response?.data?.error || error.message || "Failed to add expense. Check your connection and try again.";
      Alert.alert("Error", msg);
    }
    finally { setSubmitting(false); }
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={PURPLE} />
    </View>
  );

  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const paidByMember = members.find((m) => m.id === paidById);
  const paidByIdx = members.findIndex((m) => m.id === paidById);
  const canSave = !!description.trim() && !!amount && !submitting;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* ── HEADER ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={{ fontSize: 18, color: "#64748b" }}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Expense</Text>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!canSave}
          style={[styles.saveBtn, !canSave && styles.saveBtnOff]}
        >
          {submitting
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>

      {/* ── AMOUNT ── */}
      <View style={styles.amountRow}>
        <Text style={[styles.amountSymbol, { color: numAmt > 0 ? PURPLE : "#CBD5E1" }]}>$</Text>
        <TextInput
          style={[styles.amountInput, { color: numAmt > 0 ? PURPLE : "#CBD5E1" }]}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor="#CBD5E1"
        />
      </View>
      <Text style={styles.amountLabel}>TOTAL AMOUNT</Text>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 110 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── DESCRIPTION ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DESCRIPTION</Text>
          <TextInput
            style={styles.input}
            placeholder="Lunch at Blue Bay"
            placeholderTextColor="#94a3b8"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* ── DATE ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DATE</Text>
          <View style={styles.dateRow}>
            <Text style={{ fontSize: 15, marginRight: 8 }}>📅</Text>
            <Text style={styles.dateText}>Today, {today}</Text>
          </View>
        </View>

        {/* ── CATEGORY ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SELECT CATEGORY</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 6 }}
          >
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.catPill, category === c.id && styles.catPillActive]}
                onPress={() => setCategory(c.id)}
              >
                <Text style={{ fontSize: 14 }}>{c.emoji}</Text>
                <Text style={[styles.catPillText, category === c.id && styles.catPillTextActive]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── RECEIPT (Optional) ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>RECEIPT (Optional)</Text>
          <TouchableOpacity style={styles.receiptBtn} onPress={pickImage}>
            <Text style={{ fontSize: 18, marginRight: 8 }}>📷</Text>
            <Text style={{ color: PURPLE, fontWeight: "600", fontSize: 14 }}>
              {receiptUri ? "Change Receipt" : "Add Receipt"}
            </Text>
          </TouchableOpacity>
          {receiptUri && (
            <View style={styles.receiptPreview}>
              <Image
                source={{ uri: receiptUri }}
                style={{ width: "100%", height: 200, borderRadius: 12 }}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.removeReceiptBtn}
                onPress={() => setReceiptUri(null)}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── PAID BY ── */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionLabel}>PAID BY</Text>
            <TouchableOpacity onPress={() => setShowPaidByList(!showPaidByList)}>
              <Text style={styles.changeLink}>Change ›</Text>
            </TouchableOpacity>
          </View>

          {showPaidByList ? (
            <View style={styles.paidByList}>
              {members.map((m, idx) => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.paidByItem, { borderBottomWidth: idx < members.length - 1 ? 1 : 0 }]}
                  onPress={() => { setPaidById(m.id); setShowPaidByList(false); }}
                >
                  <View style={[styles.avatarMd, { backgroundColor: AVATAR_COLORS[idx % AVATAR_COLORS.length] }]}>
                    <Text style={styles.avatarText}>{m.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.memberName}>{m.id === user?.userId ? "You" : m.name}</Text>
                  {paidById === m.id && <Text style={{ color: PURPLE, fontSize: 20 }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.paidBySelected}>
              <View style={[styles.avatarMd, { backgroundColor: AVATAR_COLORS[Math.max(0, paidByIdx) % AVATAR_COLORS.length] }]}>
                <Text style={styles.avatarText}>{paidByMember?.name.charAt(0).toUpperCase() || "?"}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>
                  {paidById === user?.userId ? "You" : paidByMember?.name || "Select"}
                </Text>
                <Text style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                  Ledger Account • Default
                </Text>
              </View>
              <Text style={{ color: PURPLE, fontSize: 20 }}>✓</Text>
            </View>
          )}
        </View>

        {/* ── SPLIT BETWEEN ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SPLIT BETWEEN</Text>

          {/* Mode toggle */}
          <View style={styles.splitModeTabs}>
            {(["equal", "percent", "exact"] as const).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.splitModeTab, splitMode === mode && styles.splitModeTabActive]}
                onPress={() => setSplitMode(mode)}
              >
                <Text style={[styles.splitModeText, splitMode === mode && styles.splitModeTextActive]}>
                  {mode.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Member circles */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 16, paddingVertical: 12, paddingHorizontal: 4 }}
          >
            {members.map((m, idx) => {
              const isExcl = excluded.has(m.id);
              let shareAmt = 0;
              if (splitMode === "equal") {
                shareAmt = isExcl ? 0 : (includedMembers.length > 0 ? numAmt / includedMembers.length : 0);
              } else if (splitMode === "percent") {
                shareAmt = (parseFloat(percentages[m.id] || "0") / 100) * numAmt;
              } else {
                shareAmt = parseFloat(exactAmounts[m.id] || "0");
              }

              return (
                <TouchableOpacity
                  key={m.id}
                  style={{ alignItems: "center", width: 64 }}
                  onPress={() => {
                    if (splitMode === "equal") {
                      const next = new Set(excluded);
                      if (isExcl) next.delete(m.id); else next.add(m.id);
                      setExcluded(next);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ position: "relative", marginBottom: 6 }}>
                    <View style={[
                      styles.splitAvatar,
                      { backgroundColor: AVATAR_COLORS[idx % AVATAR_COLORS.length], opacity: isExcl ? 0.3 : 1 },
                    ]}>
                      <Text style={styles.splitAvatarText}>{m.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    {!isExcl && (
                      <View style={styles.checkBadge}>
                        <Text style={{ fontSize: 9, color: "#fff", fontWeight: "800" }}>✓</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.splitMemberName, { opacity: isExcl ? 0.4 : 1 }]} numberOfLines={1}>
                    {m.id === user?.userId ? "You" : m.name.split(" ")[0]}
                  </Text>

                  {splitMode === "equal" && (
                    <Text style={[styles.splitMemberAmt, { color: isExcl ? "#94a3b8" : PURPLE }]}>
                      {isExcl ? "Excl." : `$${shareAmt.toFixed(2)}`}
                    </Text>
                  )}
                  {splitMode === "percent" && (
                    <>
                      <TextInput
                        style={styles.pctInput}
                        value={percentages[m.id] || ""}
                        onChangeText={(v) => setPercentages((p) => ({ ...p, [m.id]: v }))}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor="#94a3b8"
                      />
                      <Text style={[styles.splitMemberAmt, { color: PURPLE }]}>
                        ${shareAmt.toFixed(2)}
                      </Text>
                    </>
                  )}
                  {splitMode === "exact" && (
                    <TextInput
                      style={styles.pctInput}
                      value={exactAmounts[m.id] || ""}
                      onChangeText={(v) => setExactAmounts((p) => ({ ...p, [m.id]: v }))}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor="#94a3b8"
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </ScrollView>

      {/* ── BOTTOM BAR ── */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.bottomStats}>
          <View>
            <Text style={styles.bottomStatLabel}>YOUR SHARE</Text>
            <Text style={styles.bottomStatValue}>${yourShare.toFixed(2)}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.bottomStatLabel}>OWED TO YOU</Text>
            <Text style={[styles.bottomStatValue, { color: PURPLE }]}>${owedToYou.toFixed(2)}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.splitNowBtn, !canSave && styles.splitNowBtnOff]}
          onPress={handleSubmit}
          disabled={!canSave}
          activeOpacity={0.85}
        >
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.splitNowBtnText}>Split Now</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: BG },

  // Header
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 8, backgroundColor: BG,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#0f172a" },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 9, borderRadius: 20, backgroundColor: PURPLE },
  saveBtnOff: { backgroundColor: "#C4B5FD" },
  saveBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },

  // Amount
  amountRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", paddingTop: 12 },
  amountSymbol: { fontSize: 30, fontWeight: "700", marginBottom: 8, marginRight: 2 },
  amountInput: { fontSize: 52, fontWeight: "900", minWidth: 120, textAlign: "center" },
  amountLabel: {
    textAlign: "center", fontSize: 11, fontWeight: "700", color: "#94a3b8",
    letterSpacing: 1, textTransform: "uppercase", marginBottom: 16, marginTop: 4,
  },

  // Sections
  section: { marginBottom: 22 },
  sectionLabel: {
    fontSize: 11, fontWeight: "700", color: "#94a3b8",
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10,
  },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  input: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14, fontSize: 15,
    color: "#0f172a", borderWidth: 1, borderColor: PURPLE_LIGHT,
  },
  dateRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: PURPLE_LIGHT,
  },
  dateText: { fontSize: 15, color: "#0f172a", fontWeight: "500" },
  changeLink: { fontSize: 13, fontWeight: "700", color: PURPLE },

  // Category pills
  catPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
    backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#E2E8F0",
  },
  catPillActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  catPillText: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  catPillTextActive: { color: "#fff" },

  // Paid By
  paidByList: {
    backgroundColor: "#fff", borderRadius: 16,
    borderWidth: 1, borderColor: PURPLE_LIGHT, overflow: "hidden",
  },
  paidByItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 12, borderBottomColor: PURPLE_LIGHT,
  },
  paidBySelected: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: PURPLE_LIGHT,
  },
  avatarMd: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  memberName: { flex: 1, fontSize: 15, fontWeight: "600", color: "#0f172a" },

  // Split
  splitModeTabs: {
    flexDirection: "row", backgroundColor: "#fff", borderRadius: 12,
    padding: 4, marginBottom: 4, gap: 4,
    borderWidth: 1, borderColor: PURPLE_LIGHT,
  },
  splitModeTab: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: "center" },
  splitModeTabActive: { backgroundColor: PURPLE },
  splitModeText: { fontSize: 11, fontWeight: "700", color: "#64748b", letterSpacing: 0.5 },
  splitModeTextActive: { color: "#fff" },
  splitAvatar: {
    width: 54, height: 54, borderRadius: 27,
    alignItems: "center", justifyContent: "center",
  },
  splitAvatarText: { fontSize: 20, fontWeight: "700", color: "#fff" },
  checkBadge: {
    position: "absolute", right: -2, bottom: 2,
    width: 18, height: 18, borderRadius: 9, backgroundColor: "#16a34a",
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: BG,
  },
  splitMemberName: { fontSize: 12, fontWeight: "600", color: "#0f172a", textAlign: "center", marginBottom: 2 },
  splitMemberAmt: { fontSize: 12, fontWeight: "700", textAlign: "center" },
  pctInput: {
    borderWidth: 1, borderColor: "#C4B5FD", borderRadius: 8,
    padding: 5, fontSize: 12, textAlign: "center", color: "#0f172a",
    backgroundColor: "#fff", width: 54, marginTop: 4,
  },

  // Receipt
  receiptBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#fff", borderRadius: 14, paddingVertical: 14,
    borderWidth: 2, borderStyle: "dashed", borderColor: PURPLE_LIGHT,
  },
  receiptPreview: {
    marginTop: 12, backgroundColor: "#fff", borderRadius: 14, overflow: "hidden",
  },
  removeReceiptBtn: {
    backgroundColor: "#dc2626", paddingVertical: 10, alignItems: "center",
  },

  // Bottom bar
  bottomBar: {
    backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: PURPLE_LIGHT,
    paddingTop: 14, paddingHorizontal: 20,
  },
  bottomStats: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  bottomStatLabel: {
    fontSize: 10, fontWeight: "700", color: "#94a3b8",
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3,
  },
  bottomStatValue: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  splitNowBtn: { backgroundColor: PURPLE, borderRadius: 14, padding: 16, alignItems: "center" },
  splitNowBtnOff: { backgroundColor: "#C4B5FD" },
  splitNowBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
});
