import React, { useState, useCallback, useLayoutEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useNavigation, useFocusEffect } from "expo-router";
import { groups } from "@/api/client";
import { useAuth } from "@/context/auth";
import { useResponsive } from "@/utils/responsive";

const INDIGO = "#4f46e5";

const CARD_ACCENTS = ["#4f46e5", "#0ea5e9", "#10b981", "#f97316", "#ec4899", "#8b5cf6", "#14b8a6", "#f59e0b"];

interface Group {
  id: number;
  name: string;
  currency?: string;
  emoji?: string;
  members: Array<{ userId: number; user: { id: number; name: string } }>;
  expenses: Array<{ amount: number }>;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥", AED: "د.إ",
};

function GroupCard({
  item,
  onPress,
  r,
  accentColor,
  index,
}: {
  item: Group;
  onPress: () => void;
  r: ReturnType<typeof useResponsive>;
  accentColor: string;
  index: number;
}) {
  const sym = CURRENCY_SYMBOLS[item.currency || "INR"] || "₹";
  const total = item.expenses.reduce((s, e) => s + e.amount, 0);
  const initial = item.name.trim().charAt(0).toUpperCase();
  const emojiOrInitial = item.emoji || initial;
  const isEmoji = !!item.emoji;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          padding: r.s(16),
          borderRadius: r.s(18),
          marginBottom: r.s(12),
          borderLeftWidth: r.s(4),
          borderLeftColor: accentColor,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View style={[
        styles.cardAvatar,
        {
          width: r.s(50), height: r.s(50), borderRadius: r.s(14),
          backgroundColor: accentColor + "1A", // 10% opacity
        },
      ]}>
        <Text style={{ fontSize: isEmoji ? r.fs(24) : r.fs(20), fontWeight: "800", color: accentColor }}>
          {emojiOrInitial}
        </Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.cardName, { fontSize: r.fs(16) }]}>{item.name}</Text>
        <Text style={[styles.cardSub, { fontSize: r.fs(12) }]}>
          {item.members.length} member{item.members.length !== 1 ? "s" : ""}
        </Text>
      </View>
      <View style={styles.cardRight}>
        <Text style={[styles.cardTotal, { fontSize: r.fs(15), color: accentColor }]}>{sym}{total.toFixed(0)}</Text>
        <Text style={[styles.cardTotalLbl, { fontSize: r.fs(10) }]}>total</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const r = useResponsive();
  const insets = useSafeAreaInsets();

  const [groupsList, setGroupsList] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: "row", gap: r.s(8), marginRight: r.s(4) }}>
          <TouchableOpacity
            onPress={() => router.push("/profile")}
            style={[styles.headerBtn, { width: r.s(36), height: r.s(36), borderRadius: r.s(18) }]}
          >
            <Text style={{ fontSize: r.fs(16) }}>👤</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, r.width]);

  const fetchGroups = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await groups.getAll();
      setGroupsList(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchGroups();
    }, [fetchGroups])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={INDIGO} />
      </View>
    );
  }

  const numColumns = r.isTablet ? 2 : 1;
  const listPadH = r.hPad + r.s(16);

  // Compute total spent across all groups
  const grandTotal = groupsList.reduce((sum, g) => sum + g.expenses.reduce((s, e) => s + e.amount, 0), 0);
  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <View style={styles.root}>
      {/* Greeting banner */}
      <View style={[styles.banner, { overflow: "hidden" }]}>
        {/* Decorative circles */}
        <View style={[styles.bannerBlob1, { width: r.s(160), height: r.s(160), borderRadius: r.s(80), top: -r.s(40), right: -r.s(30) }]} />
        <View style={[styles.bannerBlob2, { width: r.s(100), height: r.s(100), borderRadius: r.s(50), bottom: -r.s(20), left: r.s(20) }]} />

        <View style={{ paddingHorizontal: listPadH, paddingTop: r.s(20), paddingBottom: r.s(22) }}>
          <Text style={[styles.bannerGreet, { fontSize: r.fs(23) }]}>
            Hey, {firstName} 👋
          </Text>
          <Text style={[styles.bannerSub, { fontSize: r.fs(13) }]}>
            {groupsList.length === 0
              ? "Create your first group to get started"
              : `${groupsList.length} group${groupsList.length !== 1 ? "s" : ""} · ₹${grandTotal.toFixed(0)} total tracked`}
          </Text>
        </View>
      </View>

      {/* Section header */}
      {groupsList.length > 0 && (
        <View style={{ paddingHorizontal: listPadH, paddingTop: r.s(18), paddingBottom: r.s(4) }}>
          <Text style={[styles.sectionHeading, { fontSize: r.fs(12) }]}>YOUR GROUPS</Text>
        </View>
      )}

      <FlatList
        data={groupsList}
        key={numColumns}
        numColumns={numColumns}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{
          paddingHorizontal: listPadH,
          paddingTop: r.s(8),
          paddingBottom: r.s(100),
        }}
        columnWrapperStyle={numColumns > 1 ? { gap: r.s(12) } : undefined}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchGroups(true); }}
            tintColor={INDIGO}
          />
        }
        ListEmptyComponent={
          <View style={[styles.empty, { paddingTop: r.s(60) }]}>
            <View style={[styles.emptyIconWrap, { width: r.s(100), height: r.s(100), borderRadius: r.s(28) }]}>
              <Text style={{ fontSize: r.fs(48) }}>🤝</Text>
            </View>
            <Text style={[styles.emptyTitle, { fontSize: r.fs(20), marginTop: r.s(20) }]}>No groups yet</Text>
            <Text style={[styles.emptySub, { fontSize: r.fs(14), marginTop: r.s(8), paddingHorizontal: r.s(32) }]}>
              Tap the + button to create a group and start splitting expenses.
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={numColumns > 1 ? { flex: 1 } : {}}>
            <GroupCard
              item={item}
              onPress={() => router.push(`/${item.id}`)}
              r={r}
              accentColor={CARD_ACCENTS[index % CARD_ACCENTS.length]}
              index={index}
            />
          </View>
        )}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[
          styles.fab,
          {
            bottom: insets.bottom + r.s(24),
            right: r.hPad + r.s(24),
            width: r.s(60),
            height: r.s(60),
            borderRadius: r.s(30),
          },
        ]}
        onPress={() => router.push("/new-group")}
        activeOpacity={0.85}
      >
        <Text style={[styles.fabText, { fontSize: r.fs(30) }]}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f1f0ff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  banner: {
    backgroundColor: INDIGO,
  },
  bannerBlob1: { position: "absolute", backgroundColor: "rgba(255,255,255,0.08)" },
  bannerBlob2: { position: "absolute", backgroundColor: "rgba(255,255,255,0.05)" },
  bannerGreet: { fontWeight: "800", color: "#fff" },
  bannerSub: { color: "rgba(255,255,255,0.78)", marginTop: 4, fontWeight: "500" },
  sectionHeading: {
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#4f46e5",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  cardAvatar: {
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  cardBody: { flex: 1 },
  cardName: { fontWeight: "700", color: "#0f172a", marginBottom: 3 },
  cardSub: { color: "#64748b", fontWeight: "500" },
  cardRight: { alignItems: "flex-end", gap: 2 },
  cardTotal: { fontWeight: "800" },
  cardTotalLbl: { color: "#94a3b8", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
  empty: { alignItems: "center", justifyContent: "center" },
  emptyIconWrap: {
    backgroundColor: "#eef2ff",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontWeight: "800", color: "#0f172a" },
  emptySub: { color: "#64748b", textAlign: "center" },
  headerBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    position: "absolute",
    backgroundColor: INDIGO,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: INDIGO,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  fabText: { color: "#fff", fontWeight: "300", lineHeight: 34 },
});
