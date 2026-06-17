import React, { useState, useCallback, useMemo } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, RefreshControl, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Redirect, useRouter, useFocusEffect } from "expo-router";
import { useAuth } from "@/context/auth";
import { useTheme } from "@/context/theme";
import { groups as groupsApi, activityApi } from "@/api/client";

const PURPLE = "#7C3AED";
const PURPLE_LIGHT = "#EDE9FE";
const BG = "#F8F5FF";

const AVATAR_COLORS = [PURPLE, "#10B981", "#F59E0B", "#3B82F6", "#EF4444", "#8B5CF6", "#EC4899"];

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥", AED: "د.إ",
};
const sym = (code?: string) => CURRENCY_SYMBOLS[code || "INR"] || "₹";

interface ActivityItem {
  id: string;
  type: "expense" | "settlement";
  title: string;
  subtitle: string;
  amount: number;
  actor: { id: number; name: string };
  createdAt: string;
  groupId: number;
  groupName: string;
  groupCurrency: string;
}

type FilterTab = "all" | "expenses" | "settlements";

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return `Yesterday, ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function getAvatarColor(id: number): string {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

export default function ActivityScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  if (!user) return <Redirect href="/login" />;

  const insets = useSafeAreaInsets();
  const initial = user.name?.charAt(0).toUpperCase() || "?";

  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  const fetchActivity = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const groupsRes = await groupsApi.getAll();
      const allGroups: any[] = Array.isArray(groupsRes.data) ? groupsRes.data : [];

      const activityResults = await Promise.all(
        allGroups.map(async (g) => {
          try {
            const res = await activityApi.getByGroup(g.id);
            return (Array.isArray(res.data) ? res.data : []).map((item: any) => ({
              ...item, groupId: g.id, groupName: g.name || "Group", groupCurrency: g.currency || "INR",
            }));
          } catch { return []; }
        })
      );

      const merged: ActivityItem[] = (activityResults.flat() as ActivityItem[]).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setItems(merged);
    } catch { /* keep existing */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { fetchActivity(); }, [fetchActivity]));
  const onRefresh = () => { setRefreshing(true); fetchActivity(true); };

  const filtered = useMemo(() =>
    items.filter(item => {
      if (search && !item.title.toLowerCase().includes(search.toLowerCase()) &&
          !item.actor.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter === "expenses" && item.type !== "expense") return false;
      if (filter === "settlements" && item.type !== "settlement") return false;
      return true;
    }),
    [items, filter, search]
  );

  // Date grouping (web-style: TODAY / YESTERDAY / LAST WEEK / month)
  const grouped = useMemo(() => {
    const sections: { label: string; items: ActivityItem[] }[] = [];
    let cur = "";
    filtered.forEach(item => {
      const d = new Date(item.createdAt);
      const now = new Date();
      const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
      const label =
        diff === 0 ? "TODAY" :
        diff === 1 ? "YESTERDAY" :
        diff < 7 ? "LAST WEEK" :
        d.getFullYear() === now.getFullYear()
          ? d.toLocaleDateString("en-IN", { month: "long" }).toUpperCase()
          : d.toLocaleDateString("en-IN", { month: "long", year: "numeric" }).toUpperCase();
      if (label !== cur) { sections.push({ label, items: [] }); cur = label; }
      sections[sections.length - 1].items.push(item);
    });
    return sections;
  }, [filtered]);

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
        {/* ── PAGE HEADER + FILTER TABS ── */}
        <View style={styles.pageHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pageTitle, { color: colors.text }]}>Activity</Text>
            <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>Track your recent shared expenses and settlements</Text>
          </View>
          {/* Filter tabs pill (web-style) */}
          <View style={[styles.filterPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {(["all", "expenses", "settlements"] as FilterTab[]).map(key => (
              <TouchableOpacity
                key={key}
                onPress={() => setFilter(key)}
                style={[styles.pillBtn, filter === key && styles.pillBtnActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.pillBtnText, { color: colors.text }, filter === key && styles.pillBtnTextActive]}>
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── SEARCH ── */}
        <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search activity..."
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
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading activity...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.border }]}>
              <Text style={{ fontSize: 26 }}>🕐</Text>
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No activity yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {search ? "Try a different search term" : "Activity will appear here when expenses are added."}
            </Text>
          </View>
        ) : (
          <>
            {grouped.map(({ label, items: sectionItems }) => (
              <View key={label} style={{ paddingHorizontal: 16, marginBottom: 24 }}>
                {/* Date label */}
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{label}</Text>

                {/* White card with activity items */}
                <View style={[styles.activityCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {sectionItems.map((item, idx) => {
                    const s = sym(item.groupCurrency);
                    const isSettlement = item.type === "settlement";
                    const avatarColor = getAvatarColor(item.actor.id);
                    const badgeBg = isSettlement ? "#10B981" : PURPLE;
                    const amountColor = isSettlement ? "#10B981" : "#E11D48";
                    const amountPrefix = isSettlement ? "+" : "−";
                    const amountLabel = isSettlement ? "Received" : "Your share";

                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.activityItem,
                          { borderBottomColor: colors.border },
                          idx === sectionItems.length - 1 && { borderBottomWidth: 0 },
                        ]}
                        onPress={() => router.push(`/${item.groupId}` as any)}
                        activeOpacity={0.7}
                      >
                        {/* Circular avatar + badge dot (web-style) */}
                        <View style={{ position: "relative", flexShrink: 0 }}>
                          <View style={[styles.actorAvatar, { backgroundColor: avatarColor }]}>
                            <Text style={styles.actorAvatarText}>
                              {item.actor.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                            <Text style={{ fontSize: 9, color: "white", fontWeight: "700" }}>
                              {isSettlement ? "✓" : "📄"}
                            </Text>
                          </View>
                        </View>

                        {/* Description + time */}
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[styles.activityText, { color: colors.text }]} numberOfLines={2}>
                            <Text style={{ fontWeight: "700" }}>{item.actor.name}</Text>
                            {isSettlement
                              ? ` settled up for "${item.title}"`
                              : ` added "${item.title}" in ${item.groupName}`}
                          </Text>
                          <Text style={[styles.activityTime, { color: colors.textSecondary }]}>🕐 {timeAgo(item.createdAt)}</Text>
                        </View>

                        {/* Amount */}
                        <View style={{ alignItems: "flex-end", flexShrink: 0 }}>
                          <Text style={[styles.activityAmount, { color: amountColor }]}>
                            {amountPrefix} {s}{item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Text>
                          <Text style={[styles.activityAmountLabel, { color: colors.textSecondary }]}>{amountLabel}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}

            {/* End of recent updates (web-style dashed card) */}
            {!search && (
              <View style={[styles.endCard, { marginHorizontal: 16, marginBottom: 8, backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.endIconCircle, { backgroundColor: colors.card }]}>
                  <Text style={{ fontSize: 22 }}>🕐</Text>
                </View>
                <Text style={[styles.endTitle, { color: colors.text }]}>End of recent updates</Text>
                <Text style={[styles.endSubtitle, { color: colors.textSecondary }]}>
                  You have seen all activity from the past 7 days.
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
          { label: "EXPENSES", emoji: "🧾", active: false, route: "/expenses" },
          { label: "FRIENDS", emoji: "🤝", active: false, route: "/friends" },
          { label: "ACTIVITY", emoji: "🔔", active: true, route: "/activity" },
          { label: "ACCOUNT", emoji: "👤", active: false, route: "/profile" },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.label}
            style={styles.tabItem}
            onPress={() => { if (!tab.active) router.push(tab.route as any); }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 20, marginBottom: 2 }}>{tab.emoji}</Text>
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

  pageHeaderRow: {
    flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 14, gap: 12,
  },
  pageTitle: { fontSize: 28, fontWeight: "900", color: "#1D1A24", letterSpacing: -0.5, marginBottom: 4 },
  pageSubtitle: { fontSize: 12, color: "#7B7487" },

  filterPill: {
    flexDirection: "row", backgroundColor: "white", borderRadius: 999, padding: 4,
    borderWidth: 1, borderColor: "#F0EEFF", alignSelf: "flex-start", marginTop: 2,
  },
  pillBtn: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  pillBtnActive: { backgroundColor: PURPLE },
  pillBtnText: { fontSize: 11, fontWeight: "500", color: "#4A4455", whiteSpace: "nowrap" as any },
  pillBtnTextActive: { color: "white", fontWeight: "700" },

  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: "#F5F0FF", borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: "#EDE9FE",
  },
  searchIcon: { fontSize: 15 },
  searchInput: { flex: 1, fontSize: 14, color: "#1D1A24", padding: 0 },

  sectionLabel: {
    fontSize: 11, fontWeight: "800", color: "#9CA3AF",
    letterSpacing: 1.2, marginBottom: 10, marginLeft: 2,
  },

  activityCard: {
    backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: "#F0EEFF",
    overflow: "hidden",
  },
  activityItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#F5F0FF",
  },
  actorAvatar: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  actorAvatarText: { fontSize: 18, fontWeight: "900", color: "white" },
  badge: {
    position: "absolute", bottom: -1, right: -1,
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: "white",
    alignItems: "center", justifyContent: "center",
  },
  activityText: { fontSize: 13, color: "#1D1A24", marginBottom: 4, lineHeight: 18 },
  activityTime: { fontSize: 11, color: "#9CA3AF" },
  activityAmount: { fontSize: 17, fontWeight: "900", letterSpacing: -0.3, marginBottom: 2 },
  activityAmountLabel: { fontSize: 11, color: "#9CA3AF", fontWeight: "500" },

  centerState: { alignItems: "center", paddingTop: 80, gap: 12 },
  loadingText: { fontSize: 14, color: "#9CA3AF" },

  emptyCard: {
    marginHorizontal: 16, backgroundColor: "#fff", borderRadius: 18,
    borderWidth: 1, borderColor: "#F0EEFF", padding: 48, alignItems: "center",
  },
  emptyIconCircle: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: "#F0EEFF",
    alignItems: "center", justifyContent: "center", marginBottom: 14,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#1D1A24", marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: "#7B7487", textAlign: "center", lineHeight: 20 },

  endCard: {
    backgroundColor: "#fff", borderRadius: 18,
    borderWidth: 2, borderColor: "#E4D9F7", borderStyle: "dashed",
    padding: 32, alignItems: "center",
  },
  endIconCircle: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: "#F5F3FF",
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  endTitle: { fontSize: 16, fontWeight: "700", color: "#1D1A24", marginBottom: 8 },
  endSubtitle: { fontSize: 13, color: "#7B7487", textAlign: "center", maxWidth: 280 },

  tabBar: {
    flexDirection: "row", backgroundColor: "#fff",
    borderTopWidth: 1, borderTopColor: "#F0EEFF", paddingTop: 10,
  },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center", position: "relative" },
  tabLabel: { fontSize: 9, letterSpacing: 0.2 },
  tabActiveBar: {
    position: "absolute", top: -10, left: "25%", right: "25%",
    height: 3, backgroundColor: PURPLE, borderRadius: 2,
  },
});
