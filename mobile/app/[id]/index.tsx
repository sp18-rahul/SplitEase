import React, { useState, useCallback, useLayoutEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, Alert, RefreshControl, TextInput, Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useNavigation, useFocusEffect } from "expo-router";
import {
  groups, balances as balancesApi, settlements, expenses as expensesApi,
  activityApi, exportApi,
} from "@/api/client";
import { useAuth } from "@/context/auth";
import { useResponsive } from "@/utils/responsive";

const INDIGO = "#4f46e5";
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
}

type TabType = "balances" | "expenses" | "activity";

export default function GroupDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();
  const r = useResponsive();
  const insets = useSafeAreaInsets();
  const groupId = parseInt(id as string);

  const [group, setGroup] = useState<Group | null>(null);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settleModal, setSettleModal] = useState<Transaction | null>(null);
  const [settling, setSettling] = useState(false);
  const [toast, setToast] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("balances");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

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
    } catch { /* ignore */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId]);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await activityApi.getByGroup(groupId);
      setActivityItems(res.data || []);
    } catch { setActivityItems([]); }
  }, [groupId]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  useLayoutEffect(() => {
    if (group) {
      navigation.setOptions({
        title: `${group.emoji || "💰"} ${group.name}`,
        headerRight: () => (
          <View style={{ flexDirection: "row", gap: r.s(8), marginRight: r.s(4) }}>
            <TouchableOpacity onPress={handleExport} style={[styles.headerBtn, { paddingHorizontal: r.s(10), paddingVertical: r.s(6) }]}>
              <Text style={{ color: "#fff", fontSize: r.fs(12), fontWeight: "700" }}>Export</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push(`/${groupId}/add-expense`)}
              style={[styles.headerBtnPrimary, { paddingHorizontal: r.s(12), paddingVertical: r.s(6) }]}>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: r.fs(14) }}>+ Add</Text>
            </TouchableOpacity>
          </View>
        ),
      });
    }
  }, [group, navigation, r.width]);

  const handleExport = async () => {
    try {
      const res = await exportApi.getCSV(groupId);
      Alert.alert("Exported", "CSV export complete.\n\n" + String(res.data).slice(0, 300));
    } catch { Alert.alert("Error", "Failed to export data"); }
  };

  const handleSettle = async () => {
    if (!settleModal) return;
    setSettling(true);
    try {
      await settlements.create(groupId, settleModal);
      setSettleModal(null);
      showToast("Settlement recorded! 🎉");
      fetchData();
    } catch { Alert.alert("Error", "Failed to record settlement"); }
    finally { setSettling(false); }
  };

  const handleDeleteExpense = (expenseId: number, desc: string) => {
    Alert.alert("Delete Expense", `Delete "${desc}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try { await expensesApi.delete(groupId, expenseId); fetchData(); showToast("Expense deleted"); }
        catch { Alert.alert("Error", "Failed to delete expense"); }
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
      fetchData(); showToast("Expense duplicated! 📋");
    } catch { Alert.alert("Error", "Failed to duplicate expense"); }
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

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={INDIGO} /></View>;
  if (!group) return <View style={styles.center}><Text>Group not found</Text></View>;

  const sym = CURRENCY_SYMBOLS[group.currency || "INR"] || "₹";
  const totalExpenses = group.expenses.reduce((s, e) => s + e.amount, 0);
  const currentUserId = user?.userId;

  const getMemberName = (uid: number) =>
    group.members.find((m) => m.userId === uid)?.user.name || "Unknown";
  const getMemberUpiId = (uid: number) =>
    group.members.find((m) => m.userId === uid)?.user.upiId || null;

  const myBalance = (() => {
    if (!currentUserId) return 0;
    let net = 0;
    group.expenses.forEach((e) => {
      if (e.paidBy.id === currentUserId) net += e.amount;
      const mySplit = e.splits.find((s) => s.userId === currentUserId);
      if (mySplit) net -= mySplit.amount;
    });
    return net;
  })();

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
      {txns.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: r.fs(48), marginBottom: r.s(12) }}>🎉</Text>
          <Text style={[styles.emptyTitle, { fontSize: r.fs(18) }]}>All settled up!</Text>
          <Text style={[styles.emptySub, { fontSize: r.fs(13) }]}>No payments needed right now.</Text>
        </View>
      ) : (
        txns.map((t, i) => {
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
                  <TouchableOpacity
                    style={[styles.payBtn, { paddingVertical: r.s(10), borderRadius: r.s(10), backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }]}
                    onPress={() => showToast(`Reminder sent to ${getMemberName(t.fromUserId)}! 🔔`)}>
                    <Text style={[styles.payBtnText, { fontSize: r.fs(14), color: GREEN }]}>🔔 Remind</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })
      )}
      <Text style={[styles.sectionLabel, { fontSize: r.fs(11) }]}>MEMBER BALANCES</Text>
      {group.members.map((m) => {
        const bal = (() => {
          let net = 0;
          group.expenses.forEach((e) => {
            if (e.paidBy.id === m.userId) net += e.amount;
            const split = e.splits.find((s) => s.userId === m.userId);
            if (split) net -= split.amount;
          });
          return net;
        })();
        const color = bal > 0 ? GREEN : bal < 0 ? RED : "#64748b";
        return (
          <View key={m.userId} style={[styles.memberRow, { borderRadius: r.s(12), padding: r.s(12), marginBottom: r.s(8) }]}>
            <View style={[styles.memberAvatar, { width: r.s(38), height: r.s(38), borderRadius: r.s(12), marginRight: r.s(12) }]}>
              <Text style={{ fontWeight: "700", fontSize: r.fs(14), color: INDIGO }}>{m.user.name.charAt(0).toUpperCase()}</Text>
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
          const catColor = CATEGORY_COLORS[e.category || "other"] || INDIGO;
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
            <View style={[styles.actDot, { width: r.s(12), height: r.s(12), borderRadius: r.s(6), marginTop: r.s(4), backgroundColor: item.type === "expense" ? INDIGO : GREEN }]} />
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
                  <Text style={[styles.actTitle, { fontSize: r.fs(14) }]}>💸 Settlement</Text>
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
    <View style={styles.root}>
      {!!toast && (
        <View style={[styles.toast, { top: r.s(16), left: r.s(20), right: r.s(20), borderRadius: r.s(12), padding: r.s(14) }]}>
          <Text style={[styles.toastText, { fontSize: r.fs(14) }]}>{toast}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + r.s(100) }}
        refreshControl={
          <RefreshControl refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(true); }} tintColor={INDIGO} />
        }
      >
        {/* Summary Banner */}
        <View style={[styles.banner, { overflow: "hidden" }]}>
          <View style={[styles.bannerBlob1, { width: r.s(180), height: r.s(180), borderRadius: r.s(90), top: -r.s(50), right: -r.s(40) }]} />
          <View style={[styles.bannerBlob2, { width: r.s(120), height: r.s(120), borderRadius: r.s(60), bottom: -r.s(30), left: r.s(30) }]} />
          <View style={{ paddingHorizontal: hPad, paddingTop: r.s(18), paddingBottom: r.s(22) }}>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={[styles.statVal, { fontSize: r.fs(r.isTablet ? 24 : 20) }]}>{sym}{totalExpenses.toFixed(0)}</Text>
                <Text style={[styles.statLbl, { fontSize: r.fs(11) }]}>Total Spent</Text>
              </View>
              <View style={[styles.stat, styles.statMiddle]}>
                <Text style={[styles.statVal, { fontSize: r.fs(r.isTablet ? 24 : 20) }]}>{group.members.length}</Text>
                <Text style={[styles.statLbl, { fontSize: r.fs(11) }]}>Members</Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.statVal, { fontSize: r.fs(r.isTablet ? 24 : 20), color: myBalance >= 0 ? "#86efac" : "#fca5a5" }]}>
                  {myBalance >= 0 ? "+" : ""}{sym}{Math.abs(myBalance).toFixed(0)}
                </Text>
                <Text style={[styles.statLbl, { fontSize: r.fs(11) }]}>Your Balance</Text>
              </View>
            </View>
          </View>
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
                      backgroundColor: CATEGORY_COLORS[cat] || INDIGO,
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
                  <TouchableOpacity style={[styles.modalBtn, { paddingVertical: r.s(14), borderRadius: r.s(14), backgroundColor: INDIGO }]}
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f1f0ff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  toast: { position: "absolute", zIndex: 100, backgroundColor: "#0f172a", alignItems: "center" },
  toastText: { color: "#fff", fontWeight: "600" },
  banner: { backgroundColor: INDIGO },
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
  tabRow: { flexDirection: "row", backgroundColor: "#ebe9ff", gap: 4, shadowColor: "#4f46e5", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  tab: { flex: 1, alignItems: "center" },
  tabActive: { backgroundColor: INDIGO },
  tabText: { fontWeight: "700", color: "#6366f1" },
  tabTextActive: { color: "#fff" },
  sectionLabel: { fontWeight: "700", color: "#94a3b8", letterSpacing: 0.8, marginTop: 20, marginBottom: 10 },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyTitle: { fontWeight: "700", color: "#0f172a" },
  emptySub: { color: "#64748b", marginTop: 4, textAlign: "center" },
  txnCard: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  txnCardMine: { borderColor: "#c7d2fe", backgroundColor: "#eef2ff" },
  txnRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  txnAvatar: { backgroundColor: "#fee2e2", alignItems: "center", justifyContent: "center" },
  txnMiddle: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  txnFrom: { fontWeight: "700", color: "#0f172a" },
  txnArrow: { color: INDIGO, fontWeight: "600", marginVertical: 2 },
  txnTo: { fontWeight: "700", color: "#0f172a" },
  txnBtns: { marginTop: 12 },
  payBtn: { borderWidth: 1, borderColor: "#c7d2fe", alignItems: "center", backgroundColor: "#eef2ff" },
  payBtnText: { fontWeight: "700", color: INDIGO },
  memberRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  memberAvatar: { backgroundColor: "#eef2ff", alignItems: "center", justifyContent: "center" },
  memberName: { flex: 1, fontWeight: "600", color: "#0f172a" },
  upiChip: { fontWeight: "700", color: "#854d0e", backgroundColor: "#fef9c3", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginRight: 8 },
  memberBal: { fontWeight: "800" },
  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#e2e8f0" },
  searchInput: { flex: 1, color: "#0f172a" },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1.5, borderColor: "#e2e8f0", backgroundColor: "#fff" },
  filterChipActive: { borderColor: INDIGO, backgroundColor: "#eef2ff" },
  filterChipText: { fontWeight: "600", color: "#64748b" },
  filterChipTextActive: { color: INDIGO },
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
  fab: { position: "absolute", backgroundColor: INDIGO, alignItems: "center", justifyContent: "center", shadowColor: INDIGO, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
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
