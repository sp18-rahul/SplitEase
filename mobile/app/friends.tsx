import React, { useState, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Share, ActivityIndicator, RefreshControl, Alert, Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Redirect, useRouter, useFocusEffect } from "expo-router";
import { useAuth } from "@/context/auth";
import { useTheme } from "@/context/theme";
import { groups as groupsApi, balances as balancesApi, users as usersApi } from "@/api/client";

// Re-implementation of backend calculateBalances for pairwise debt calculation
// Returns netBalance[friendId] relative to currentUser:
//   positive  = friend owes currentUser
//   negative  = currentUser owes friend
function computePairwiseBalances(
  currentUserId: number,
  expenses: any[],
  settlements: any[]
): Map<number, number> {
  const map = new Map<number, number>();

  const add = (uid: number, delta: number) => {
    map.set(uid, (map.get(uid) ?? 0) + delta);
  };

  for (const expense of expenses) {
    const paidById: number = expense.paidById ?? expense.paidBy?.id;
    const splits: { userId: number; amount: number }[] = expense.splits ?? [];

    if (paidById === currentUserId) {
      // I paid — each co-member's split is what they owe me
      for (const s of splits) {
        if (s.userId !== currentUserId) add(s.userId, Number(s.amount));
      }
    } else {
      // Someone else paid — find my split = how much I owe them
      const mine = splits.find((s) => s.userId === currentUserId);
      if (mine) add(paidById, -Number(mine.amount));
    }
  }

  // Adjust for settlements that have already been paid
  for (const s of settlements) {
    if (s.fromUserId === currentUserId) {
      // I paid s.toUserId — reduces what I owe them
      add(s.toUserId, Number(s.amount));
    } else if (s.toUserId === currentUserId) {
      // s.fromUserId paid me — reduces what they owe me
      add(s.fromUserId, -Number(s.amount));
    }
  }

  return map;
}

const PURPLE = "#7C3AED";
const PURPLE_LIGHT = "#EDE9FE";
const BG = "#F8F5FF";

const AVATAR_COLORS = [PURPLE, "#A78BFA", "#6D28D9", "#8B5CF6", "#C4B5FD", "#10b981", "#f59e0b", "#e11d48"];

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥", AED: "د.إ",
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface Friend {
  id: number;
  name: string;
  email: string;
  balance: number;       // positive = they owe me, negative = I owe them
  currency: string;      // most common currency from shared groups
  avatarColor: string;
  sharedGroups: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function avatarColor(id: number): string {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

// ─────────────────────────────────────────────────────────────────────────────

export default function FriendsScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  if (!user) return <Redirect href="/login" />;

  const insets = useSafeAreaInsets();
  const currentUserId = user.userId;
  const initial = user.name?.charAt(0).toUpperCase() || "?";
  const { colors, isDark } = useTheme();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [addFriendSearch, setAddFriendSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentRequests, setSentRequests] = useState<Set<number>>(new Set());

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  // Search for users to add as friends
  const handleSearchUsers = useCallback(async (query: string) => {
    setAddFriendSearch(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await usersApi.search(query);
      const users = Array.isArray(res.data) ? res.data : [];
      setSearchResults(users.filter(u => u.id !== currentUserId));
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [currentUserId]);

  const handleAddFriend = useCallback(async (userId: number) => {
    setSentRequests(new Set([...sentRequests, userId]));
    try {
      await usersApi.sendFriendRequest(userId);
    } catch {
      Alert.alert("Error", "Failed to send friend request");
      setSentRequests(new Set([...sentRequests].filter(id => id !== userId)));
    }
  }, [sentRequests]);

  // ── Fetch groups → compute true pairwise debts (not redistributed transactions) ──
  const fetchFriends = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      // Fetch groups (members + expenses) and per-group settlements in parallel
      const groupsRes = await groupsApi.getAll();
      const allGroups: any[] = Array.isArray(groupsRes.data) ? groupsRes.data : [];

      const balanceResults = await Promise.all(
        allGroups.map((g) =>
          balancesApi.getByGroup(g.id)
            .then((r) => r.data?.settlements ?? [])
            .catch(() => [])
        )
      );

      // Map: userId → friend data
      const friendMap = new Map<number, Friend>();

      for (let i = 0; i < allGroups.length; i++) {
        const group = allGroups[i];
        const groupCurrency: string = group.currency || "INR";
        const members: any[] = group.members || [];
        const expenses: any[] = group.expenses || [];
        const settlements: any[] = balanceResults[i];

        // Register co-members
        for (const member of members) {
          const uid: number = member.user?.id ?? member.userId;
          if (uid === currentUserId) continue;
          if (!friendMap.has(uid)) {
            friendMap.set(uid, {
              id: uid,
              name: member.user?.name || `User ${uid}`,
              email: member.user?.email || "",
              balance: 0,
              currency: groupCurrency,
              avatarColor: avatarColor(uid),
              sharedGroups: [group.name],
            });
          } else {
            const f = friendMap.get(uid)!;
            if (!f.sharedGroups.includes(group.name)) f.sharedGroups.push(group.name);
          }
        }

        // Compute pairwise balances for this group using expense splits + settlements
        const pairwise = computePairwiseBalances(currentUserId, expenses, settlements);
        for (const [uid, delta] of pairwise.entries()) {
          if (friendMap.has(uid)) {
            friendMap.get(uid)!.balance += delta;
          }
        }
      }

      setFriends(Array.from(friendMap.values()));
    } catch {
      // keep existing on network error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUserId]);

  useFocusEffect(useCallback(() => { fetchFriends(); }, [fetchFriends]));

  const onRefresh = () => { setRefreshing(true); fetchFriends(true); };

  const handleShareInvite = async () => {
    try {
      await Share.share({
        message: "Join me on SplitEase to split expenses easily! Download: https://splitease.app/invite",
        title: "Join SplitEase",
      });
    } catch { /* user cancelled */ }
  };

  const filteredFriends = search.trim()
    ? friends.filter(
        (f) =>
          f.name.toLowerCase().includes(search.toLowerCase()) ||
          f.email.toLowerCase().includes(search.toLowerCase())
      )
    : friends;

  // Sort: those who owe me first, then those I owe, then settled
  const sortedFriends = [...filteredFriends].sort((a, b) => {
    if (a.balance > 0 && b.balance <= 0) return -1;
    if (a.balance <= 0 && b.balance > 0) return 1;
    return Math.abs(b.balance) - Math.abs(a.balance);
  });

  const totalOwedToMe = friends.reduce((s, f) => s + (f.balance > 0 ? f.balance : 0), 0);
  const totalIOwe = friends.reduce((s, f) => s + (f.balance < 0 ? Math.abs(f.balance) : 0), 0);

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
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowAddFriendModal(true)}>
            <Text style={{ fontSize: 16 }}>➕</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={handleLogout}>
            <Text style={{ fontSize: 16 }}>🚪</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PURPLE} />}
      >
        {/* ── PAGE TITLE ── */}
        <View style={styles.pageTitleRow}>
          <View>
            <Text style={styles.pageTitle}>Friends</Text>
            <Text style={styles.pageSubtitle}>
              {loading ? "Loading..." : `${friends.length} people across your groups`}
            </Text>
          </View>
        </View>

        {/* ── SEARCH ── */}
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search friends..."
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
            <Text style={styles.loadingText}>Loading friends...</Text>
          </View>
        ) : (
          <>
            {/* ── SUMMARY CARDS ── */}
            {!search && friends.length > 0 && (
              <View style={styles.summaryRow}>
                <View style={[styles.summaryCard, { borderLeftColor: "#16a34a" }]}>
                  <Text style={styles.summaryLabel}>OWED TO YOU</Text>
                  <Text style={[styles.summaryAmount, { color: "#16a34a" }]}>
                    ${totalOwedToMe.toFixed(2)}
                  </Text>
                </View>
                <View style={[styles.summaryCard, { borderLeftColor: "#e11d48" }]}>
                  <Text style={styles.summaryLabel}>YOU OWE</Text>
                  <Text style={[styles.summaryAmount, { color: "#e11d48" }]}>
                    ${totalIOwe.toFixed(2)}
                  </Text>
                </View>
              </View>
            )}

            {/* ── FRIENDS LIST ── */}
            {sortedFriends.length > 0 ? (
              <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
                <Text style={styles.sectionLabel}>
                  {search ? "SEARCH RESULTS" : "YOUR FRIENDS"}
                </Text>
                <View style={styles.listCard}>
                  {sortedFriends.map((friend, idx) => {
                    const sym = CURRENCY_SYMBOLS[friend.currency] || "$";
                    return (
                      <TouchableOpacity
                        key={friend.id}
                        style={[
                          styles.friendRow,
                          idx === sortedFriends.length - 1 && { borderBottomWidth: 0 },
                        ]}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.friendAvatar, { backgroundColor: friend.avatarColor }]}>
                          <Text style={styles.friendAvatarText}>
                            {friend.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.friendName}>{friend.name}</Text>
                          <Text style={styles.friendSub} numberOfLines={1}>
                            {friend.sharedGroups.slice(0, 2).join(", ")}
                            {friend.sharedGroups.length > 2 ? ` +${friend.sharedGroups.length - 2}` : ""}
                          </Text>
                        </View>
                        <View style={{ alignItems: "flex-end", flexShrink: 0 }}>
                          {Math.abs(friend.balance) < 0.01 ? (
                            <Text style={styles.settledText}>Settled ✓</Text>
                          ) : (
                            <>
                              <Text style={[
                                styles.friendBalance,
                                { color: friend.balance > 0 ? "#16a34a" : "#e11d48" }
                              ]}>
                                {friend.balance > 0 ? "+" : "-"}
                                {sym}{Math.abs(friend.balance).toFixed(2)}
                              </Text>
                              <Text style={styles.friendBalanceLabel}>
                                {friend.balance > 0 ? "owes you" : "you owe"}
                              </Text>
                            </>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>🤝</Text>
                <Text style={styles.emptyTitle}>
                  {search ? "No friends found" : "No friends yet"}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {search
                    ? "Try a different name or email"
                    : "Create a group and add members to see your friends here"}
                </Text>
              </View>
            )}

            {/* ── SHARE INVITE LINK ── */}
            {!search && (
              <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
                <Text style={styles.sectionLabel}>INVITE MORE FRIENDS</Text>
                <View style={styles.inviteCard}>
                  <View style={styles.inviteIconRow}>
                    {[
                      { icon: "💬", label: "WhatsApp", color: "#25D366" },
                      { icon: "📱", label: "SMS", color: PURPLE },
                      { icon: "📧", label: "Email", color: "#f59e0b" },
                      { icon: "🔗", label: "Copy Link", color: "#64748b" },
                    ].map((item) => (
                      <TouchableOpacity
                        key={item.label}
                        style={styles.inviteIconBtn}
                        onPress={handleShareInvite}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.inviteIconCircle, { backgroundColor: item.color + "18" }]}>
                          <Text style={{ fontSize: 22 }}>{item.icon}</Text>
                        </View>
                        <Text style={styles.inviteIconLabel}>{item.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* ── PROMO CARD ── */}
            {!search && (
              <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
                <TouchableOpacity style={styles.promoCard} onPress={handleShareInvite} activeOpacity={0.9}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.promoTitle}>Bring your friends! 🎉</Text>
                    <Text style={styles.promoBody}>
                      Invite friends to SplitEase and make group expenses effortless.
                    </Text>
                    <TouchableOpacity
                      style={styles.promoBtn}
                      onPress={handleShareInvite}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.promoBtnText}>Share Invite Link →</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={{ fontSize: 52, marginLeft: 8 }}>🤝</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ── ADD FRIEND MODAL ── */}
      <Modal visible={showAddFriendModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Add Friend</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Search and invite friends</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddFriendModal(false)}>
                <Text style={{ fontSize: 24, color: colors.textSecondary }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.modalSearchWrap}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={[styles.modalSearchInput, { color: colors.text }]}
                placeholder="Search by name or email..."
                placeholderTextColor={colors.textSecondary}
                value={addFriendSearch}
                onChangeText={handleSearchUsers}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Results */}
            <ScrollView style={styles.modalResults} showsVerticalScrollIndicator={false}>
              {searching ? (
                <View style={styles.centerState}>
                  <ActivityIndicator size="large" color={PURPLE} />
                  <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Searching...</Text>
                </View>
              ) : addFriendSearch.trim() && searchResults.length === 0 ? (
                <View style={styles.centerState}>
                  <Text style={{ fontSize: 40, marginBottom: 12 }}>🔍</Text>
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No users found</Text>
                </View>
              ) : (
                searchResults.map((user) => {
                  const isAlreadyFriend = friends.some(f => f.id === user.id);
                  const requestSent = sentRequests.has(user.id);
                  return (
                    <View
                      key={user.id}
                      style={[styles.userSearchResult, {
                        backgroundColor: colors.background,
                        borderBottomColor: colors.border,
                        opacity: isAlreadyFriend ? 0.6 : 1,
                      }]}
                    >
                      <View style={[styles.userAvatar, { backgroundColor: AVATAR_COLORS[user.id % AVATAR_COLORS.length] }]}>
                        <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>
                          {user.name?.charAt(0).toUpperCase() || "?"}
                        </Text>
                      </View>

                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                          {user.name}
                        </Text>
                        <Text style={[styles.userEmail, { color: colors.textSecondary }]} numberOfLines={1}>
                          {user.email}
                        </Text>
                      </View>

                      {isAlreadyFriend ? (
                        <View style={styles.statusBadge}>
                          <Text style={styles.statusBadgeText}>Friends ✓</Text>
                        </View>
                      ) : requestSent ? (
                        <View style={[styles.statusBadge, { backgroundColor: "#EDE9FE" }]}>
                          <Text style={[styles.statusBadgeText, { color: PURPLE }]}>Sent</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.addBtn}
                          onPress={() => handleAddFriend(user.id)}
                        >
                          <Text style={styles.addBtnText}>Add</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── BOTTOM NAV ── */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom + 4 }]}>
        {[
          { label: "GROUPS", emoji: "👥", active: false, route: "/" },
          { label: "EXPENSES", emoji: "🧾", active: false, route: "/expenses" },
          { label: "FRIENDS", emoji: "🤝", active: true, route: "/friends" },
          { label: "ACTIVITY", emoji: "🔔", active: false, route: "/activity" },
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

  pageTitleRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 4, paddingBottom: 14,
  },
  pageTitle: { fontSize: 28, fontWeight: "900", color: "#0f172a", letterSpacing: -0.5, marginBottom: 2 },
  pageSubtitle: { fontSize: 13, color: "#64748b" },

  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: "#fff", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 14, color: "#0f172a", padding: 0 },

  summaryRow: {
    flexDirection: "row", paddingHorizontal: 20, gap: 12, marginBottom: 20,
  },
  summaryCard: {
    flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 14,
    borderLeftWidth: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  summaryLabel: { fontSize: 10, fontWeight: "700", color: "#94a3b8", letterSpacing: 0.8, marginBottom: 6 },
  summaryAmount: { fontSize: 20, fontWeight: "900", letterSpacing: -0.5 },

  sectionLabel: {
    fontSize: 11, fontWeight: "700", color: "#94a3b8",
    letterSpacing: 1, textTransform: "uppercase", marginBottom: 10,
  },

  listCard: {
    backgroundColor: "#fff", borderRadius: 18, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  friendRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: "#F3F0FF",
  },
  friendAvatar: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  friendAvatarText: { fontSize: 17, fontWeight: "700", color: "#fff" },
  friendName: { fontSize: 15, fontWeight: "600", color: "#0f172a", marginBottom: 2 },
  friendSub: { fontSize: 12, color: "#94a3b8" },
  friendBalance: { fontSize: 15, fontWeight: "800", marginBottom: 2 },
  friendBalanceLabel: { fontSize: 11, color: "#94a3b8" },
  settledText: { fontSize: 12, color: "#16a34a", fontWeight: "600" },

  inviteCard: {
    backgroundColor: "#fff", borderRadius: 18, padding: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  inviteIconRow: { flexDirection: "row", justifyContent: "space-around" },
  inviteIconBtn: { alignItems: "center", gap: 6 },
  inviteIconCircle: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
  },
  inviteIconLabel: { fontSize: 11, fontWeight: "600", color: "#64748b" },

  centerState: { alignItems: "center", paddingTop: 80, gap: 12 },
  loadingText: { fontSize: 14, color: "#94a3b8" },

  emptyState: { alignItems: "center", paddingTop: 40, paddingHorizontal: 40, marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a", marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: "#94a3b8", textAlign: "center", lineHeight: 20 },

  promoCard: {
    backgroundColor: PURPLE, borderRadius: 18, padding: 20,
    flexDirection: "row", alignItems: "center",
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
  },
  promoTitle: { fontSize: 16, fontWeight: "800", color: "#fff", marginBottom: 6 },
  promoBody: { fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 18, marginBottom: 14 },
  promoBtn: {
    backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 9, alignSelf: "flex-start",
  },
  promoBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

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

  modalContainer: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 16, maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between",
    marginBottom: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#F3F0FF",
  },
  modalTitle: { fontSize: 20, fontWeight: "900", marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: "#94a3b8" },

  modalSearchWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#fff", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 16, borderWidth: 1, borderColor: "#EDE9FE",
  },
  modalSearchInput: { flex: 1, fontSize: 14, padding: 0 },

  modalResults: { maxHeight: 400 },
  userSearchResult: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 12, borderBottomWidth: 1, borderBottomColor: "#F3F0FF",
  },
  userAvatar: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  userName: { fontSize: 14, fontWeight: "600", marginBottom: 2 },
  userEmail: { fontSize: 12 },

  statusBadge: {
    backgroundColor: "#DCFCE7", borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  statusBadgeText: { fontSize: 11, fontWeight: "700", color: "#16a34a" },

  addBtn: {
    backgroundColor: PURPLE, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
});
