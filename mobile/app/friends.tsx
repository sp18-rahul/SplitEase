import React, { useState, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, RefreshControl, Alert, Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Redirect, useRouter, useFocusEffect } from "expo-router";
import { useAuth } from "@/context/auth";
import { useTheme } from "@/context/theme";
import { groups as groupsApi, balances as balancesApi, users as usersApi } from "@/api/client";

// Derive pairwise balances from the API's settlement-aware transactions.
// transactions = [{ fromUserId, toUserId, amount }] — who still needs to pay whom.
// fromUserId owes toUserId → balance[fromUserId] = negative, balance[toUserId] = positive
function balancesFromTransactions(
  currentUserId: number,
  transactions: { fromUserId: number; toUserId: number; amount: number }[]
): Map<number, number> {
  const map = new Map<number, number>();
  const add = (uid: number, delta: number) =>
    map.set(uid, (map.get(uid) ?? 0) + delta);

  for (const t of transactions) {
    if (t.fromUserId === currentUserId) {
      // We owe t.toUserId
      add(t.toUserId, -Number(t.amount));
    } else if (t.toUserId === currentUserId) {
      // t.fromUserId owes us
      add(t.fromUserId, +Number(t.amount));
    }
  }

  return map;
}

const PURPLE = "#7C3AED";
const PURPLE_LIGHT = "#EDE9FE";
const BROWN = "#92400E";
const BG = "#F8F5FF";

const AVATAR_COLORS = [PURPLE, "#10B981", "#F59E0B", "#3B82F6", "#EF4444", "#8B5CF6", "#EC4899"];

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥", AED: "د.إ",
};

interface Friend {
  id: number;
  name: string;
  email: string;
  balance: number;
  currency: string;
  avatarColor: string;
  mutualGroups: number;
}

function getAvatarColor(id: number): string {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

export default function FriendsScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  if (!user) return <Redirect href="/login" />;

  const insets = useSafeAreaInsets();
  const currentUserId = user.userId;
  const initial = user.name?.charAt(0).toUpperCase() || "?";

  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [addFriendSearch, setAddFriendSearch] = useState("");
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentRequests, setSentRequests] = useState<Set<number>>(new Set());

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  // Load all users once when modal opens, then filter client-side
  const handleOpenAddFriend = useCallback(async () => {
    setShowAddFriendModal(true);
    if (allUsers.length > 0) return; // already loaded
    setSearching(true);
    try {
      const res = await usersApi.getAll();
      const users = Array.isArray(res.data) ? res.data : [];
      setAllUsers(users.filter((u: any) => u.id !== currentUserId));
    } catch {
      setAllUsers([]);
    } finally {
      setSearching(false);
    }
  }, [currentUserId, allUsers.length]);

  const searchResults = addFriendSearch.trim()
    ? allUsers.filter((u: any) =>
        u.name?.toLowerCase().includes(addFriendSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(addFriendSearch.toLowerCase())
      )
    : [];

  const handleAddFriend = useCallback(async (userId: number) => {
    setSentRequests(new Set([...sentRequests, userId]));
    try {
      await usersApi.sendFriendRequest(userId);
    } catch {
      Alert.alert("Error", "Failed to send friend request");
      setSentRequests(new Set([...sentRequests].filter(id => id !== userId)));
    }
  }, [sentRequests]);

  const fetchFriends = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const groupsRes = await groupsApi.getAll();
      const allGroups: any[] = Array.isArray(groupsRes.data) ? groupsRes.data : [];

      // Fetch settlement-aware balance transactions for every group in parallel
      const balanceResults = await Promise.all(
        allGroups.map((g) =>
          balancesApi.getByGroup(g.id)
            .then((r: any) => r.data?.transactions ?? [])
            .catch(() => [])
        )
      );

      const friendMap = new Map<number, Friend>();

      for (let i = 0; i < allGroups.length; i++) {
        const group = allGroups[i];
        const groupCurrency: string = group.currency || "INR";
        const members: any[] = group.members || [];
        const transactions: any[] = balanceResults[i];

        // Build friend entries
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
              avatarColor: getAvatarColor(uid),
              mutualGroups: 1,
            });
          } else {
            friendMap.get(uid)!.mutualGroups += 1;
          }
        }

        // Add settlement-aware pairwise balances from API transactions
        const pairwise = balancesFromTransactions(currentUserId, transactions);
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

  const filteredFriends = search.trim()
    ? friends.filter(
        (f) =>
          f.name.toLowerCase().includes(search.toLowerCase()) ||
          f.email.toLowerCase().includes(search.toLowerCase())
      )
    : friends;

  // Alphabetical grouping (like web)
  const alphaGroups: Record<string, Friend[]> = {};
  for (const f of filteredFriends) {
    const letter = f.name.charAt(0).toUpperCase();
    if (!alphaGroups[letter]) alphaGroups[letter] = [];
    alphaGroups[letter].push(f);
  }
  const letters = Object.keys(alphaGroups).sort();

  const totalOwedToMe = friends.reduce((s, f) => s + (f.balance > 0 ? f.balance : 0), 0);
  const totalIOwe = friends.reduce((s, f) => s + (f.balance < 0 ? Math.abs(f.balance) : 0), 0);
  const currSym = friends.length > 0 ? (CURRENCY_SYMBOLS[friends[0].currency] || "₹") : "₹";

  const formatAmount = (amount: number) =>
    `${currSym}${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={handleOpenAddFriend}>
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
        {/* ── PAGE TITLE + SEARCH ── */}
        <View style={styles.pageHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pageTitle, { color: colors.text }]}>Friends</Text>
            <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>Manage your connections and balances.</Text>
          </View>
          <TouchableOpacity
            style={styles.addFriendBtn}
            onPress={handleOpenAddFriend}
            activeOpacity={0.85}
          >
            <Text style={styles.addFriendBtnText}>＋ Add Friend</Text>
          </TouchableOpacity>
        </View>

        {/* ── SEARCH ── */}
        <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search friends..."
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
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading friends...</Text>
          </View>
        ) : (
          <>
            {/* ── SUMMARY CARDS (web-style) ── */}
            {!search && friends.length > 0 && (
              <View style={styles.summarySection}>
                {/* Card 1: Total Owed to You */}
                <View style={[styles.summaryCardPurple, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.summaryIconCircle}>
                    <Text style={{ fontSize: 24 }}>💳</Text>
                  </View>
                  <View>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Owed to You</Text>
                    <Text style={[styles.summaryAmount, { color: PURPLE }]}>
                      {formatAmount(totalOwedToMe)}
                    </Text>
                  </View>
                </View>

                {/* Card 2: You Owe + Active Connections */}
                <View style={[styles.summaryCardCombined, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 12 }}>
                    <View style={[styles.summaryIconCircle, { backgroundColor: BROWN }]}>
                      <Text style={{ fontSize: 24 }}>🤲</Text>
                    </View>
                    <View>
                      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>You Owe Total</Text>
                      <Text style={[styles.summaryAmount, { color: BROWN }]}>
                        {formatAmount(totalIOwe)}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Active Connections</Text>
                    <Text style={[styles.summaryAmount, { color: colors.text, fontSize: 18 }]}>
                      {friends.length} Friends
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* ── FRIENDS LIST (alphabetical, web-style) ── */}
            {friends.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>👥</Text>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No friends yet</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Join a group with others to see them here</Text>
              </View>
            ) : filteredFriends.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>🔍</Text>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No friends found</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Try a different name or email</Text>
              </View>
            ) : (
              <View style={{ paddingHorizontal: 16 }}>
                {letters.map((letter) => (
                  <View key={letter} style={{ marginBottom: 24 }}>
                    {/* Alpha section header */}
                    <View style={styles.alphaHeader}>
                      <Text style={styles.alphaLetter}>{letter}</Text>
                      <View style={[styles.alphaDivider, { backgroundColor: colors.border }]} />
                    </View>

                    {/* Friend cards */}
                    {alphaGroups[letter].map((friend) => {
                      const sym = CURRENCY_SYMBOLS[friend.currency] || "₹";
                      const isOwed = friend.balance > 0;
                      const isOwing = friend.balance < 0;
                      const balLabel = isOwed ? "owes you" : isOwing ? "you owe" : "settled up";
                      const balColor = isOwed ? PURPLE : isOwing ? BROWN : colors.textSecondary;
                      const balAmount = `${sym}${Math.abs(friend.balance).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

                      return (
                        <TouchableOpacity
                          key={friend.id}
                          style={[styles.friendCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                          activeOpacity={0.7}
                        >
                          {/* Avatar (circular, like web) */}
                          <View style={{ position: "relative", flexShrink: 0 }}>
                            <View style={[styles.friendAvatar, { backgroundColor: friend.avatarColor }]}>
                              <Text style={styles.friendAvatarText}>
                                {friend.name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                            {/* Active dot for non-settled */}
                            {friend.balance !== 0 && (
                              <View style={styles.activeDot} />
                            )}
                          </View>

                          {/* Name + mutual groups */}
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={[styles.friendName, { color: colors.text }]} numberOfLines={1}>{friend.name}</Text>
                            <Text style={[styles.friendMutual, { color: colors.textSecondary }]}>
                              👥 {friend.mutualGroups} mutual group{friend.mutualGroups !== 1 ? "s" : ""}
                            </Text>
                          </View>

                          {/* Balance (web-style: label above, amount below) */}
                          <View style={{ alignItems: "flex-end", flexShrink: 0 }}>
                            <Text style={[styles.balLabel, { color: colors.textSecondary }]}>{balLabel}</Text>
                            <Text style={[styles.balAmount, { color: balColor }]}>
                              {balAmount}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ── ADD FRIEND MODAL ── */}
      <Modal visible={showAddFriendModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            {/* Drag handle */}
            <View style={{ alignItems: "center", paddingVertical: 12 }}>
              <View style={styles.modalHandle} />
            </View>

            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Add Friend</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Search and invite friends</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => { setShowAddFriendModal(false); setAddFriendSearch(""); }}
              >
                <Text style={{ fontSize: 16, color: colors.text }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={[styles.modalSearchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={[styles.modalSearchInput, { color: colors.text }]}
                placeholder="Search by name or email..."
                placeholderTextColor={colors.textSecondary}
                value={addFriendSearch}
                onChangeText={setAddFriendSearch}
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
              ) : !addFriendSearch.trim() ? (
                <View style={{ alignItems: "center", paddingVertical: 32, paddingHorizontal: 24 }}>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: "center" }}>
                    Friends are people you share groups with. Search to find and connect with them!
                  </Text>
                </View>
              ) : (
                searchResults.map((u) => {
                  const isAlreadyFriend = friends.some(f => f.id === u.id);
                  const requestSent = sentRequests.has(u.id);
                  return (
                    <View
                      key={u.id}
                      style={[styles.userSearchResult, { backgroundColor: colors.card, borderColor: colors.border, opacity: isAlreadyFriend ? 0.6 : 1 }]}
                    >
                      <View style={[styles.userAvatar, { backgroundColor: AVATAR_COLORS[u.id % AVATAR_COLORS.length] }]}>
                        <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>
                          {u.name?.charAt(0).toUpperCase() || "?"}
                        </Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>{u.name}</Text>
                        <Text style={[styles.userEmail, { color: colors.textSecondary }]} numberOfLines={1}>{u.email}</Text>
                      </View>
                      {isAlreadyFriend ? (
                        <View style={[styles.statusBadge, { backgroundColor: "#DCFCE7" }]}>
                          <Text style={[styles.statusBadgeText, { color: "#10B981" }]}>Friends ✓</Text>
                        </View>
                      ) : requestSent ? (
                        <View style={[styles.statusBadge, { backgroundColor: PURPLE_LIGHT }]}>
                          <Text style={[styles.statusBadgeText, { color: PURPLE }]}>Sent</Text>
                        </View>
                      ) : (
                        <TouchableOpacity style={styles.addBtn} onPress={() => handleAddFriend(u.id)}>
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
      <View style={[styles.tabBar, { paddingBottom: insets.bottom + 4, backgroundColor: colors.surface, borderTopColor: colors.border }]}>
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
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: "#fff",
    borderBottomWidth: 1, borderBottomColor: "#F0EEFF",
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
    paddingHorizontal: 16, paddingTop: 24, paddingBottom: 16,
  },
  pageTitle: { fontSize: 32, fontWeight: "900", color: "#1D1A24", letterSpacing: -0.5, marginBottom: 4 },
  pageSubtitle: { fontSize: 13, color: "#7B7487" },
  addFriendBtn: {
    backgroundColor: PURPLE, borderRadius: 999,
    paddingHorizontal: 16, paddingVertical: 10,
    alignSelf: "flex-start", marginTop: 4,
  },
  addFriendBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 16, marginBottom: 20,
    backgroundColor: "#F5F0FF", borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: PURPLE_LIGHT,
  },
  searchIcon: { fontSize: 15 },
  searchInput: { flex: 1, fontSize: 14, color: "#1D1A24", padding: 0 },

  summarySection: { paddingHorizontal: 16, marginBottom: 24, gap: 12 },

  summaryCardPurple: {
    backgroundColor: "#fff", borderRadius: 18,
    borderWidth: 1, borderColor: "#F0EEFF",
    padding: 20, flexDirection: "row", alignItems: "center", gap: 16,
  },
  summaryCardCombined: {
    backgroundColor: "#fff", borderRadius: 18,
    borderWidth: 1, borderColor: "#F0EEFF",
    padding: 20, flexDirection: "row", alignItems: "center",
  },
  summaryIconCircle: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: PURPLE,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  summaryLabel: { fontSize: 12, color: "#7B7487", marginBottom: 4, fontWeight: "500" },
  summaryAmount: { fontSize: 22, fontWeight: "900", letterSpacing: -0.5 },
  summaryDivider: { width: 1, height: 44, backgroundColor: "#F0EEFF", marginHorizontal: 16, flexShrink: 0 },

  alphaHeader: {
    flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12,
  },
  alphaLetter: { fontSize: 26, fontWeight: "900", color: PURPLE, lineHeight: 30 },
  alphaDivider: { flex: 1, height: 1, backgroundColor: "#E4D9F7" },

  friendCard: {
    backgroundColor: "#fff", borderRadius: 16,
    borderWidth: 1, borderColor: "#F0EEFF",
    padding: 16, flexDirection: "row", alignItems: "center", gap: 12,
    marginBottom: 10,
  },
  friendAvatar: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  friendAvatarText: { fontSize: 20, fontWeight: "900", color: "#fff" },
  activeDot: {
    position: "absolute", bottom: 2, right: 2,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: "#10B981", borderWidth: 2, borderColor: "#fff",
  },
  friendName: { fontSize: 15, fontWeight: "700", color: "#1D1A24", marginBottom: 4 },
  friendMutual: { fontSize: 12, color: "#9CA3AF" },
  balLabel: { fontSize: 11, color: "#9CA3AF", marginBottom: 3, fontWeight: "500" },
  balAmount: { fontSize: 17, fontWeight: "800", letterSpacing: -0.3 },

  centerState: { alignItems: "center", paddingTop: 80, gap: 12 },
  loadingText: { fontSize: 14, color: "#94a3b8" },

  emptyCard: {
    marginHorizontal: 16, backgroundColor: "#fff", borderRadius: 18,
    borderWidth: 1, borderColor: "#F0EEFF",
    padding: 48, alignItems: "center",
  },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: "#1D1A24", marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: "#7B7487", textAlign: "center", lineHeight: 20 },

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

  modalContainer: {
    backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#E4D9F7" },
  modalHeader: {
    flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between",
    paddingHorizontal: 24, paddingBottom: 20,
    borderBottomWidth: 1, borderBottomColor: "#F0EEFF",
  },
  modalTitle: { fontSize: 26, fontWeight: "900", color: "#1D1A24", marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: "#7B7487" },
  modalCloseBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: "#F5F0FF",
    alignItems: "center", justifyContent: "center",
  },
  modalSearchWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 24, marginVertical: 16,
    backgroundColor: "#F5F0FF", borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: PURPLE_LIGHT,
  },
  modalSearchInput: { flex: 1, fontSize: 14, color: "#1D1A24", padding: 0 },
  modalResults: { maxHeight: 400, paddingHorizontal: 24 },

  userSearchResult: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 12, marginBottom: 8,
    backgroundColor: "#F5F0FF", borderRadius: 12,
    borderWidth: 1, borderColor: PURPLE_LIGHT,
  },
  userAvatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  userName: { fontSize: 14, fontWeight: "600", color: "#1D1A24", marginBottom: 2 },
  userEmail: { fontSize: 12, color: "#7B7487" },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },
  addBtn: { backgroundColor: PURPLE, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
});
