import React, { useState, useCallback, useMemo } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, RefreshControl, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Redirect, useRouter, useFocusEffect } from "expo-router";
import { useAuth } from "@/context/auth";
import { useTheme } from "@/context/theme";
import { personalExpenses as personalExpensesApi } from "@/api/client";

const PURPLE = "#7C3AED";
const PURPLE_LIGHT = "#EDE9FE";
const BROWN = "#C2722B";
const BG = "#F8F5FF";

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥", AED: "د.إ",
};
const sym = (code?: string) => CURRENCY_SYMBOLS[code || "INR"] || "₹";

const CATEGORY_EMOJIS: Record<string, string> = {
  food: "🍽️", transport: "🚗", housing: "🏠", entertainment: "🎉",
  shopping: "🛒", travel: "✈️", health: "💊", utilities: "🔧", other: "💡",
};

interface PersonalExpense {
  id: number;
  description: string;
  amount: number;
  category?: string | null;
  notes?: string | null;
  createdAt: string;
  paidBy: { id: number; name: string };
  paidById: number;
  group: { id: number; name: string; emoji?: string; currency?: string };
  myShare: number;
  iPaid: boolean;
  net: number;
}

interface Stats {
  totalPaidByMe: number;
  totalMyShare: number;
  netBalance: number;
  count: number;
}

type FilterType = "all" | "i_paid" | "i_owe" | "i_am_owed";

function dateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString("en-IN", { weekday: "long" });
  if (d.getFullYear() === now.getFullYear())
    return d.toLocaleDateString("en-IN", { month: "long" });
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export default function ExpensesScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  if (!user) return <Redirect href="/login" />;

  const insets = useSafeAreaInsets();
  const initial = user.name?.charAt(0).toUpperCase() || "?";

  const [expenses, setExpenses] = useState<PersonalExpense[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [groupFilter, setGroupFilter] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  const fetchExpenses = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await personalExpensesApi.getAll();
      setExpenses(res.data.expenses || []);
      setStats(res.data.stats || null);
    } catch { /* keep existing */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { fetchExpenses(); }, [fetchExpenses]));
  const onRefresh = () => { setRefreshing(true); fetchExpenses(true); };

  const groups = useMemo(() => {
    const map = new Map<number, { id: number; name: string; emoji?: string }>();
    expenses.forEach((e) => { if (!map.has(e.group.id)) map.set(e.group.id, e.group); });
    return [...map.values()];
  }, [expenses]);

  const categories = useMemo(() => (
    [...new Set(expenses.map((e) => e.category || "other"))]
  ), [expenses]);

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !e.description.toLowerCase().includes(q) &&
          !e.group.name.toLowerCase().includes(q) &&
          !(e.notes?.toLowerCase().includes(q))
        ) return false;
      }
      if (filter === "i_paid" && !e.iPaid) return false;
      if (filter === "i_owe" && (e.net >= 0 || e.iPaid)) return false;
      if (filter === "i_am_owed" && e.net <= 0) return false;
      if (groupFilter !== null && e.group.id !== groupFilter) return false;
      if (categoryFilter !== null && (e.category || "other") !== categoryFilter) return false;
      return true;
    });
  }, [expenses, search, filter, groupFilter, categoryFilter]);

  const grouped = useMemo(() => {
    const out: { label: string; items: PersonalExpense[] }[] = [];
    let currentLabel = "";
    filtered.forEach((e) => {
      const label = dateLabel(e.createdAt);
      if (label !== currentLabel) { out.push({ label, items: [] }); currentLabel = label; }
      out[out.length - 1].items.push(e);
    });
    return out;
  }, [filtered]);

  const s = sym();
  const netBalance = stats?.netBalance ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── HEADER ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={styles.headerAvatar}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>{initial}</Text>
          </View>
          <Text style={styles.headerBrand}>SplitEase</Text>
        </View>
        <TouchableOpacity style={styles.headerIconBtn} onPress={handleLogout}>
          <Text style={{ fontSize: 16 }}>🚪</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PURPLE} />}
      >
        {/* ── PAGE TITLE ── */}
        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Activity Feed</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>Keep track of all your shared expenses across all groups.</Text>
        </View>

        {/* ── SEARCH ── */}
        <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search expenses, groups..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={PURPLE} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading expenses…</Text>
          </View>
        ) : (
          <>
            {/* ── STAT CARDS (web-style 2x2 grid) ── */}
            <View style={styles.statsGrid}>
              {/* Total Share */}
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.statCardTop}>
                  <Text style={[styles.statCardLabel, { color: colors.textSecondary }]}>Total Share</Text>
                  <Text style={{ fontSize: 20 }}>🍩</Text>
                </View>
                <Text style={[styles.statCardAmount, { color: colors.text }]}>
                  {s}{(stats?.totalMyShare ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </Text>
                <Text style={[styles.statCardSub, { color: colors.textSecondary }]}>Across {groups.length} group{groups.length !== 1 ? "s" : ""}</Text>
              </View>

              {/* Amount Paid */}
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.statCardTop}>
                  <Text style={[styles.statCardLabel, { color: colors.textSecondary }]}>Amount Paid</Text>
                  <Text style={{ fontSize: 20, color: BROWN }}>💳</Text>
                </View>
                <Text style={[styles.statCardAmount, { color: colors.text }]}>
                  {s}{(stats?.totalPaidByMe ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </Text>
                <Text style={[styles.statCardSub, { color: colors.textSecondary }]}>
                  Settled {stats && stats.totalMyShare > 0 ? Math.round((stats.totalPaidByMe / stats.totalMyShare) * 100) : 0}% total
                </Text>
              </View>

              {/* Net Balance — purple highlight */}
              <View style={[styles.statCard, { backgroundColor: PURPLE }]}>
                <View style={styles.statCardTop}>
                  <Text style={[styles.statCardLabel, { color: "rgba(255,255,255,0.8)" }]}>Net Balance</Text>
                  <Text style={{ fontSize: 20 }}>🏦</Text>
                </View>
                <Text style={[styles.statCardAmount, { color: "#fff" }]}>
                  {netBalance >= 0 ? "" : "-"}{s}{Math.abs(netBalance).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </Text>
                <Text style={[styles.statCardSub, { color: "rgba(255,255,255,0.7)" }]}>
                  {netBalance > 0 ? "Owed to you" : netBalance < 0 ? "Owed to friends" : "All settled up"}
                </Text>
              </View>

              {/* Bill Count */}
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.statCardTop}>
                  <Text style={[styles.statCardLabel, { color: colors.textSecondary }]}>Bill Count</Text>
                  <Text style={{ fontSize: 20 }}>🧾</Text>
                </View>
                <Text style={[styles.statCardAmount, { color: colors.text }]}>{stats?.count ?? 0}</Text>
                <Text style={[styles.statCardSub, { color: colors.textSecondary }]}>Last 30 days</Text>
              </View>
            </View>

            {/* ── FILTER SECTION ── */}
            <View style={[styles.filterSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {/* Filter chips pill */}
              <View style={[styles.filterPill, { backgroundColor: colors.card }]}>
                {(["all", "i_paid", "i_owe", "i_am_owed"] as FilterType[]).map((f) => {
                  const labels: Record<FilterType, string> = {
                    all: "All", i_paid: "I Paid", i_owe: "I Owe", i_am_owed: "Owed to Me",
                  };
                  const active = filter === f;
                  return (
                    <TouchableOpacity
                      key={f}
                      onPress={() => setFilter(f)}
                      style={[styles.pillChip, active && styles.pillChipActive]}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.pillChipText, { color: active ? "#fff" : colors.textSecondary }]}>
                        {labels[f]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Group filter chips */}
              {groups.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                  <TouchableOpacity
                    onPress={() => setGroupFilter(null)}
                    style={[styles.tagChip, groupFilter === null
                      ? { backgroundColor: colors.purpleLight, borderColor: PURPLE }
                      : { backgroundColor: colors.surface, borderColor: colors.border }
                    ]}
                  >
                    <Text style={[styles.tagChipText, { color: groupFilter === null ? PURPLE : colors.text }]}>All Groups</Text>
                  </TouchableOpacity>
                  {groups.map((g) => (
                    <TouchableOpacity
                      key={g.id}
                      onPress={() => setGroupFilter(groupFilter === g.id ? null : g.id)}
                      style={[styles.tagChip, groupFilter === g.id
                        ? { backgroundColor: colors.purpleLight, borderColor: PURPLE }
                        : { backgroundColor: colors.surface, borderColor: colors.border }
                      ]}
                    >
                      <Text style={[styles.tagChipText, { color: groupFilter === g.id ? PURPLE : colors.text }]}>
                        {g.emoji} {g.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* ── EXPENSE LIST ── */}
            {filtered.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={{ fontSize: 36, marginBottom: 12 }}>🔍</Text>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {expenses.length === 0 ? "No expenses yet" : "No matching expenses"}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  {expenses.length === 0
                    ? "Add an expense inside any group to see it here."
                    : "Try changing your search or filters."}
                </Text>
              </View>
            ) : (
              <View style={{ paddingHorizontal: 16 }}>
                {grouped.map(({ label, items }) => (
                  <View key={label} style={{ marginBottom: 20 }}>
                    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{label.toUpperCase()}</Text>
                    {items.map((expense) => {
                      const cs = sym(expense.group.currency);
                      const net = expense.net;
                      const catEmoji = CATEGORY_EMOJIS[expense.category || "other"] || "💡";
                      const paidByName = expense.paidBy?.name || "Someone";

                      let statusText = "";
                      let statusColor = "";
                      if (expense.iPaid && net > 0) {
                        statusText = `You paid, owed ${cs}${net.toFixed(2)}`;
                        statusColor = PURPLE;
                      } else if (net < 0) {
                        statusText = `${expense.iPaid ? "You" : paidByName} paid, you owe ${cs}${Math.abs(net).toFixed(2)}`;
                        statusColor = "#E11D48";
                      } else if (net > 0) {
                        statusText = `You paid, owed ${cs}${net.toFixed(2)}`;
                        statusColor = PURPLE;
                      } else {
                        statusText = "Settled up";
                        statusColor = colors.textSecondary;
                      }

                      return (
                        <TouchableOpacity
                          key={expense.id}
                          style={[styles.expenseRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                          onPress={() => router.push(`/${expense.group.id}/edit-expense?expenseId=${expense.id}` as any)}
                          activeOpacity={0.7}
                        >
                          {/* Category icon */}
                          <View style={styles.catIcon}>
                            <Text style={{ fontSize: 22 }}>{catEmoji}</Text>
                          </View>

                          {/* Content */}
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={[styles.expenseDesc, { color: colors.text }]} numberOfLines={1}>{expense.description}</Text>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                              <View style={styles.groupBadge}>
                                <Text style={styles.groupBadgeText}>{expense.group.name}</Text>
                              </View>
                              <Text style={[styles.expenseTime, { color: colors.textSecondary }]}>
                                {new Date(expense.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                              </Text>
                            </View>
                          </View>

                          {/* Amount */}
                          <View style={{ alignItems: "flex-end", flexShrink: 0, minWidth: 100 }}>
                            <Text style={[styles.expenseTotal, { color: colors.text }]}>
                              {cs}{expense.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Text>
                            <Text style={[styles.expenseStatus, { color: statusColor }]} numberOfLines={1}>
                              {statusText}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}

                <Text style={[styles.footerCount, { color: colors.textSecondary }]}>
                  Showing {filtered.length} of {expenses.length} expenses
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ── BOTTOM NAV ── */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom + 4, backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {[
          { label: "GROUPS", emoji: "👥", active: false, route: "/" },
          { label: "EXPENSES", emoji: "🧾", active: true, route: "/expenses" },
          { label: "FRIENDS", emoji: "🤝", active: false, route: "/friends" },
          { label: "ACTIVITY", emoji: "🔔", active: false, route: "/activity" },
          { label: "ACCOUNT", emoji: "👤", active: false, route: "/profile" },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.label}
            style={styles.tabItem}
            onPress={() => { if (!tab.active) router.push(tab.route as any); }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 18, marginBottom: 1 }}>{tab.emoji}</Text>
            <Text style={[styles.tabLabel, { color: tab.active ? PURPLE : colors.textSecondary, fontWeight: tab.active ? "700" : "500" }]}>
              {tab.label}
            </Text>
            {tab.active && <View style={styles.tabActiveBar} />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#F0EEFF",
  },
  headerAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: PURPLE, alignItems: "center", justifyContent: "center",
  },
  headerBrand: { fontSize: 20, fontWeight: "900", color: PURPLE, letterSpacing: -0.3 },
  headerIconBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: "#F5F0FF",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "#EDE9FE",
  },

  pageHeader: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16 },
  pageTitle: { fontSize: 28, fontWeight: "900", color: "#1D1A24", letterSpacing: -0.5, marginBottom: 4 },
  pageSubtitle: { fontSize: 13, color: "#7B7487" },

  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: "#F5F0FF", borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: "#EDE9FE",
  },
  searchIcon: { fontSize: 15 },
  searchInput: { flex: 1, fontSize: 14, color: "#1D1A24", padding: 0 },

  statsGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 12,
    paddingHorizontal: 16, marginBottom: 16,
  },
  statCard: {
    flex: 1, minWidth: "45%",
    backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: "#F0EEFF",
    padding: 16,
  },
  statCardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  statCardLabel: { fontSize: 13, color: "#7B7487", fontWeight: "500" },
  statCardAmount: { fontSize: 22, fontWeight: "900", color: "#1D1A24", marginBottom: 4, letterSpacing: -0.5 },
  statCardSub: { fontSize: 11, color: "#9CA3AF" },

  filterSection: {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: "#F0EEFF",
    padding: 14,
  },
  filterPill: {
    flexDirection: "row", backgroundColor: "#F5F0FF", borderRadius: 999, padding: 4, gap: 2,
  },
  pillChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, flex: 1, alignItems: "center" },
  pillChipActive: { backgroundColor: PURPLE },
  pillChipText: { fontSize: 12, fontWeight: "600", color: "#4A4455" },
  pillChipTextActive: { color: "white", fontWeight: "700" },
  tagChip: {
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, marginRight: 6,
    borderWidth: 1, borderColor: "#E4D9F7", backgroundColor: "white",
  },
  tagChipActive: { backgroundColor: PURPLE_LIGHT, borderColor: PURPLE },
  tagChipText: { fontSize: 12, fontWeight: "600", color: "#4A4455" },
  tagChipTextActive: { color: PURPLE },

  sectionLabel: {
    fontSize: 10, fontWeight: "800", color: "#9CA3AF",
    letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 10, marginLeft: 2,
  },

  expenseRow: {
    backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: "#F0EEFF",
    padding: 14, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 12,
  },
  catIcon: {
    width: 48, height: 48, borderRadius: 18, backgroundColor: "#F5F0FF",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  expenseDesc: { fontSize: 14, fontWeight: "700", color: "#1D1A24" },
  groupBadge: { backgroundColor: PURPLE_LIGHT, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  groupBadgeText: { fontSize: 10, fontWeight: "700", color: PURPLE, letterSpacing: 0.3 },
  expenseTime: { fontSize: 11, color: "#9CA3AF" },
  expenseTotal: { fontSize: 16, fontWeight: "900", color: "#1D1A24", marginBottom: 2 },
  expenseStatus: { fontSize: 11, fontWeight: "600" },

  emptyCard: {
    marginHorizontal: 16, backgroundColor: "#fff", borderRadius: 18,
    borderWidth: 1, borderColor: "#F0EEFF",
    padding: 48, alignItems: "center",
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#1D1A24", marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: "#7B7487", textAlign: "center", lineHeight: 20 },

  centerState: { alignItems: "center", paddingTop: 80, gap: 12 },
  loadingText: { fontSize: 14, color: "#9CA3AF" },

  footerCount: { textAlign: "center", fontSize: 11, color: "#9CA3AF", paddingBottom: 8, marginTop: 4 },

  tabBar: {
    flexDirection: "row", backgroundColor: "#fff",
    borderTopWidth: 1, borderTopColor: "#F0EEFF", paddingTop: 8,
  },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center", position: "relative" },
  tabLabel: { fontSize: 9, letterSpacing: 0.2 },
  tabActiveBar: {
    position: "absolute", top: -8, left: "20%", right: "20%",
    height: 3, backgroundColor: PURPLE, borderRadius: 2,
  },
});
