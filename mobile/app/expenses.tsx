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
const BG = "#F8F5FF";

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥", AED: "د.إ",
};
const sym = (code?: string) => CURRENCY_SYMBOLS[code || "INR"] || "₹";

const CATEGORY_EMOJIS: Record<string, string> = {
  food: "🍽️", transport: "🚗", housing: "🏠", entertainment: "🎉",
  shopping: "🛒", travel: "✈️", health: "💊", utilities: "🔧", other: "💡",
};

// ── Types ─────────────────────────────────────────────────────────────────────

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
  net: number; // positive = I'm owed, negative = I owe
}

interface Stats {
  totalPaidByMe: number;
  totalMyShare: number;
  netBalance: number;
  count: number;
}

type FilterType = "all" | "i_paid" | "i_owe" | "i_am_owed";

// ── Date label helper ─────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────

export default function ExpensesScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  if (!user) return <Redirect href="/login" />;

  const insets = useSafeAreaInsets();
  const initial = user.name?.charAt(0).toUpperCase() || "?";
  const { colors, isDark } = useTheme();

  const [expenses, setExpenses] = useState<PersonalExpense[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [groupFilter, setGroupFilter] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  // ── Fetch ──
  const fetchExpenses = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await personalExpensesApi.getAll();
      setExpenses(res.data.expenses || []);
      setStats(res.data.stats || null);
    } catch {
      // keep existing
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchExpenses(); }, [fetchExpenses]));
  const onRefresh = () => { setRefreshing(true); fetchExpenses(true); };

  // ── Derived filter options ──
  const groups = useMemo(() => {
    const map = new Map<number, { id: number; name: string; emoji?: string }>();
    expenses.forEach((e) => { if (!map.has(e.group.id)) map.set(e.group.id, e.group); });
    return [...map.values()];
  }, [expenses]);

  const categories = useMemo(() => (
    [...new Set(expenses.map((e) => e.category || "other"))]
  ), [expenses]);

  // ── Filtered + grouped by date ──
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
      if (label !== currentLabel) {
        out.push({ label, items: [] });
        currentLabel = label;
      }
      out[out.length - 1].items.push(e);
    });
    return out;
  }, [filtered]);

  const activeFilters = (groupFilter !== null ? 1 : 0) + (categoryFilter !== null ? 1 : 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── HEADER ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.background }]}>
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
        {/* ── HERO STATS CARD ── */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>MY EXPENSES</Text>
          <Text style={styles.heroAmount}>
            {sym()}{(stats?.totalMyShare ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </Text>
          <Text style={styles.heroSubtitle}>my total share across all groups</Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>I PAID</Text>
              <Text style={styles.statValue}>
                {sym()}{(stats?.totalPaidByMe ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>NET BALANCE</Text>
              <Text style={[styles.statValue, {
                color: (stats?.netBalance ?? 0) >= 0 ? "#6ee7b7" : "#fda4af"
              }]}>
                {(stats?.netBalance ?? 0) >= 0 ? "+" : ""}
                {sym()}{Math.abs(stats?.netBalance ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>TOTAL BILLS</Text>
              <Text style={styles.statValue}>{stats?.count ?? 0}</Text>
            </View>
          </View>
        </View>

        {/* ── FILTER CHIPS ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 4 }}
          style={{ marginBottom: 10 }}
        >
          {(["all", "i_paid", "i_owe", "i_am_owed"] as FilterType[]).map((f) => {
            const labels: Record<FilterType, string> = {
              all: "All", i_paid: "I Paid", i_owe: "I Owe", i_am_owed: "Owed to Me",
            };
            const active = filter === f;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={[styles.chip, active && styles.chipActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{labels[f]}</Text>
              </TouchableOpacity>
            );
          })}

          {/* More filters toggle */}
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            style={[styles.chip, activeFilters > 0 && styles.chipActive]}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, activeFilters > 0 && styles.chipTextActive]}>
              ⚙ Filters{activeFilters > 0 ? ` (${activeFilters})` : ""}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* ── EXPANDABLE FILTER PANEL ── */}
        {showFilters && (
          <View style={styles.filterPanel}>
            {groups.length > 1 && (
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.filterSectionLabel}>GROUP</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  <TouchableOpacity
                    onPress={() => setGroupFilter(null)}
                    style={[styles.filterChip, groupFilter === null && styles.filterChipActive]}
                  >
                    <Text style={[styles.filterChipText, groupFilter === null && styles.filterChipTextActive]}>All</Text>
                  </TouchableOpacity>
                  {groups.map((g) => (
                    <TouchableOpacity
                      key={g.id}
                      onPress={() => setGroupFilter(groupFilter === g.id ? null : g.id)}
                      style={[styles.filterChip, groupFilter === g.id && styles.filterChipActive]}
                    >
                      <Text style={[styles.filterChipText, groupFilter === g.id && styles.filterChipTextActive]}>
                        {g.emoji} {g.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {categories.length > 1 && (
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.filterSectionLabel}>CATEGORY</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  <TouchableOpacity
                    onPress={() => setCategoryFilter(null)}
                    style={[styles.filterChip, categoryFilter === null && styles.filterChipActive]}
                  >
                    <Text style={[styles.filterChipText, categoryFilter === null && styles.filterChipTextActive]}>All</Text>
                  </TouchableOpacity>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                      style={[styles.filterChip, categoryFilter === cat && styles.filterChipActive]}
                    >
                      <Text style={[styles.filterChipText, categoryFilter === cat && styles.filterChipTextActive]}>
                        {CATEGORY_EMOJIS[cat] || "💡"} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {(groupFilter !== null || categoryFilter !== null) && (
              <TouchableOpacity
                onPress={() => { setGroupFilter(null); setCategoryFilter(null); }}
                style={styles.clearBtn}
              >
                <Text style={styles.clearBtnText}>✕ Clear filters</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── SEARCH BAR ── */}
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search expenses, groups..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 14, color: "#94a3b8" }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── LOADING ── */}
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={PURPLE} />
            <Text style={styles.loadingText}>Loading expenses...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🔍</Text>
            <Text style={styles.emptyTitle}>
              {expenses.length === 0 ? "No expenses yet" : "No matching expenses"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {expenses.length === 0
                ? "Add an expense inside any group to see it here"
                : "Try changing your search or filters"}
            </Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20 }}>
            {grouped.map(({ label, items }) => (
              <View key={label} style={{ marginBottom: 20 }}>
                <Text style={styles.sectionLabel}>{label.toUpperCase()}</Text>
                <View style={styles.expenseCard}>
                  {items.map((expense, idx) => {
                    const s = sym(expense.group.currency);
                    const net = expense.net;
                    const catEmoji = CATEGORY_EMOJIS[expense.category || "other"] || "💡";

                    return (
                      <TouchableOpacity
                        key={expense.id}
                        style={[
                          styles.expenseRow,
                          idx === items.length - 1 && { borderBottomWidth: 0 },
                        ]}
                        onPress={() => router.push(`/${expense.group.id}/edit-expense?expenseId=${expense.id}` as any)}
                        activeOpacity={0.7}
                      >
                        {/* Category icon */}
                        <View style={styles.catIcon}>
                          <Text style={{ fontSize: 22 }}>{catEmoji}</Text>
                        </View>

                        {/* Info */}
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.expenseDesc} numberOfLines={1}>{expense.description}</Text>
                          <Text style={styles.expenseMeta} numberOfLines={1}>
                            {expense.group.emoji || "💰"} {expense.group.name}
                            {"  ·  "}
                            {expense.iPaid ? "You paid" : `${expense.paidBy.name} paid`}
                          </Text>
                          {!!expense.notes && (
                            <Text style={styles.expenseNotes} numberOfLines={1}>{expense.notes}</Text>
                          )}
                        </View>

                        {/* Amounts */}
                        <View style={{ alignItems: "flex-end", flexShrink: 0 }}>
                          <Text style={styles.expenseTotal}>
                            {s}{expense.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                          </Text>
                          <View style={[
                            styles.netBadge,
                            { backgroundColor: net > 0 ? "#dcfce7" : net < 0 ? "#fff1f2" : "#f1f5f9" }
                          ]}>
                            <Text style={[
                              styles.netBadgeText,
                              { color: net > 0 ? "#166534" : net < 0 ? "#e11d48" : "#64748b" }
                            ]}>
                              {net > 0
                                ? `+${s}${net.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
                                : net < 0
                                ? `-${s}${Math.abs(net).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
                                : "settled"}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}

            <Text style={styles.footerCount}>
              Showing {filtered.length} of {expenses.length} expenses
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── BOTTOM NAV ── */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom + 4 }]}>
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
            <Text style={[styles.tabLabel, { color: tab.active ? PURPLE : "#94a3b8", fontWeight: tab.active ? "700" : "500" }]}>
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
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: BG,
  },
  headerAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: PURPLE, alignItems: "center", justifyContent: "center",
  },
  headerBrand: { fontSize: 20, fontWeight: "900", color: PURPLE, letterSpacing: -0.3 },
  headerIconBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },

  heroCard: {
    marginHorizontal: 20, marginBottom: 16, borderRadius: 22,
    backgroundColor: PURPLE, padding: 22,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  heroLabel: { fontSize: 11, fontWeight: "700", color: "#a5b4fc", letterSpacing: 1, marginBottom: 6 },
  heroAmount: { fontSize: 38, fontWeight: "900", color: "#fff", letterSpacing: -1, marginBottom: 2 },
  heroSubtitle: { fontSize: 13, color: "#a5b4fc", marginBottom: 18 },
  statsRow: { flexDirection: "row", gap: 10 },
  statBox: {
    flex: 1, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 14,
    padding: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
  },
  statLabel: { fontSize: 9, fontWeight: "700", color: "#a5b4fc", letterSpacing: 0.5, marginBottom: 4 },
  statValue: { fontSize: 17, fontWeight: "900", color: "#fff" },

  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.5, borderColor: "#e2e8f0", backgroundColor: "#fff",
  },
  chipActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  chipText: { fontSize: 12, fontWeight: "700", color: "#64748b" },
  chipTextActive: { color: "#fff" },

  filterPanel: {
    marginHorizontal: 20, marginBottom: 12, backgroundColor: "#fff",
    borderRadius: 18, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    borderWidth: 1, borderColor: PURPLE_LIGHT,
  },
  filterSectionLabel: {
    fontSize: 10, fontWeight: "700", color: "#94a3b8",
    letterSpacing: 0.8, marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1.5, borderColor: "#e2e8f0", backgroundColor: "#fff",
  },
  filterChipActive: { backgroundColor: PURPLE_LIGHT, borderColor: PURPLE },
  filterChipText: { fontSize: 12, fontWeight: "600", color: "#64748b" },
  filterChipTextActive: { color: PURPLE },
  clearBtn: {
    alignSelf: "flex-start", backgroundColor: "#fff1f2",
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
  },
  clearBtnText: { fontSize: 12, fontWeight: "700", color: "#e11d48" },

  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: "#fff", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 14, color: "#0f172a", padding: 0 },

  sectionLabel: {
    fontSize: 11, fontWeight: "700", color: "#94a3b8",
    letterSpacing: 1, marginBottom: 10,
  },

  expenseCard: {
    backgroundColor: "#fff", borderRadius: 18, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  expenseRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#F3F0FF",
  },
  catIcon: {
    width: 46, height: 46, borderRadius: 14, backgroundColor: PURPLE_LIGHT,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  expenseDesc: { fontSize: 14, fontWeight: "700", color: "#0f172a", marginBottom: 3 },
  expenseMeta: { fontSize: 12, color: "#64748b" },
  expenseNotes: { fontSize: 11, color: "#94a3b8", fontStyle: "italic", marginTop: 2 },
  expenseTotal: { fontSize: 15, fontWeight: "900", color: "#0f172a", marginBottom: 4 },
  netBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  netBadgeText: { fontSize: 11, fontWeight: "700" },

  centerState: { alignItems: "center", paddingTop: 80, gap: 12 },
  loadingText: { fontSize: 14, color: "#94a3b8" },
  emptyState: { alignItems: "center", paddingTop: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a", marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: "#94a3b8", textAlign: "center", lineHeight: 20 },

  footerCount: { textAlign: "center", fontSize: 12, color: "#94a3b8", paddingBottom: 8, marginTop: 4 },

  tabBar: {
    flexDirection: "row", backgroundColor: "#fff",
    borderTopWidth: 1, borderTopColor: "#F3F0FF", paddingTop: 8,
  },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center", position: "relative" },
  tabLabel: { fontSize: 9, letterSpacing: 0.2 },
  tabActiveBar: {
    position: "absolute", top: -8, left: "20%", right: "20%",
    height: 3, backgroundColor: PURPLE, borderRadius: 2,
  },
});
