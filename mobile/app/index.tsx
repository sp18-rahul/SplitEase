import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Redirect, useRouter, useFocusEffect } from "expo-router";
import { groups } from "@/api/client";
import { useAuth } from "@/context/auth";
import { useTheme } from "@/context/theme";
import { useResponsive } from "@/utils/responsive";

const PURPLE = "#7C3AED";
const PURPLE_LIGHT = "#EDE9FE";
const BG = "#F8F5FF";

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥", AED: "د.إ",
};

const AVATAR_COLORS = [PURPLE, "#A78BFA", "#6D28D9", "#8B5CF6", "#C4B5FD"];

interface Group {
  id: number;
  name: string;
  currency?: string;
  emoji?: string;
  members: Array<{ userId: number; user: { id: number; name: string } }>;
  expenses: Array<{ amount: number; paidById: number; splits: { userId: number; amount: number }[] }>;
  settlements?: Array<{ fromUserId: number; toUserId: number; amount: number }>;
}

// ── AVATAR STACK ──────────────────────────────────────────────────────────────
function AvatarStack({ members, size = 26 }: { members: Array<{ user: { name: string } }>, size?: number }) {
  const shown = members.slice(0, 3);
  const extra = members.length - 3;
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {shown.map((m, i) => (
        <View
          key={i}
          style={{
            width: size, height: size, borderRadius: size / 2,
            backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
            borderWidth: 1.5, borderColor: "white",
            alignItems: "center", justifyContent: "center",
            marginLeft: i === 0 ? 0 : -(size * 0.3),
            zIndex: shown.length - i,
          }}
        >
          <Text style={{ fontSize: size * 0.42, fontWeight: "700", color: "white" }}>
            {m.user.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      ))}
      {extra > 0 && (
        <View style={{
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: PURPLE_LIGHT, borderWidth: 1.5, borderColor: "white",
          alignItems: "center", justifyContent: "center",
          marginLeft: -(size * 0.3),
        }}>
          <Text style={{ fontSize: size * 0.38, fontWeight: "700", color: PURPLE }}>+{extra}</Text>
        </View>
      )}
    </View>
  );
}

// ── GROUP CARD ────────────────────────────────────────────────────────────────
function GroupCard({
  item, onPress, currentUserId, colors, isDark,
}: { item: Group; onPress: () => void; currentUserId: number; colors: any; isDark: boolean }) {
  const sym = CURRENCY_SYMBOLS[item.currency || "INR"] || "₹";
  const expenses = item.expenses || [];
  let totalPaid = expenses.reduce((s, e) => s + (e.paidById === currentUserId ? e.amount : 0), 0);
  let totalOwes = expenses.reduce((s, e) => {
    const split = e.splits?.find(sp => sp.userId === currentUserId);
    return s + (split ? split.amount : 0);
  }, 0);
  // Apply settlements so balance reflects what has actually been paid
  (item.settlements || []).forEach(s => {
    if (s.fromUserId === currentUserId) totalPaid += s.amount;
    if (s.toUserId === currentUserId) totalOwes += s.amount;
  });
  const balance = totalPaid - totalOwes;
  const isOwed = balance > 0;
  const isOwes = balance < 0;

  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: colors.surface, borderColor: isDark ? colors.border : "#F3F0FF" }]} onPress={onPress} activeOpacity={0.85}>
      {/* Icon */}
      <View style={styles.cardIcon}>
        <Text style={{ fontSize: item.emoji ? 22 : 18, fontWeight: "700", color: PURPLE }}>
          {item.emoji || item.name.charAt(0).toUpperCase()}
        </Text>
      </View>

      {/* Info */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
          <AvatarStack members={item.members} size={22} />
          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
            {item.members.length} member{item.members.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {/* Balance */}
      <View style={{ alignItems: "flex-end" }}>
        <Text style={[styles.cardBalance, { color: isOwed ? PURPLE : isOwes ? "#dc2626" : "#94a3b8" }]}>
          {isOwes ? "-" : "+"}{sym}{Math.abs(balance).toFixed(0)}
        </Text>
        <Text style={[styles.cardBalanceLbl, { color: isOwed ? PURPLE : isOwes ? "#dc2626" : "#94a3b8" }]}>
          {isOwed ? "owed" : isOwes ? "owes" : "settled"}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  if (!user) return <Redirect href="/login" />;

  const r = useResponsive();
  const insets = useSafeAreaInsets();
  const currentUserId = user.userId;
  const { colors, isDark } = useTheme();

  const [groupsList, setGroupsList] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchGroups = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await groups.getAll();
      setGroupsList(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Error fetching groups:", error);
      // Still show empty list, don't crash
      setGroupsList([]);
    }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { fetchGroups(); }, [fetchGroups]));

  // Compute totals — include settlements so paid debts don't keep showing
  const getGroupBalance = (g: Group) => {
    const expenses = g.expenses || [];
    let paid = expenses.reduce((s, e) => s + (e.paidById === currentUserId ? e.amount : 0), 0);
    let owes = expenses.reduce((s, e) => { const sp = e.splits?.find(x => x.userId === currentUserId); return s + (sp ? sp.amount : 0); }, 0);
    (g.settlements || []).forEach(s => {
      if (s.fromUserId === currentUserId) paid += s.amount;
      if (s.toUserId === currentUserId) owes += s.amount;
    });
    return paid - owes;
  };

  const youOwe = groupsList.reduce((sum, g) => {
    const bal = getGroupBalance(g);
    return sum + Math.max(0, -bal);
  }, 0);

  const owedToYou = groupsList.reduce((sum, g) => {
    const bal = getGroupBalance(g);
    return sum + Math.max(0, bal);
  }, 0);

  const totalBalance = owedToYou - youOwe;
  const isPositive = totalBalance >= 0;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── HEADER ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.background }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity
            onPress={() => router.push("/profile")}
            style={styles.headerAvatar}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: "white" }}>
              {user.name?.charAt(0).toUpperCase() || "?"}
            </Text>
          </TouchableOpacity>
          <Text style={styles.headerBrand}>SplitEase</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            onPress={handleLogout}
            style={[styles.headerIconBtn, { backgroundColor: colors.surface }]}
          >
            <Text style={{ fontSize: 16 }}>🚪</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchGroups(true); }} tintColor={PURPLE} />
        }
      >
        {/* ── BALANCE CARD ── */}
        {groupsList.length > 0 && (
          <View style={[styles.balanceCard, { margin: 16, backgroundColor: PURPLE_LIGHT }]}>
            <Text style={styles.balanceLabel}>Total Balance</Text>
            <Text style={[styles.balanceAmount, { color: isDark ? PURPLE : "#1a0533" }]}>
              ₹{Math.abs(totalBalance).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </Text>
            <Text style={[styles.balanceSubtitle, { color: isPositive ? "#16a34a" : "#dc2626" }]}>
              {isPositive ? "↑" : "↓"} {isPositive
                ? `You are owed ₹${owedToYou.toFixed(0)}`
                : `You owe ₹${youOwe.toFixed(0)}`}
            </Text>

            <View style={styles.balanceStatsRow}>
              <View style={styles.balanceStat}>
                <Text style={styles.balanceStatLabel}>You Owe</Text>
                <Text style={[styles.balanceStatValue, { color: "#dc2626" }]}>
                  ₹{youOwe.toFixed(0)}
                </Text>
              </View>
              <View style={[styles.balanceStat, { borderLeftWidth: 1, borderLeftColor: "#EDE9FE" }]}>
                <Text style={styles.balanceStatLabel}>Owed to You</Text>
                <Text style={[styles.balanceStatValue, { color: PURPLE }]}>
                  ₹{owedToYou.toFixed(0)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── ACTIVE GROUPS ── */}
        <View style={{ paddingHorizontal: 16 }}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Groups</Text>
            <TouchableOpacity onPress={() => router.push("/new-group")}>
              <Text style={styles.sectionLink}>VIEW ALL</Text>
            </TouchableOpacity>
          </View>

          {groupsList.length === 0 ? (
            <View style={styles.empty}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🤝</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No groups yet</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Create a group to start splitting expenses</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push("/new-group")}>
                <Text style={styles.emptyBtnText}>+ Create Group</Text>
              </TouchableOpacity>
            </View>
          ) : (
            groupsList.map(item => (
              <GroupCard
                key={item.id}
                item={item}
                currentUserId={currentUserId}
                onPress={() => router.push(`/${item.id}`)}
                colors={colors}
                isDark={isDark}
              />
            ))
          )}

          {/* New group dashed CTA */}
          {groupsList.length > 0 && (
            <TouchableOpacity style={[styles.newGroupBtn, { backgroundColor: colors.surface, borderColor: isDark ? colors.border : "#DDD6FE" }]} onPress={() => router.push("/new-group")}>
              <Text style={{ color: PURPLE, fontWeight: "700", fontSize: 14 }}>+ Create New Group</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* ── FAB ── Quick Add Expense ── */}
      {groupsList.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 76 }]}
          onPress={() => {
            if (groupsList.length === 1) {
              router.push(`/${groupsList[0].id}/add-expense`);
            } else {
              Alert.alert("Select Group", "Which group do you want to add an expense to?", [
                ...groupsList.map(g => ({
                  text: g.name,
                  onPress: () => router.push(`/${g.id}/add-expense`),
                })),
                { text: "Cancel", style: "cancel" },
              ]);
            }
          }}
          activeOpacity={0.85}
        >
          <Text style={{ fontSize: 26, color: "white", fontWeight: "300", lineHeight: 30 }}>＋</Text>
        </TouchableOpacity>
      )}

      {/* ── BOTTOM TAB BAR ── */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom + 4, backgroundColor: colors.surface, borderTopColor: isDark ? colors.border : "#F3F0FF" }]}>
        {[
          { label: "GROUPS", emoji: "👥", active: true, onPress: undefined },
          { label: "EXPENSES", emoji: "🧾", active: false, onPress: () => router.push("/expenses") },
          { label: "FRIENDS", emoji: "🤝", active: false, onPress: () => router.push("/friends") },
          { label: "ACTIVITY", emoji: "🔔", active: false, onPress: () => router.push("/activity") },
          { label: "ACCOUNT", emoji: "👤", active: false, onPress: () => router.push("/profile") },
        ].map(tab => (
          <TouchableOpacity
            key={tab.label}
            style={styles.tabItem}
            onPress={tab.onPress}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 18, marginBottom: 1 }}>{tab.emoji}</Text>
            <Text style={[styles.tabLabel, { color: tab.active ? PURPLE : colors.textSecondary, fontWeight: tab.active ? "700" : "500" }]}>
              {tab.label}
            </Text>
            {tab.active && <View style={styles.tabActiveIndicator} />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12,
  },
  headerAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: PURPLE, alignItems: "center", justifyContent: "center",
  },
  headerBrand: { fontSize: 20, fontWeight: "900", color: PURPLE, letterSpacing: -0.3 },
  headerIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },

  // Balance Card
  balanceCard: {
    backgroundColor: PURPLE_LIGHT, borderRadius: 20, padding: 20,
  },
  balanceLabel: {
    fontSize: 11, fontWeight: "700", color: PURPLE,
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6,
  },
  balanceAmount: {
    fontSize: 38, fontWeight: "900", color: "#1a0533", letterSpacing: -1, marginBottom: 4,
  },
  balanceSubtitle: {
    fontSize: 13, fontWeight: "600", marginBottom: 16,
  },
  balanceStatsRow: {
    flexDirection: "row", backgroundColor: "white", borderRadius: 12, overflow: "hidden",
  },
  balanceStat: {
    flex: 1, paddingVertical: 12, paddingHorizontal: 14,
  },
  balanceStatLabel: {
    fontSize: 10, fontWeight: "600", color: "#94a3b8",
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4,
  },
  balanceStatValue: {
    fontSize: 18, fontWeight: "800",
  },

  // Section
  sectionHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: "800" },
  sectionLink: { fontSize: 12, fontWeight: "700", color: PURPLE, letterSpacing: 0.5 },

  // Group Card
  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 16, padding: 14,
    marginBottom: 10,
    shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    borderWidth: 1,
  },
  cardIcon: {
    width: 46, height: 46, borderRadius: 14, backgroundColor: PURPLE_LIGHT,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  cardName: { fontSize: 15, fontWeight: "700" },
  cardSub: { fontSize: 12, fontWeight: "500" },
  cardBalance: { fontSize: 15, fontWeight: "800" },
  cardBalanceLbl: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3, marginTop: 1 },

  // New Group CTA
  newGroupBtn: {
    alignItems: "center", justifyContent: "center", padding: 14,
    borderRadius: 16, borderWidth: 2, borderColor: "#DDD6FE",
    borderStyle: "dashed", marginBottom: 16, backgroundColor: "white",
  },

  // Empty state
  empty: {
    alignItems: "center", paddingVertical: 48, paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 20, fontWeight: "800", marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: "center", marginBottom: 24, lineHeight: 20 },
  emptyBtn: {
    backgroundColor: PURPLE, paddingHorizontal: 24, paddingVertical: 13,
    borderRadius: 14,
  },
  emptyBtnText: { color: "white", fontWeight: "700", fontSize: 15 },

  // FAB
  fab: {
    position: "absolute", right: 20, width: 56, height: 56, borderRadius: 28,
    backgroundColor: PURPLE, alignItems: "center", justifyContent: "center",
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45, shadowRadius: 14, elevation: 10,
  },

  // Bottom Tab Bar
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: 10,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 8,
  },
  tabItem: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingVertical: 4, position: "relative",
  },
  tabLabel: { fontSize: 9, letterSpacing: 0.2, textTransform: "uppercase", marginTop: 1 },
  tabActiveIndicator: {
    position: "absolute", top: 0, left: "25%", right: "25%",
    height: 2, backgroundColor: PURPLE, borderBottomLeftRadius: 2, borderBottomRightRadius: 2,
  },
});
