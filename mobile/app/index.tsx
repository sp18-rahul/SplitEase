import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Redirect, useRouter, useFocusEffect } from "expo-router";
import { groups } from "@/api/client";
import { useAuth } from "@/context/auth";
import { useTheme } from "@/context/theme";

const PURPLE = "#7C3AED";
const PURPLE_LIGHT = "#EDE9FE";
const BG = "#F8F5FF";

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥", AED: "د.إ",
};

const AVATAR_COLORS = [PURPLE, "#10B981", "#F59E0B", "#3B82F6", "#EF4444", "#8B5CF6", "#EC4899"];

interface Group {
  id: number;
  name: string;
  currency?: string;
  emoji?: string;
  members: Array<{ userId: number; user: { id: number; name: string } }>;
  expenses: Array<{ amount: number; paidById: number; splits: { userId: number; amount: number }[] }>;
  settlements?: Array<{ fromUserId: number; toUserId: number; amount: number }>;
}

type FilterTab = "all" | "active" | "settled";

// ── Avatar Stack ──────────────────────────────────────────────────────────────
function AvatarStack({ members, purpleLight }: { members: Array<{ user: { name: string } }>; purpleLight: string }) {
  const shown = members.slice(0, 3);
  const extra = members.length - 3;
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {shown.map((m, i) => (
        <View
          key={i}
          style={{
            width: 28, height: 28, borderRadius: 14,
            backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
            borderWidth: 2, borderColor: "white",
            alignItems: "center", justifyContent: "center",
            marginLeft: i === 0 ? 0 : -8,
            zIndex: shown.length - i,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: "900", color: "white" }}>
            {m.user.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      ))}
      {extra > 0 && (
        <View style={{
          width: 28, height: 28, borderRadius: 14,
          backgroundColor: purpleLight, borderWidth: 2, borderColor: "white",
          alignItems: "center", justifyContent: "center", marginLeft: -8,
        }}>
          <Text style={{ fontSize: 10, fontWeight: "700", color: PURPLE }}>+{extra}</Text>
        </View>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  if (!user) return <Redirect href="/login" />;

  const insets = useSafeAreaInsets();
  const currentUserId = user.userId;

  const [groupsList, setGroupsList] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  const fetchGroups = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await groups.getAll();
      setGroupsList(Array.isArray(res.data) ? res.data : []);
    } catch {
      setGroupsList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchGroups(); }, [fetchGroups]));

  const getBalance = (g: Group) => {
    const expenses = g.expenses || [];
    let paid = expenses.reduce((s, e) => s + (e.paidById === currentUserId ? e.amount : 0), 0);
    let owes = expenses.reduce((s, e) => {
      const sp = e.splits?.find(x => x.userId === currentUserId);
      return s + (sp ? sp.amount : 0);
    }, 0);
    (g.settlements || []).forEach(s => {
      if (s.fromUserId === currentUserId) paid += s.amount;
      if (s.toUserId === currentUserId) owes += s.amount;
    });
    return paid - owes;
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  const filteredGroups = groupsList.filter(g => {
    if (activeFilter === "all") return true;
    const bal = getBalance(g);
    if (activeFilter === "active") return Math.abs(bal) > 0.01;
    if (activeFilter === "settled") return Math.abs(bal) <= 0.01;
    return true;
  });

  const maxSpend = Math.max(...groupsList.map(g => g.expenses.reduce((s, e) => s + e.amount, 0)), 1);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── HEADER ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity onPress={() => router.push("/profile")} style={styles.headerAvatar}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "white" }}>
              {user.name?.charAt(0).toUpperCase() || "?"}
            </Text>
          </TouchableOpacity>
          <Text style={styles.headerBrand}>SplitEase</Text>
        </View>
        <TouchableOpacity style={styles.headerIconBtn} onPress={handleLogout}>
          <Text style={{ fontSize: 16 }}>🚪</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchGroups(true); }} tintColor={PURPLE} />
        }
      >
        {/* ── PAGE HEADER ── */}
        <View style={styles.pageHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pageTitle, { color: colors.text }]}>My Groups</Text>
            <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>Track and split expenses with your favorite circles.</Text>
          </View>
          <TouchableOpacity style={styles.createBtn} onPress={() => router.push("/new-group")}>
            <Text style={styles.createBtnText}>＋ Create</Text>
          </TouchableOpacity>
        </View>

        {/* ── FILTER TABS ── */}
        <View style={styles.filterRow}>
          {(["all", "active", "settled"] as FilterTab[]).map(f => (
            <TouchableOpacity
              key={f}
              onPress={() => setActiveFilter(f)}
              style={[styles.filterBtn, activeFilter === f && styles.filterBtnActive, !( activeFilter === f) && { backgroundColor: colors.surface, borderColor: colors.border }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterBtnText, { color: colors.text }, activeFilter === f && styles.filterBtnTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          {filteredGroups.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.border }]}>
                <Text style={{ fontSize: 28 }}>👥</Text>
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {groupsList.length === 0 ? "No groups yet" : "No groups match filter"}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {groupsList.length === 0
                  ? "Create a group to start splitting expenses."
                  : "Try a different filter."}
              </Text>
              {groupsList.length === 0 && (
                <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push("/new-group")}>
                  <Text style={styles.emptyBtnText}>＋ Create a Group</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <>
              {filteredGroups.map(group => {
                const totalSpend = group.expenses.reduce((s, e) => s + e.amount, 0);
                const balance = getBalance(group);
                const isOwed = balance > 0.01;
                const isOwing = balance < -0.01;
                const isSettled = !isOwed && !isOwing;
                const progressPct = Math.min((totalSpend / maxSpend) * 100, 100);
                const currency = CURRENCY_SYMBOLS[group.currency || "INR"] || "₹";
                const barColor = isSettled ? "#D1D5DB" : isOwed ? PURPLE : "#D97706";

                return (
                  <TouchableOpacity
                    key={group.id}
                    style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => router.push(`/${group.id}`)}
                    activeOpacity={0.85}
                  >
                    {/* Top row: emoji + name + members */}
                    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
                      <View style={[
                        styles.groupIcon,
                        { backgroundColor: isSettled ? colors.card : colors.purpleLight, borderColor: isSettled ? colors.border : colors.purpleLight }
                      ]}>
                        <Text style={{ fontSize: group.emoji ? 22 : 18 }}>
                          {group.emoji || "👥"}
                        </Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={[styles.groupName, { color: colors.text }]} numberOfLines={1}>{group.name}</Text>
                          {isSettled && <Text style={{ fontSize: 14 }}>✅</Text>}
                        </View>
                        <Text style={[styles.groupMembers, { color: colors.textSecondary }]}>👥 {group.members.length} members</Text>
                      </View>
                    </View>

                    {/* Total spent + progress bar */}
                    <View style={{ marginBottom: 14 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                        <Text style={[styles.spendLabel, { color: colors.textSecondary }]}>Total Spent</Text>
                        <Text style={[styles.spendAmount, { color: colors.text }]}>
                          {currency}{totalSpend.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                      </View>
                      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                        <View style={[styles.progressBar, { width: `${progressPct}%` as any, backgroundColor: barColor }]} />
                      </View>
                    </View>

                    {/* Bottom: avatar stack + balance */}
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <AvatarStack members={group.members} purpleLight={colors.purpleLight} />
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={[styles.balanceTag, { color: colors.textSecondary }]}>
                          {isOwed ? "YOU ARE OWED" : isOwing ? "YOU OWE" : "SETTLED"}
                        </Text>
                        <Text style={[styles.balanceAmount, {
                          color: isOwed ? PURPLE : isOwing ? "#E11D48" : colors.textSecondary
                        }]}>
                          {currency}{Math.abs(balance).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Dashed "Create New Group" card */}
              <TouchableOpacity style={styles.dashedCard} onPress={() => router.push("/new-group")} activeOpacity={0.8}>
                <View style={[styles.dashedIconCircle, { backgroundColor: colors.purpleLight }]}>
                  <Text style={{ fontSize: 22, color: PURPLE }}>＋</Text>
                </View>
                <Text style={[styles.dashedTitle, { color: colors.text }]}>Start a New Group</Text>
                <Text style={[styles.dashedSubtitle, { color: colors.textSecondary }]}>Perfect for roommates or travel.</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

      {/* ── FAB ── */}
      {groupsList.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 76 }]}
          onPress={() => {
            if (groupsList.length === 1) {
              router.push(`/${groupsList[0].id}/add-expense`);
            } else {
              Alert.alert("Select Group", "Which group?", [
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
      <View style={[styles.tabBar, { paddingBottom: insets.bottom + 4, backgroundColor: colors.surface, borderTopColor: colors.border }]}>
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
    borderWidth: 1.5, borderColor: PURPLE_LIGHT,
  },

  pageHeader: {
    flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 14,
  },
  pageTitle: { fontSize: 28, fontWeight: "900", color: "#1D1A24", letterSpacing: -0.5, marginBottom: 4 },
  pageSubtitle: { fontSize: 13, color: "#7B7487" },
  createBtn: {
    backgroundColor: PURPLE, borderRadius: 999,
    paddingHorizontal: 16, paddingVertical: 10, alignSelf: "flex-start", marginTop: 4,
  },
  createBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 16 },
  filterBtn: {
    borderRadius: 999, paddingHorizontal: 18, paddingVertical: 8,
    borderWidth: 1, borderColor: "#E4D9F7", backgroundColor: "white",
  },
  filterBtnActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  filterBtnText: { fontSize: 13, fontWeight: "600", color: "#4A4455" },
  filterBtnTextActive: { color: "white", fontWeight: "700" },

  groupCard: {
    backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: "#F0EEFF",
    padding: 18, marginBottom: 14,
  },
  groupIcon: {
    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
    borderWidth: 1, alignItems: "center", justifyContent: "center",
  },
  groupName: { fontSize: 18, fontWeight: "900", color: "#1D1A24", marginBottom: 4 },
  groupMembers: { fontSize: 12, color: "#9CA3AF" },

  spendLabel: { fontSize: 12, color: "#9CA3AF", fontWeight: "500" },
  spendAmount: { fontSize: 20, fontWeight: "900", color: "#1D1A24", letterSpacing: -0.5 },
  progressTrack: { backgroundColor: "#F0EEFF", borderRadius: 999, height: 7 },
  progressBar: { height: 7, borderRadius: 999 },

  balanceTag: { fontSize: 10, fontWeight: "700", color: "#9CA3AF", letterSpacing: 0.5, marginBottom: 2 },
  balanceAmount: { fontSize: 16, fontWeight: "900", letterSpacing: -0.3 },

  emptyCard: {
    backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: "#F0EEFF",
    padding: 48, alignItems: "center", marginBottom: 16,
  },
  emptyIconCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: "#F0EEFF",
    alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: "#1D1A24", marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: "#7B7487", textAlign: "center", marginBottom: 20 },
  emptyBtn: {
    backgroundColor: PURPLE, borderRadius: 999, paddingHorizontal: 24, paddingVertical: 11,
    flexDirection: "row", alignItems: "center", gap: 6,
  },
  emptyBtnText: { color: "white", fontWeight: "700", fontSize: 14 },

  dashedCard: {
    borderWidth: 2, borderColor: "#D8CAFD", borderStyle: "dashed",
    borderRadius: 18, padding: 32, alignItems: "center", marginBottom: 16,
  },
  dashedIconCircle: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: PURPLE_LIGHT,
    alignItems: "center", justifyContent: "center", marginBottom: 14,
  },
  dashedTitle: { fontSize: 14, fontWeight: "700", color: "#1D1A24", marginBottom: 6 },
  dashedSubtitle: { fontSize: 12, color: "#9CA3AF" },

  fab: {
    position: "absolute", right: 20, width: 56, height: 56, borderRadius: 28,
    backgroundColor: PURPLE, alignItems: "center", justifyContent: "center",
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45, shadowRadius: 14, elevation: 10,
  },

  tabBar: {
    flexDirection: "row", backgroundColor: "#fff",
    borderTopWidth: 1, borderTopColor: "#F0EEFF", paddingTop: 10,
  },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 4, position: "relative" },
  tabLabel: { fontSize: 9, letterSpacing: 0.2, textTransform: "uppercase", marginTop: 1 },
  tabActiveIndicator: {
    position: "absolute", top: 0, left: "25%", right: "25%",
    height: 2, backgroundColor: PURPLE, borderBottomLeftRadius: 2, borderBottomRightRadius: 2,
  },
});
