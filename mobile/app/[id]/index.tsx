import React, { useState, useCallback, useLayoutEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, Alert, RefreshControl, TextInput, Linking, Switch,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useNavigation, useFocusEffect } from "expo-router";
import {
  groups, balances as balancesApi, settlements, expenses as expensesApi,
  activityApi, exportApi,
} from "@/api/client";
import { useAuth } from "@/context/auth";
import { useTheme } from "@/context/theme";
import { useResponsive } from "@/utils/responsive";
import { InviteModal } from "@/components/invite-modal";

const PURPLE = "#7C3AED"
const PURPLE_LIGHT = "#EDE9FE"
const BG = "#F8F5FF";
const GREEN = "#16a34a";
const RED = "#e11d48";

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥", AED: "د.إ",
};
const CATEGORY_EMOJIS: Record<string, string> = {
  food: "🍽️", transport: "🚗", housing: "🏠", entertainment: "🎉",
  shopping: "🛒", travel: "✈️", health: "💊", utilities: "🔧", other: "💡",
};
const CATEGORY_LABELS: Record<string, string> = {
  food: "Food", transport: "Transport", housing: "Housing", entertainment: "Fun",
  shopping: "Shopping", travel: "Travel", health: "Health", utilities: "Utilities", other: "Other",
};
const CATEGORY_COLORS: Record<string, string> = {
  food: "#f97316", transport: "#3b82f6", housing: "#8b5cf6", entertainment: "#ec4899",
  shopping: "#06b6d4", travel: "#10b981", health: "#ef4444", utilities: "#f59e0b", other: "#6366f1",
};

interface Member { id: number; name: string; upiId?: string | null; }
interface Expense {
  id: number; description: string; amount: number;
  paidBy: { name: string; id: number };
  splits: { userId: number; amount: number }[];
  category?: string | null; notes?: string | null; createdAt?: string;
}
interface Group {
  id: number; name: string; currency?: string; emoji?: string;
  members: { userId: number; user: Member }[];
  expenses: Expense[];
}
interface Transaction { fromUserId: number; toUserId: number; amount: number; }
interface ActivityItem {
  type: "expense" | "settlement";
  date: string;
  description?: string;
  amount: number;
  fromName?: string;
  toName?: string;
  paidByName?: string;
  category?: string | null;
  settlementId?: number;
  fromUserId?: number;
  toUserId?: number;
}

type TabType = "balances" | "expenses" | "activity";

// Compute raw pairwise debts from expenses (before debt simplification).
// Returns one transaction per debtor-creditor pair (netted).
function computeRawPairwiseTransactions(expenses: Expense[]): Transaction[] {
  const debtMap: Record<number, Record<number, number>> = {};

  for (const expense of expenses) {
    const paidById = expense.paidBy.id;
    for (const split of expense.splits) {
      if (split.userId === paidById) continue;
      if (!debtMap[split.userId]) debtMap[split.userId] = {};
      debtMap[split.userId][paidById] =
        (debtMap[split.userId][paidById] || 0) + split.amount;
    }
  }

  const result: Transaction[] = [];
  const processed = new Set<string>();

  for (const fromStr of Object.keys(debtMap)) {
    const from = parseInt(fromStr);
    for (const toStr of Object.keys(debtMap[from])) {
      const to = parseInt(toStr);
      const key = [Math.min(from, to), Math.max(from, to)].join("-");
      if (processed.has(key)) continue;
      processed.add(key);

      const forward = debtMap[from]?.[to] || 0;
      const backward = debtMap[to]?.[from] || 0;
      const net = forward - backward;

      if (net > 0.005) {
        result.push({ fromUserId: from, toUserId: to, amount: Math.round(net * 100) / 100 });
      } else if (net < -0.005) {
        result.push({ fromUserId: to, toUserId: from, amount: Math.round(-net * 100) / 100 });
      }
    }
  }

  return result;
}

export default function GroupDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const r = useResponsive();
  const insets = useSafeAreaInsets();
  const groupId = parseInt(id as string);

  const [group, setGroup] = useState<Group | null>(null);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [apiBalances, setApiBalances] = useState<{ [key: number]: number }>({});
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settleModal, setSettleModal] = useState<Transaction | null>(null);
  const [settling, setSettling] = useState(false);
  const [toast, setToast] = useState("");
  const [deletingSettlementId, setDeletingSettlementId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("balances");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [remindingSettlementId, setRemindingSettlementId] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [minimizeTxns, setMinimizeTxns] = useState(true);

  // Load Minimize Transactions preference from AsyncStorage on mount
  React.useEffect(() => {
    AsyncStorage.getItem(`minimize_txn_${groupId}`).then((val) => {
      // Default to true (minimized) unless explicitly set to false
      setMinimizeTxns(val === null ? true : val === "true");
    });
  }, [groupId]);

  const toggleMinimizeTxns = async (val: boolean) => {
    setMinimizeTxns(val);
    await AsyncStorage.setItem(`minimize_txn_${groupId}`, val ? "true" : "false");
    showToast(val
      ? "Minimize Transactions ON — fewest payments to settle up ⚡"
      : "Showing exact pairwise debts"
    );
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [gRes, bRes] = await Promise.all([
        groups.getById(groupId),
        balancesApi.getByGroup(groupId),
      ]);
      setGroup(gRes.data);
      setTxns(bRes.data.transactions || []);
      setApiBalances(bRes.data.balances || {});
    } catch (error: any) {
      console.error("Error fetching group data:", error);
      showToast("Failed to load group data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId]);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await activityApi.getByGroup(groupId);
      setActivityItems(res.data || []);
    } catch (error: any) {
      console.error("Error fetching activity:", error);
      setActivityItems([]);
    }
  }, [groupId]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  // Header handled by custom UI below (headerShown: false)

  const handleExport = async () => {
    try {
      const res = await exportApi.getCSV(groupId);
      Alert.alert("Exported", "CSV export complete.\n\n" + String(res.data).slice(0, 300));
    } catch (error: any) {
      console.error("Export error:", error);
      const msg = error.message || "Failed to export data";
      Alert.alert("Error", msg);
    }
  };

  const handleSettle = async () => {
    if (!settleModal) return;
    setSettling(true);
    try {
      await settlements.create(groupId, settleModal);
      setSettleModal(null);
      showToast("Settlement recorded! 🎉");
      fetchData();
    } catch (error: any) {
      console.error("Settlement error:", error);
      const msg = error.response?.data?.error || error.message || "Failed to record settlement";
      Alert.alert("Error", msg);
    }
    finally { setSettling(false); }
  };

  const handleDeleteSettlement = async (settlementId: number) => {
    Alert.alert("Remove Settlement", "Remove this settlement record?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive",
        onPress: async () => {
          setDeletingSettlementId(settlementId);
          try {
            await settlements.delete(groupId, settlementId);
            showToast("Settlement removed");
            fetchData();
          } catch (error: any) {
            console.error("Delete settlement error:", error);
            const msg = error.message || "Failed to remove settlement";
            Alert.alert("Error", msg);
          }
          finally { setDeletingSettlementId(null); }
        },
      },
    ]);
  };

  const handleDeleteExpense = (expenseId: number, desc: string) => {
    Alert.alert("Delete Expense", `Delete "${desc}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          await expensesApi.delete(groupId, expenseId);
          fetchData();
          showToast("Expense deleted");
        } catch (error: any) {
          console.error("Delete expense error:", error);
          const msg = error.message || "Failed to delete expense";
          Alert.alert("Error", msg);
        }
      }},
    ]);
  };

  const handleDuplicate = async (exp: Expense) => {
    try {
      await expensesApi.create(groupId, {
        description: `${exp.description} (copy)`, amount: exp.amount,
        paidById: exp.paidBy.id, splits: exp.splits,
        category: exp.category || undefined, notes: exp.notes || undefined,
      });
      fetchData();
      showToast("Expense duplicated! 📋");
    } catch (error: any) {
      console.error("Duplicate expense error:", error);
      const msg = error.response?.data?.error || error.message || "Failed to duplicate expense";
      Alert.alert("Error", msg);
    }
  };

  const handleDeleteGroup = () => {
    Alert.alert("Delete Group", `Are you sure you want to delete "${group?.name}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);
            await groups.delete(groupId);
            showToast("Group deleted");
            router.back();
          } catch (error: any) {
            console.error("Delete group error:", error);
            const msg = error.response?.data?.error || error.message || "Failed to delete group";
            Alert.alert("Error", msg);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const UPI_APPS = [
    { name: "GPay", scheme: "gpay://upi/pay", color: "#166534", bg: "#f0fdf4", border: "#86efac" },
    { name: "PhonePe", scheme: "phonepe://pay", color: "#7e22ce", bg: "#faf5ff", border: "#d8b4fe" },
    { name: "Paytm", scheme: "paytmmp://pay", color: "#1d4ed8", bg: "#eff6ff", border: "#93c5fd" },
    { name: "BHIM", scheme: "bhim://pay", color: "#c2410c", bg: "#fff7ed", border: "#fdba74" },
  ];

  const handleUpiAppPay = (upiId: string, amount: number, toName: string, scheme: string, appName: string) => {
    const url = `${scheme}?pa=${encodeURIComponent(upiId)}&am=${amount.toFixed(2)}&cu=INR&pn=${encodeURIComponent(toName)}&tn=SplitEase+settlement`;
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert(
          `${appName} not found`,
          `${appName} doesn't appear to be installed.\n\nPay ${toName} manually:\nUPI ID: ${upiId}\nAmount: ₹${amount.toFixed(2)}`
        );
      }
    });
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={PURPLE} /></View>;
  if (!group) return <View style={styles.center}><Text>Group not found</Text></View>;

  const sym = CURRENCY_SYMBOLS[group.currency || "INR"] || "₹";
  const totalExpenses = group.expenses.reduce((s, e) => s + e.amount, 0);
  const currentUserId = user?.userId;

  const getMemberName = (uid: number) =>
    group.members.find((m) => m.userId === uid)?.user.name || "Unknown";
  const getMemberUpiId = (uid: number) =>
    group.members.find((m) => m.userId === uid)?.user.upiId || null;

  // Use the settlement-aware balance from the API instead of recalculating from expenses
  const myBalance = currentUserId ? (apiBalances[currentUserId] || 0) : 0;

  // displayTxns: minimized (API) or raw pairwise depending on toggle
  const displayTxns = minimizeTxns ? txns : computeRawPairwiseTransactions(group.expenses);

  const filteredExpenses = group.expenses.filter((e) => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      e.description.toLowerCase().includes(q) ||
      e.paidBy.name.toLowerCase().includes(q) ||
      (e.notes || "").toLowerCase().includes(q);
    const matchesCat = !categoryFilter || e.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const categoryTotals: Record<string, number> = {};
  group.expenses.forEach((e) => {
    const cat = e.category || "other";
    categoryTotals[cat] = (categoryTotals[cat] || 0) + e.amount;
  });
  const chartData = Object.entries(categoryTotals).sort(([, a], [, b]) => b - a).slice(0, 6);
  const maxCatAmt = chartData[0]?.[1] || 1;
  const presentCategories = [...new Set(group.expenses.map((e) => e.category || "other"))];

  const hPad = r.hPad + r.s(16);

  // ─── Tablet 2-column layout ────────────────────────────────────────────────
  // On tablet: left column = summary/chart/balances, right column = expenses
  const renderBalancesPanel = () => (
    <>
      {displayTxns.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: r.fs(48), marginBottom: r.s(12) }}>🎉</Text>
          <Text style={[styles.emptyTitle, { fontSize: r.fs(18) }]}>All settled up!</Text>
          <Text style={[styles.emptySub, { fontSize: r.fs(13) }]}>No payments needed right now.</Text>
        </View>
      ) : (
        displayTxns.map((t, i) => {
          const isMyTxn = !!(currentUserId && (t.fromUserId === currentUserId || t.toUserId === currentUserId));
          const toUpiId = getMemberUpiId(t.toUserId);
          return (
            <View key={i} style={[styles.txnCard, isMyTxn && styles.txnCardMine, { borderRadius: r.s(16), padding: r.s(14), marginBottom: r.s(10) }]}>
              <View style={styles.txnRow}>
                <View style={[styles.txnAvatar, { width: r.s(36), height: r.s(36), borderRadius: r.s(18) }]}>
                  <Text style={{ fontWeight: "700", fontSize: r.fs(14), color: "#b91c1c" }}>{getMemberName(t.fromUserId).charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.txnMiddle}>
                  <Text style={[styles.txnFrom, { fontSize: r.fs(13) }]}>{getMemberName(t.fromUserId)}</Text>
                  <Text style={[styles.txnArrow, { fontSize: r.fs(12) }]}>pays {sym}{t.amount.toFixed(0)} →</Text>
                  <Text style={[styles.txnTo, { fontSize: r.fs(13) }]}>{getMemberName(t.toUserId)}</Text>
                </View>
                <View style={[styles.txnAvatar, { width: r.s(36), height: r.s(36), borderRadius: r.s(18), backgroundColor: "#dcfce7" }]}>
                  <Text style={{ fontWeight: "700", fontSize: r.fs(14), color: "#166534" }}>{getMemberName(t.toUserId).charAt(0).toUpperCase()}</Text>
                </View>
              </View>
              <View style={[styles.txnBtns, { gap: r.s(8) }]}>
                {currentUserId === t.fromUserId && (
                  <>
                    <TouchableOpacity style={[styles.payBtn, { paddingVertical: r.s(10), borderRadius: r.s(10) }]} onPress={() => setSettleModal(t)}>
                      <Text style={[styles.payBtnText, { fontSize: r.fs(14) }]}>✓ Mark as Paid</Text>
                    </TouchableOpacity>
                    {!toUpiId && (
                      <Text style={{ fontSize: r.fs(11), color: "#94a3b8", textAlign: "center", paddingVertical: r.s(4) }}>
                        💳 Ask {getMemberName(t.toUserId)} to add their UPI ID for quick pay
                      </Text>
                    )}
                    {toUpiId && (
                      <View style={{ gap: r.s(6) }}>
                        {/* UPI ID label */}
                        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#fef9c3", borderRadius: r.s(8), padding: r.s(7), borderWidth: 1, borderColor: "#fde047" }}>
                          <Text style={{ fontSize: r.fs(11), fontWeight: "600", color: "#854d0e", flex: 1 }} numberOfLines={1}>
                            💳 {toUpiId}
                          </Text>
                        </View>
                        {/* App buttons row */}
                        <View style={{ flexDirection: "row", gap: r.s(6) }}>
                          {UPI_APPS.map(({ name, scheme, color, bg, border }) => (
                            <TouchableOpacity
                              key={name}
                              style={{ flex: 1, paddingVertical: r.s(8), borderRadius: r.s(8), backgroundColor: bg, borderWidth: 1, borderColor: border, alignItems: "center" }}
                              onPress={() => handleUpiAppPay(toUpiId, t.amount, getMemberName(t.toUserId), scheme, name)}
                            >
                              <Text style={{ fontSize: r.fs(11), fontWeight: "700", color }}>{name}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                  </>
                )}
                {currentUserId === t.toUserId && (
                  <>
                    <TouchableOpacity
                      style={[styles.payBtn, { paddingVertical: r.s(10), borderRadius: r.s(10) }]}
                      onPress={() => setSettleModal(t)}>
                      <Text style={[styles.payBtnText, { fontSize: r.fs(14) }]}>✓ Mark as Settled</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.payBtn, { paddingVertical: r.s(10), borderRadius: r.s(10), backgroundColor: "#f0fdf4", borderColor: "#bbf7d0", opacity: remindingSettlementId ? 0.6 : 1 }]}
                      onPress={async () => {
                        try {
                          setRemindingSettlementId(`${t.fromUserId}-${t.toUserId}`);
                          await settlements.sendReminder(groupId, { fromUserId: t.fromUserId, toUserId: t.toUserId, amount: t.amount });
                          showToast(`Reminder sent to ${getMemberName(t.fromUserId)}! 🔔`);
                        } catch (error) {
                          showToast("Failed to send reminder");
                        } finally {
                          setRemindingSettlementId(null);
                        }
                      }}
                      disabled={remindingSettlementId === `${t.fromUserId}-${t.toUserId}`}>
                      {remindingSettlementId === `${t.fromUserId}-${t.toUserId}` ? (
                        <ActivityIndicator color={GREEN} size="small" />
                      ) : (
                        <Text style={[styles.payBtnText, { fontSize: r.fs(14), color: GREEN }]}>🔔 Remind</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          );
        })
      )}
      <Text style={[styles.sectionLabel, { fontSize: r.fs(11) }]}>MEMBER BALANCES</Text>
      {group.members.map((m) => {
        // Use settlement-aware balance from the API
        const bal = apiBalances[m.userId] || 0;
        const color = bal > 0 ? GREEN : bal < 0 ? RED : "#64748b";
        return (
          <View key={m.userId} style={[styles.memberRow, { borderRadius: r.s(12), padding: r.s(12), marginBottom: r.s(8) }]}>
            <View style={[styles.memberAvatar, { width: r.s(38), height: r.s(38), borderRadius: r.s(12), marginRight: r.s(12) }]}>
              <Text style={{ fontWeight: "700", fontSize: r.fs(14), color: PURPLE }}>{m.user.name.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={[styles.memberName, { fontSize: r.fs(14) }]}>{m.user.name}</Text>
            {m.user.upiId && <Text style={[styles.upiChip, { fontSize: r.fs(10) }]}>UPI</Text>}
            <Text style={[styles.memberBal, { fontSize: r.fs(14), color }]}>
              {bal > 0 ? "+" : ""}{sym}{Math.abs(bal).toFixed(0)}
            </Text>
          </View>
        );
      })}
    </>
  );

  const renderExpensesPanel = () => (
    <>
      {group.expenses.length > 2 && (
        <View style={[styles.searchWrap, { borderRadius: r.s(12), marginBottom: r.s(12) }]}>
          <TextInput
            style={[styles.searchInput, { padding: r.s(12), fontSize: r.fs(14) }]}
            placeholder="🔍 Search expenses..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch("")} style={{ paddingHorizontal: r.s(12) }}>
              <Text style={{ fontSize: r.fs(14), color: "#94a3b8", fontWeight: "700" }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      {presentCategories.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: r.s(8), paddingBottom: r.s(12) }}>
          <TouchableOpacity
            style={[styles.filterChip, !categoryFilter && styles.filterChipActive, { paddingHorizontal: r.s(12), paddingVertical: r.s(7), borderRadius: r.s(20) }]}
            onPress={() => setCategoryFilter(null)}>
            <Text style={[styles.filterChipText, { fontSize: r.fs(12) }, !categoryFilter && styles.filterChipTextActive]}>All</Text>
          </TouchableOpacity>
          {presentCategories.map((cat) => (
            <TouchableOpacity key={cat}
              style={[styles.filterChip, categoryFilter === cat && styles.filterChipActive, { paddingHorizontal: r.s(12), paddingVertical: r.s(7), borderRadius: r.s(20) }]}
              onPress={() => setCategoryFilter(categoryFilter === cat ? null : cat)}>
              <Text style={{ fontSize: r.fs(13) }}>{CATEGORY_EMOJIS[cat] || "💡"}</Text>
              <Text style={[styles.filterChipText, { fontSize: r.fs(12) }, categoryFilter === cat && styles.filterChipTextActive]}>
                {CATEGORY_LABELS[cat] || cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      {filteredExpenses.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: r.fs(48), marginBottom: r.s(12) }}>{search || categoryFilter ? "🔍" : "🧾"}</Text>
          <Text style={[styles.emptyTitle, { fontSize: r.fs(18) }]}>{search || categoryFilter ? "No matches" : "No expenses yet"}</Text>
          <Text style={[styles.emptySub, { fontSize: r.fs(13) }]}>{search || categoryFilter ? "Try a different search." : "Tap + Add to record your first expense."}</Text>
        </View>
      ) : (
        filteredExpenses.map((e) => {
          const myShare = e.splits.find((s) => s.userId === currentUserId)?.amount || 0;
          const iPaid = e.paidBy.id === currentUserId;
          const emoji = CATEGORY_EMOJIS[e.category || "other"] || "💡";
          const catColor = CATEGORY_COLORS[e.category || "other"] || PURPLE;
          return (
            <View key={e.id} style={[styles.expCard, { borderRadius: r.s(14), padding: r.s(12), marginBottom: r.s(10), borderLeftWidth: r.s(4), borderLeftColor: catColor }]}>
              <View style={[styles.expEmoji, { width: r.s(44), height: r.s(44), borderRadius: r.s(12), marginRight: r.s(12), backgroundColor: catColor + "18" }]}>
                <Text style={{ fontSize: r.fs(20) }}>{emoji}</Text>
              </View>
              <View style={styles.expBody}>
                <Text style={[styles.expDesc, { fontSize: r.fs(14) }]}>{e.description}</Text>
                {e.notes ? <Text style={[styles.expNotes, { fontSize: r.fs(11) }]} numberOfLines={1}>{e.notes}</Text> : null}
                <Text style={[styles.expMeta, { fontSize: r.fs(12) }]}>
                  {e.paidBy.name} paid · {e.createdAt
                    ? new Date(e.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                    : ""}
                </Text>
              </View>
              <View style={styles.expRight}>
                <Text style={[styles.expAmount, { fontSize: r.fs(15) }]}>{sym}{e.amount.toFixed(0)}</Text>
                {currentUserId && (
                  <View style={[styles.expBadge, { borderRadius: r.s(10), paddingHorizontal: r.s(8), paddingVertical: r.s(2), backgroundColor: iPaid ? "#dcfce7" : "#fff1f2" }]}>
                    <Text style={[styles.expBadgeText, { fontSize: r.fs(11), color: iPaid ? GREEN : RED }]}>
                      {iPaid ? `+${sym}${(e.amount - myShare).toFixed(0)}` : `-${sym}${myShare.toFixed(0)}`}
                    </Text>
                  </View>
                )}
                <View style={[styles.expActions, { gap: r.s(4), marginTop: r.s(4) }]}>
                  <TouchableOpacity style={[styles.expActionBtn, { width: r.s(30), height: r.s(30), borderRadius: r.s(8) }]}
                    onPress={() => router.push(`/${groupId}/edit-expense?expenseId=${e.id}`)}>
                    <Text style={{ fontSize: r.fs(14) }}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.expActionBtn, { width: r.s(30), height: r.s(30), borderRadius: r.s(8) }]} onPress={() => handleDuplicate(e)}>
                    <Text style={{ fontSize: r.fs(14) }}>📋</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.expActionBtn, { width: r.s(30), height: r.s(30), borderRadius: r.s(8), backgroundColor: "#fff1f2" }]}
                    onPress={() => handleDeleteExpense(e.id, e.description)}>
                    <Text style={{ fontSize: r.fs(14) }}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })
      )}
    </>
  );

  const renderActivityPanel = () => (
    <>
      {activityItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: r.fs(48), marginBottom: r.s(12) }}>📋</Text>
          <Text style={[styles.emptyTitle, { fontSize: r.fs(18) }]}>No activity yet</Text>
          <Text style={[styles.emptySub, { fontSize: r.fs(13) }]}>Expenses and settlements will appear here.</Text>
        </View>
      ) : (
        activityItems.map((item, i) => (
          <View key={i} style={[styles.actItem, { marginBottom: r.s(16), gap: r.s(12) }]}>
            <View style={[styles.actDot, { width: r.s(12), height: r.s(12), borderRadius: r.s(6), marginTop: r.s(4), backgroundColor: item.type === "expense" ? PURPLE : GREEN }]} />
            <View style={[styles.actContent, { paddingLeft: r.s(12), paddingBottom: r.s(8) }]}>
              {item.type === "expense" ? (
                <>
                  <Text style={[styles.actTitle, { fontSize: r.fs(14) }]}>
                    {CATEGORY_EMOJIS[item.category || "other"] || "💡"} {item.description}
                  </Text>
                  <Text style={[styles.actSub, { fontSize: r.fs(13) }]}>{item.paidByName} paid · {sym}{item.amount.toFixed(0)}</Text>
                </>
              ) : (
                <>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={[styles.actTitle, { fontSize: r.fs(14) }]}>💸 Settlement</Text>
                    {currentUserId && item.settlementId &&
                      (item.fromUserId === currentUserId || item.toUserId === currentUserId) && (
                        <TouchableOpacity
                          onPress={() => handleDeleteSettlement(item.settlementId!)}
                          disabled={deletingSettlementId === item.settlementId}
                          style={{ padding: 4, opacity: deletingSettlementId === item.settlementId ? 0.4 : 1 }}
                        >
                          <Text style={{ fontSize: r.fs(12), color: "#f87171", fontWeight: "700" }}>✕ Remove</Text>
                        </TouchableOpacity>
                      )}
                  </View>
                  <Text style={[styles.actSub, { fontSize: r.fs(13) }]}>{item.fromName} paid {item.toName} · {sym}{item.amount.toFixed(0)}</Text>
                </>
              )}
              <Text style={[styles.actDate, { fontSize: r.fs(11) }]}>
                {new Date(item.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </Text>
            </View>
          </View>
        ))
      )}
    </>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {!!toast && (
        <View style={[styles.toast, { top: r.s(16), left: r.s(20), right: r.s(20), borderRadius: r.s(12), padding: r.s(14), backgroundColor: colors.surface }]}>
          <Text style={[styles.toastText, { fontSize: r.fs(14), color: colors.text }]}>{toast}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + r.s(100) }}
        refreshControl={
          <RefreshControl refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(true); }} tintColor={PURPLE} />
        }
      >
        {/* ── CUSTOM HEADER ── */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: insets.top + 12, paddingBottom: 12, backgroundColor: colors.background }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 }}>
              <Text style={{ fontSize: 18, color: PURPLE }}>←</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 20, fontWeight: "900", color: PURPLE, letterSpacing: -0.3 }}>SplitEase</Text>
          </View>
          <TouchableOpacity onPress={() => router.push(`/${groupId}/add-expense`)} style={{ paddingHorizontal: 14, paddingVertical: 8, backgroundColor: PURPLE, borderRadius: 20 }}>
            <Text style={{ color: "white", fontWeight: "700", fontSize: 14 }}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {/* ── GROUP BALANCE CARD ── */}
        <View style={{ backgroundColor: "#EDE9FE", borderRadius: 20, margin: 16, padding: 20 }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: PURPLE, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>
            {group.emoji ? `${group.emoji} ` : ""}{group.name}
          </Text>
          <Text style={{ fontSize: 12, color: "#8B5CF6", marginBottom: 10 }}>
            {group.members.length} members · {group.expenses.length} expenses
          </Text>
          <Text style={{ fontSize: 11, fontWeight: "700", color: PURPLE, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Current Balance</Text>
          <Text style={{ fontSize: 36, fontWeight: "900", color: "#1a0533", letterSpacing: -1, marginBottom: 4 }}>
            {sym}{Math.abs(myBalance).toFixed(0)}
          </Text>
          {myBalance !== 0 && (
            <Text style={{ fontSize: 13, fontWeight: "600", color: myBalance > 0 ? "#16a34a" : "#dc2626", marginBottom: 14 }}>
              {myBalance > 0 ? "↑ You are owed money" : "↓ You owe money"}
            </Text>
          )}
          {/* Member avatar stack */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <View style={{ flexDirection: "row" }}>
              {group.members.slice(0, 4).map((m, i) => (
                <View key={m.userId} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: [PURPLE, "#A78BFA", "#6D28D9", "#8B5CF6"][i % 4], borderWidth: 1.5, borderColor: "#EDE9FE", alignItems: "center", justifyContent: "center", marginLeft: i === 0 ? 0 : -8, zIndex: 4 - i }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "white" }}>{m.user.name.charAt(0).toUpperCase()}</Text>
                </View>
              ))}
              {group.members.length > 4 && (
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "white", borderWidth: 1.5, borderColor: "#EDE9FE", alignItems: "center", justifyContent: "center", marginLeft: -8 }}>
                  <Text style={{ fontSize: 10, fontWeight: "700", color: PURPLE }}>+{group.members.length - 4}</Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 12, color: "#8B5CF6" }}>{group.members.length} members</Text>
          </View>
          {/* Minimize Transactions toggle */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: minimizeTxns ? "#F3F0FF" : "rgba(255,255,255,0.5)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12, borderWidth: 1, borderColor: minimizeTxns ? PURPLE_LIGHT : "rgba(255,255,255,0.3)" }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontSize: 15 }}>⚡</Text>
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#1a0533" }}>Minimize Transactions</Text>
                {minimizeTxns && (
                  <View style={{ backgroundColor: PURPLE, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 10, fontWeight: "700", color: "white" }}>ON</Text>
                  </View>
                )}
              </View>
              <Text style={{ fontSize: 11, color: "#8B5CF6", marginTop: 2 }}>
                {minimizeTxns
                  ? "Fewest payments needed to settle all debts"
                  : "Showing exact debts from each expense"}
              </Text>
            </View>
            <Switch
              value={minimizeTxns}
              onValueChange={toggleMinimizeTxns}
              trackColor={{ false: "#e2e8f0", true: PURPLE }}
              thumbColor="#fff"
            />
          </View>

          {/* Action buttons */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            {displayTxns.some(t => t.fromUserId === currentUserId || t.toUserId === currentUserId) && (
              <TouchableOpacity
                style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: PURPLE, paddingVertical: 12, borderRadius: 12 }}
                onPress={() => {
                  const myTxn = displayTxns.find(t => t.fromUserId === currentUserId || t.toUserId === currentUserId);
                  if (myTxn) setSettleModal(myTxn);
                }}
              >
                <Text style={{ color: "white", fontWeight: "700", fontSize: 14 }}>✓ Settle Up</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "white", paddingVertical: 12, borderRadius: 12 }}
              onPress={() => router.push(`/${groupId}/add-expense`)}
            >
              <Text style={{ color: PURPLE, fontWeight: "700", fontSize: 14 }}>+ Add Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#fef3c7", borderRadius: 12, justifyContent: "center", alignItems: "center" }}
              onPress={() => setShowInviteModal(true)}
            >
              <Text style={{ color: "#92400e", fontWeight: "700", fontSize: 14 }}>🔗</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#fee2e2", borderRadius: 12, justifyContent: "center", alignItems: "center" }}
              onPress={handleDeleteGroup}
            >
              <Text style={{ color: RED, fontWeight: "700", fontSize: 14 }}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── STATS ROW ── */}
        <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 16 }}>
          {[
            { label: "Spent", value: `${sym}${totalExpenses.toFixed(0)}`, color: "#0f172a" },
            { label: "Members", value: `${group.members.length}`, color: PURPLE },
            { label: "Expenses", value: `${group.expenses.length}`, color: "#16a34a" },
          ].map(stat => (
            <View key={stat.label} style={{ flex: 1, backgroundColor: "white", borderRadius: 14, padding: 12, alignItems: "center", shadowColor: PURPLE, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{stat.label}</Text>
              <Text style={{ fontSize: 16, fontWeight: "900", color: stat.color }}>{stat.value}</Text>
            </View>
          ))}
        </View>

        {/* Category Chart */}
        {chartData.length > 0 && (
          <View style={[styles.chartCard, {
            marginHorizontal: hPad, marginTop: r.s(16),
            borderRadius: r.s(16), padding: r.s(16),
          }]}>
            <Text style={[styles.chartTitle, { fontSize: r.fs(13), marginBottom: r.s(12) }]}>📊 Spending by Category</Text>
            {chartData.map(([cat, amt]) => (
              <View key={cat} style={[styles.chartRow, { marginBottom: r.s(10), gap: r.s(8) }]}>
                <Text style={{ fontSize: r.fs(16), width: r.s(24) }}>{CATEGORY_EMOJIS[cat] || "💡"}</Text>
                <View style={{ flex: 1 }}>
                  <View style={[styles.chartBarWrap, { height: r.s(10), borderRadius: r.s(5) }]}>
                    <View style={[styles.chartBar, {
                      height: r.s(10), borderRadius: r.s(5),
                      width: `${Math.round((amt / maxCatAmt) * 100)}%` as any,
                      backgroundColor: CATEGORY_COLORS[cat] || PURPLE,
                    }]} />
                  </View>
                  <Text style={[styles.chartCatLabel, { fontSize: r.fs(10) }]}>{CATEGORY_LABELS[cat] || cat}</Text>
                </View>
                <Text style={[styles.chartAmt, { fontSize: r.fs(12), width: r.s(60) }]}>{sym}{amt.toFixed(0)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── TABLET: 2-column side-by-side layout ── */}
        {r.isTablet ? (
          <>
            {/* Tabs for activity on tablet */}
            <View style={[styles.tabRow, { marginHorizontal: hPad, marginTop: r.s(16), borderRadius: r.s(14), padding: r.s(4) }]}>
              {(["balances", "expenses", "activity"] as TabType[]).map((tab) => (
                <TouchableOpacity key={tab}
                  style={[styles.tab, { paddingVertical: r.s(10), borderRadius: r.s(22) }, activeTab === tab && styles.tabActive]}
                  onPress={() => { setActiveTab(tab); if (tab === "activity") fetchActivity(); }}>
                  <Text style={[styles.tabText, { fontSize: r.fs(12) }, activeTab === tab && styles.tabTextActive]}>
                    {tab === "balances" ? "⚖️ Settle" : tab === "expenses" ? "🧾 Spend" : "📋 Activity"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {activeTab === "activity" ? (
              <View style={{ paddingHorizontal: hPad, paddingTop: r.s(16) }}>
                {renderActivityPanel()}
              </View>
            ) : (
              <View style={{ flexDirection: "row", paddingHorizontal: hPad, paddingTop: r.s(16), gap: r.s(16) }}>
                <View style={{ flex: 1 }}>{renderBalancesPanel()}</View>
                <View style={{ flex: 1 }}>{renderExpensesPanel()}</View>
              </View>
            )}
          </>
        ) : (
          /* ── PHONE: tab-based layout ── */
          <>
            <View style={[styles.tabRow, { marginHorizontal: hPad, marginTop: r.s(16), borderRadius: r.s(14), padding: r.s(4) }]}>
              {(["balances", "expenses", "activity"] as TabType[]).map((tab) => (
                <TouchableOpacity key={tab}
                  style={[styles.tab, { paddingVertical: r.s(10), borderRadius: r.s(10) }, activeTab === tab && styles.tabActive]}
                  onPress={() => { setActiveTab(tab); if (tab === "activity") fetchActivity(); }}>
                  <Text style={[styles.tabText, { fontSize: r.fs(11) }, activeTab === tab && styles.tabTextActive]}>
                    {tab === "balances" ? "⚖️ Settle" : tab === "expenses" ? "🧾 Spend" : "📋 Activity"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ paddingHorizontal: hPad, paddingTop: r.s(16) }}>
              {activeTab === "balances" && renderBalancesPanel()}
              {activeTab === "expenses" && renderExpensesPanel()}
              {activeTab === "activity" && renderActivityPanel()}
            </View>
          </>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, {
          bottom: insets.bottom + r.s(24),
          right: r.hPad + r.s(24),
          width: r.s(58), height: r.s(58), borderRadius: r.s(29),
        }]}
        onPress={() => router.push(`/${groupId}/add-expense`)}
        activeOpacity={0.85}
      >
        <Text style={{ fontSize: r.fs(28), color: "#fff", fontWeight: "300", lineHeight: r.s(32) }}>＋</Text>
      </TouchableOpacity>

      {/* Settle Modal */}
      <Modal visible={!!settleModal} transparent animationType="slide" onRequestClose={() => setSettleModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, {
            borderRadius: r.s(24), padding: r.s(28),
            maxWidth: r.isTablet ? 480 : undefined,
            width: r.isTablet ? "100%" : undefined,
            alignSelf: r.isTablet ? "center" : undefined,
          }]}>
            <Text style={[styles.modalTitle, { fontSize: r.fs(20), marginBottom: r.s(12) }]}>Confirm Payment</Text>
            {settleModal && (
              <>
                <Text style={[styles.modalBody, { fontSize: r.fs(15), marginBottom: r.s(6) }]}>
                  You're marking{" "}
                  <Text style={{ fontWeight: "800" }}>{sym}{settleModal.amount.toFixed(0)}</Text>
                  {" "}paid to{" "}
                  <Text style={{ fontWeight: "800" }}>{getMemberName(settleModal.toUserId)}</Text>.
                </Text>
                <Text style={[styles.modalSub, { fontSize: r.fs(13), marginBottom: r.s(24) }]}>This will update the group balances.</Text>
                <View style={[styles.modalBtns, { gap: r.s(12) }]}>
                  <TouchableOpacity style={[styles.modalBtn, { paddingVertical: r.s(14), borderRadius: r.s(14), backgroundColor: "#f1f5f9" }]}
                    onPress={() => setSettleModal(null)}>
                    <Text style={[styles.modalBtnText, { fontSize: r.fs(15), color: "#475569" }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtn, { paddingVertical: r.s(14), borderRadius: r.s(14), backgroundColor: PURPLE }]}
                    onPress={handleSettle} disabled={settling}>
                    {settling ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={[styles.modalBtnText, { fontSize: r.fs(15), color: "#fff" }]}>Confirm</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Invite Modal */}
      <InviteModal
        visible={showInviteModal}
        groupId={groupId}
        groupName={group?.name || "Group"}
        onClose={() => setShowInviteModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f1f0ff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  toast: { position: "absolute", zIndex: 100, backgroundColor: "#0f172a", alignItems: "center" },
  toastText: { color: "#fff", fontWeight: "600" },
  banner: { backgroundColor: PURPLE },
  bannerBlob1: { position: "absolute", backgroundColor: "rgba(255,255,255,0.08)" },
  bannerBlob2: { position: "absolute", backgroundColor: "rgba(255,255,255,0.05)" },
  statsRow: { flexDirection: "row" },
  stat: { flex: 1, alignItems: "center" },
  statMiddle: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  statVal: { fontWeight: "900", color: "#fff" },
  statLbl: { color: "rgba(255,255,255,0.7)", marginTop: 2, fontWeight: "600" },
  chartCard: { backgroundColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  chartTitle: { fontWeight: "700", color: "#0f172a" },
  chartRow: { flexDirection: "row", alignItems: "center" },
  chartBarWrap: { backgroundColor: "#f1f5f9", overflow: "hidden" },
  chartBar: {},
  chartCatLabel: { color: "#94a3b8", fontWeight: "500", marginTop: 2 },
  chartAmt: { fontWeight: "700", color: "#475569", textAlign: "right" },
  tabRow: { flexDirection: "row", backgroundColor: "#EDE9FE", gap: 4, shadowColor: PURPLE, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  tab: { flex: 1, alignItems: "center" },
  tabActive: { backgroundColor: PURPLE },
  tabText: { fontWeight: "700", color: "#6366f1" },
  tabTextActive: { color: "#fff" },
  sectionLabel: { fontWeight: "700", color: "#94a3b8", letterSpacing: 0.8, marginTop: 20, marginBottom: 10 },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyTitle: { fontWeight: "700", color: "#0f172a" },
  emptySub: { color: "#64748b", marginTop: 4, textAlign: "center" },
  txnCard: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  txnCardMine: { borderColor: "#C4B5FD", backgroundColor: PURPLE_LIGHT },
  txnRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  txnAvatar: { backgroundColor: "#fee2e2", alignItems: "center", justifyContent: "center" },
  txnMiddle: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  txnFrom: { fontWeight: "700", color: "#0f172a" },
  txnArrow: { color: PURPLE, fontWeight: "600", marginVertical: 2 },
  txnTo: { fontWeight: "700", color: "#0f172a" },
  txnBtns: { marginTop: 12 },
  payBtn: { borderWidth: 1, borderColor: "#C4B5FD", alignItems: "center", backgroundColor: PURPLE_LIGHT },
  payBtnText: { fontWeight: "700", color: PURPLE },
  memberRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  memberAvatar: { backgroundColor: PURPLE_LIGHT, alignItems: "center", justifyContent: "center" },
  memberName: { flex: 1, fontWeight: "600", color: "#0f172a" },
  upiChip: { fontWeight: "700", color: "#854d0e", backgroundColor: "#fef9c3", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginRight: 8 },
  memberBal: { fontWeight: "800" },
  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#e2e8f0" },
  searchInput: { flex: 1, color: "#0f172a" },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1.5, borderColor: "#e2e8f0", backgroundColor: "#fff" },
  filterChipActive: { borderColor: PURPLE, backgroundColor: PURPLE_LIGHT },
  filterChipText: { fontWeight: "600", color: "#64748b" },
  filterChipTextActive: { color: PURPLE },
  expCard: { backgroundColor: "#fff", flexDirection: "row", alignItems: "flex-start", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2, borderWidth: 1, borderColor: "#f1f5f9" },
  expEmoji: { alignItems: "center", justifyContent: "center" },
  expBody: { flex: 1 },
  expDesc: { fontWeight: "700", color: "#0f172a" },
  expNotes: { color: "#94a3b8", fontStyle: "italic", marginTop: 1 },
  expMeta: { color: "#64748b", marginTop: 2 },
  expRight: { alignItems: "flex-end" },
  expAmount: { fontWeight: "800", color: "#0f172a" },
  expBadge: {},
  expBadgeText: { fontWeight: "700" },
  expActions: { flexDirection: "row" },
  expActionBtn: { backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },
  actItem: { flexDirection: "row" },
  actDot: {},
  actContent: { flex: 1, borderLeftWidth: 2, borderLeftColor: "#e2e8f0" },
  actTitle: { fontWeight: "700", color: "#0f172a" },
  actSub: { color: "#475569", marginTop: 2 },
  actDate: { color: "#94a3b8", marginTop: 4 },
  fab: { position: "absolute", backgroundColor: PURPLE, alignItems: "center", justifyContent: "center", shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end", padding: 16 },
  modalCard: { backgroundColor: "#fff" },
  modalTitle: { fontWeight: "800", color: "#0f172a" },
  modalBody: { color: "#334155", lineHeight: 22 },
  modalSub: { color: "#94a3b8" },
  modalBtns: { flexDirection: "row" },
  modalBtn: { flex: 1, alignItems: "center" },
  modalBtnText: { fontWeight: "700" },
  headerBtn: { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 10 },
  headerBtnPrimary: { backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 20 },
});
