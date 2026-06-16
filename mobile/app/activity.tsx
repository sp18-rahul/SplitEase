import React, { useState, useCallback } from "react";
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

const AVATAR_COLORS = [PURPLE, "#A78BFA", "#6D28D9", "#8B5CF6", "#C4B5FD", "#10b981", "#f59e0b", "#e11d48"];

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥", AED: "د.إ",
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface ActivityItem {
  id: string;
  type: "expense" | "settlement";
  title: string;
  subtitle: string;
  amount: number;
  actor: { id: number; name: string };
  createdAt: string;
  groupName: string;
  groupCurrency: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatAmount(amount: number, currency: string): string {
  const sym = CURRENCY_SYMBOLS[currency] || "$";
  return `${sym}${Math.abs(amount).toFixed(2)}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ActivityScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  if (!user) return <Redirect href="/login" />;

  const insets = useSafeAreaInsets();
  const currentUserId = user.userId;
  const initial = user.name?.charAt(0).toUpperCase() || "?";
  const { colors, isDark } = useTheme();

  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  // ── Fetch all groups → fetch activity per group in parallel ──
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
              ...item,
              groupName: g.name || "Group",
              groupCurrency: g.currency || "INR",
            }));
          } catch {
            return [];
          }
        })
      );

      const merged: ActivityItem[] = (activityResults.flat() as ActivityItem[]).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setItems(merged);
    } catch {
      // network error – keep existing data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchActivity(); }, [fetchActivity]));

  const onRefresh = () => { setRefreshing(true); fetchActivity(true); };

  // ── Filter by search ──
  const filtered = search.trim()
    ? items.filter(
        (i) =>
          i.title.toLowerCase().includes(search.toLowerCase()) ||
          i.groupName.toLowerCase().includes(search.toLowerCase()) ||
          i.actor.name.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  // ── Group into TODAY / YESTERDAY / EARLIER ──
  const now = new Date();
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);

  const todayItems = filtered.filter((i) => isSameDay(new Date(i.createdAt), now));
  const yesterdayItems = filtered.filter((i) => isSameDay(new Date(i.createdAt), yesterday));
  const earlierItems = filtered.filter(
    (i) => !isSameDay(new Date(i.createdAt), now) && !isSameDay(new Date(i.createdAt), yesterday)
  );

  // ── Settlement label helper ──
  function settlementSign(item: ActivityItem): { positive: boolean; label: string } {
    // "Mike paid Sarah" format - check if current user is beneficiary
    const lowerTitle = item.title.toLowerCase();
    const myName = user?.name?.toLowerCase() || "";
    if (lowerTitle.includes(`paid ${myName}`)) return { positive: true, label: "Received" };
    if (item.actor.id === currentUserId) return { positive: false, label: "You settled" };
    return { positive: true, label: "Received" };
  }

  // ── Render a section ──
  function renderSection(label: string, sectionItems: ActivityItem[]) {
    if (sectionItems.length === 0) return null;
    return (
      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
        <Text style={styles.sectionLabel}>{label}</Text>
        <View style={styles.timelineCard}>
          {sectionItems.map((item, idx) => {
            const isSettlement = item.type === "settlement";
            const sign = isSettlement ? settlementSign(item) : null;
            const amountColor = isSettlement
              ? (sign!.positive ? "#16a34a" : "#e11d48")
              : "#e11d48";
            const amountLabel = isSettlement ? sign!.label : "Total";
            const actorColor = avatarColor(item.actor.name);
            const actorInitial = item.actor.name.charAt(0).toUpperCase();
            const displayText = isSettlement
              ? item.title
              : `${item.actor.id === currentUserId ? "You" : item.actor.name} added "${item.title}"`;

            return (
              <View
                key={item.id}
                style={[
                  styles.timelineItem,
                  idx === sectionItems.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <View style={[styles.timelineAvatar, { backgroundColor: actorColor }]}>
                  <Text style={styles.timelineAvatarText}>{actorInitial}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.timelineText} numberOfLines={1}>{displayText}</Text>
                  <Text style={styles.timelineGroup} numberOfLines={1}>
                    {item.groupName} · {formatTime(item.createdAt)}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", flexShrink: 0 }}>
                  <Text style={[styles.timelineAmount, { color: amountColor }]}>
                    {isSettlement && sign!.positive ? "+" : "-"}
                    {formatAmount(item.amount, item.groupCurrency)}
                  </Text>
                  <Text style={styles.timelineLabel}>{amountLabel}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  }

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
        {/* ── PAGE TITLE ── */}
        <View style={styles.pageTitleRow}>
          <Text style={styles.pageTitle}>Activity</Text>
        </View>

        {/* ── SEARCH ── */}
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search transactions or groups..."
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
            <Text style={styles.loadingText}>Loading activity...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🔔</Text>
            <Text style={styles.emptyTitle}>
              {search ? "No results found" : "No activity yet"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {search
                ? "Try a different search term"
                : "Add expenses to groups and they'll appear here"}
            </Text>
          </View>
        ) : (
          <>
            {renderSection("TODAY", todayItems)}
            {renderSection("YESTERDAY", yesterdayItems)}
            {renderSection("EARLIER", earlierItems)}

            {/* ── END OF UPDATES ── */}
            {!search && (
              <View style={styles.endRow}>
                <View style={styles.endLine} />
                <Text style={styles.endText}>✦ END OF UPDATES</Text>
                <View style={styles.endLine} />
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ── BOTTOM NAV ── */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom + 4 }]}>
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

  pageTitleRow: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 },
  pageTitle: { fontSize: 28, fontWeight: "900", color: "#0f172a", letterSpacing: -0.5 },

  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 20, marginBottom: 20,
    backgroundColor: "#fff", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 14, color: "#0f172a", padding: 0 },

  sectionLabel: {
    fontSize: 11, fontWeight: "700", color: "#94a3b8",
    letterSpacing: 1, textTransform: "uppercase", marginBottom: 10,
  },

  timelineCard: {
    backgroundColor: "#fff", borderRadius: 18, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  timelineItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#F3F0FF",
  },
  timelineAvatar: {
    width: 42, height: 42, borderRadius: 13,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  timelineAvatarText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  timelineText: { fontSize: 14, fontWeight: "600", color: "#0f172a", marginBottom: 2 },
  timelineGroup: { fontSize: 12, color: "#94a3b8" },
  timelineAmount: { fontSize: 15, fontWeight: "800", marginBottom: 2 },
  timelineLabel: { fontSize: 11, color: "#94a3b8" },

  centerState: { alignItems: "center", paddingTop: 80, gap: 12 },
  loadingText: { fontSize: 14, color: "#94a3b8" },

  emptyState: { alignItems: "center", paddingTop: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a", marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: "#94a3b8", textAlign: "center", lineHeight: 20 },

  endRow: {
    flexDirection: "row", alignItems: "center", marginHorizontal: 20, marginTop: 8, marginBottom: 8, gap: 12,
  },
  endLine: { flex: 1, height: 1, backgroundColor: "#e2e8f0" },
  endText: { fontSize: 11, fontWeight: "600", color: "#94a3b8", letterSpacing: 1 },

  tabBar: {
    flexDirection: "row", backgroundColor: "#fff",
    borderTopWidth: 1, borderTopColor: "#F3F0FF", paddingTop: 10,
  },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center", position: "relative" },
  tabLabel: { fontSize: 9, letterSpacing: 0.2 },
  tabActiveBar: {
    position: "absolute", top: -10, left: "25%", right: "25%",
    height: 3, backgroundColor: PURPLE, borderRadius: 2,
  },
});
