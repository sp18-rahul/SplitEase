import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Switch, Appearance,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Redirect } from "expo-router";
import { users } from "@/api/client";
import { useAuth } from "@/context/auth";
import { useTheme } from "@/context/theme";
import { useResponsive } from "@/utils/responsive";

const PURPLE = "#7C3AED";
const PURPLE_LIGHT = "#EDE9FE";
const BG = "#F8F5FF";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateName } = useAuth();
  if (!user) return <Redirect href="/login" />;

  const { theme, setTheme, colors, isDark } = useTheme();
  const r = useResponsive();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState(user?.name || "");
  const [upiId, setUpiId] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [settingTheme, setSettingTheme] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await users.getProfile();
        setName(res.data.name || user?.name || "");
        setUpiId(res.data.upiId || "");
      } catch { /* fallback */ }
      finally { setLoadingProfile(false); }
    })();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) { setError("Name cannot be empty"); return; }
    setError(""); setSaving(true);
    try {
      const res = await users.updateProfile({ name: name.trim(), upiId: upiId.trim() || undefined });
      updateName(res.data.name);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { setError("Failed to update profile."); }
    finally { setSaving(false); }
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  const handleThemeChange = async (newTheme: "light" | "dark" | "system") => {
    setSettingTheme(true);
    try {
      await setTheme(newTheme);
    } catch (error) {
      console.error("Failed to update theme:", error);
    } finally {
      setSettingTheme(false);
    }
  };

  const initial = user?.name?.charAt(0).toUpperCase() || "?";

  if (loadingProfile) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={PURPLE} /></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── HEADER ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.background }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={styles.headerAvatar}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>{initial}</Text>
          </View>
          <Text style={[styles.headerBrand, { color: colors.text }]}>SplitEase</Text>
        </View>
        <TouchableOpacity style={[styles.headerIconBtn, { backgroundColor: colors.surface }]}>
          <Text style={{ fontSize: 16 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 96, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── PROFILE AVATAR ── */}
        <View style={{ alignItems: "center", paddingVertical: 24 }}>
          <View style={styles.bigAvatar}>
            <Text style={{ fontSize: 44, fontWeight: "900", color: "#fff" }}>{initial}</Text>
          </View>
          <Text style={styles.profileName}>{user?.name}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
        </View>

        {/* ── PERSONAL DETAILS ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <Text style={styles.sectionCardTitle}>Personal Details</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color={PURPLE} />
                : <Text style={{ fontSize: 13, fontWeight: "700", color: PURPLE }}>Save</Text>}
            </TouchableOpacity>
          </View>

          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          {saved && (
            <View style={styles.successBox}>
              <Text style={styles.successText}>✓ Profile updated!</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>FULL NAME</Text>
            <TextInput
              style={styles.detailInput}
              value={name}
              onChangeText={(t) => { setName(t); setSaved(false); setError(""); }}
              placeholder="Your name"
              placeholderTextColor="#94a3b8"
              returnKeyType="next"
            />
          </View>
          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.detailLabel}>UPI ID (OPTIONAL)</Text>
            <TextInput
              style={styles.detailInput}
              value={upiId}
              onChangeText={(t) => { setUpiId(t); setSaved(false); }}
              placeholder="your.name@upi"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
        </View>

        {/* ── CURRENCY ── */}
        <TouchableOpacity style={styles.currencyCard} activeOpacity={0.85}>
          <View style={styles.currencyCardTop}>
            <View style={styles.currencyIcon}>
              <Text style={{ fontSize: 18 }}>💳</Text>
            </View>
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>DEFAULT</Text>
            </View>
          </View>
          <Text style={styles.currencyTitle}>Currency</Text>
          <Text style={styles.currencySubtitle}>Preferred display currency</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={styles.currencyValue}>INR</Text>
            <Text style={{ fontSize: 18, color: "rgba(255,255,255,0.7)" }}>⇄</Text>
          </View>
        </TouchableOpacity>

        {/* ── LANGUAGE ── */}
        <View style={styles.sectionCard}>
          <TouchableOpacity style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View style={styles.settingIconWrap}>
              <Text style={{ fontSize: 18 }}>🌐</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Language</Text>
              <Text style={styles.settingSubtitle}>English (US)</Text>
            </View>
            <Text style={{ color: "#94a3b8", fontSize: 18 }}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── SECURITY & PRIVACY ── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionCardTitle}>Security &amp; Privacy</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingIconWrap}>
              <Text style={{ fontSize: 18 }}>🔐</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Two-Factor Auth</Text>
              <Text style={styles.settingSubtitle}>
                {twoFAEnabled ? "Enabled via SMS" : "Disabled"}
              </Text>
            </View>
            <Switch
              value={twoFAEnabled}
              onValueChange={setTwoFAEnabled}
              trackColor={{ false: "#e2e8f0", true: PURPLE }}
              thumbColor="#fff"
            />
          </View>

          <TouchableOpacity style={[styles.settingRow, { borderBottomWidth: 0 }]}
            onPress={() => router.push("/forgot-password")}>
            <View style={styles.settingIconWrap}>
              <Text style={{ fontSize: 18 }}>👤</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Change Password</Text>
              <Text style={styles.settingSubtitle}>Send reset link to email</Text>
            </View>
            <Text style={{ color: "#94a3b8", fontSize: 18 }}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── APPEARANCE ── */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionCardTitle, { color: colors.text }]}>Appearance</Text>

          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: colors.border, borderBottomWidth: 0 }]}
            onPress={() => setThemeMenuVisible(true)}
            disabled={settingTheme}
          >
            <View style={[styles.settingIconWrap, { backgroundColor: PURPLE_LIGHT }]}>
              <Text style={{ fontSize: 18 }}>🌙</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>Dark Mode</Text>
              <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
                {theme === 'system' ? 'System' : theme === 'dark' ? 'Always On' : 'Always Off'}
              </Text>
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: 18 }}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── LOG OUT ── */}
        <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: PURPLE }]} onPress={handleLogout} activeOpacity={0.85}>
          <Text style={styles.logoutBtnText}>Log Out of All Devices</Text>
        </TouchableOpacity>

        {/* ── DELETE ACCOUNT ── */}
        <TouchableOpacity style={{ alignItems: "center", marginTop: 14 }}>
          <Text style={{ fontSize: 14, color: "#e11d48", fontWeight: "600" }}>🗑️ Delete Account</Text>
        </TouchableOpacity>

        {/* ── VERSION ── */}
        <Text style={styles.version}>SPLITEASE V1.0.0 • BUILD 100</Text>
      </ScrollView>

      {/* ── BOTTOM NAV ── */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom + 4, backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {[
          { label: "GROUPS", emoji: "👥", active: false, route: "/" },
          { label: "EXPENSES", emoji: "🧾", active: false, route: "/expenses" },
          { label: "FRIENDS", emoji: "🤝", active: false, route: "/friends" },
          { label: "ACTIVITY", emoji: "🔔", active: false, route: "/activity" },
          { label: "ACCOUNT", emoji: "👤", active: true, route: "/profile" },
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
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: BG },

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
    width: 36, height: 36, borderRadius: 18, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },

  bigAvatar: {
    width: 100, height: 100, borderRadius: 28, backgroundColor: PURPLE,
    alignItems: "center", justifyContent: "center", marginBottom: 14,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 14, elevation: 8,
  },
  profileName: { fontSize: 22, fontWeight: "800", color: "#0f172a", marginBottom: 4 },
  profileEmail: { fontSize: 14, color: "#64748b", fontWeight: "500" },

  sectionCard: {
    backgroundColor: "#fff", borderRadius: 18, padding: 16, marginBottom: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  sectionCardHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14,
  },
  sectionCardTitle: { fontSize: 15, fontWeight: "700", color: "#0f172a" },

  detailRow: {
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F0FF",
  },
  detailLabel: {
    fontSize: 10, fontWeight: "700", color: "#94a3b8",
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4,
  },
  detailInput: { fontSize: 15, fontWeight: "500", color: "#0f172a", padding: 0 },

  errorBox: { backgroundColor: "#fff1f2", borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: "#fecdd3" },
  errorText: { color: "#e11d48", fontWeight: "600", fontSize: 13 },
  successBox: { backgroundColor: "#f0fdf4", borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: "#bbf7d0" },
  successText: { color: "#16a34a", fontWeight: "600", fontSize: 13 },

  currencyCard: {
    backgroundColor: PURPLE, borderRadius: 18, padding: 18, marginBottom: 14,
  },
  currencyCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  currencyIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  defaultBadge: {
    backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  defaultBadgeText: { fontSize: 10, fontWeight: "700", color: "#fff", letterSpacing: 0.5 },
  currencyTitle: { fontSize: 16, fontWeight: "700", color: "#fff", marginBottom: 2 },
  currencySubtitle: { fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 8 },
  currencyValue: { fontSize: 26, fontWeight: "900", color: "#fff" },

  settingRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F0FF",
  },
  settingIconWrap: {
    width: 38, height: 38, borderRadius: 11, backgroundColor: PURPLE_LIGHT,
    alignItems: "center", justifyContent: "center",
  },
  settingTitle: { fontSize: 15, fontWeight: "600", color: "#0f172a" },
  settingSubtitle: { fontSize: 12, color: "#94a3b8", marginTop: 1 },

  logoutBtn: {
    backgroundColor: PURPLE, borderRadius: 14, padding: 16,
    alignItems: "center", marginTop: 4,
  },
  logoutBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  version: {
    textAlign: "center", fontSize: 11, color: "#94a3b8",
    fontWeight: "500", marginTop: 20, letterSpacing: 0.5,
  },

  tabBar: {
    flexDirection: "row", backgroundColor: "#fff",
    borderTopWidth: 1, borderTopColor: "#F3F0FF",
    paddingTop: 10,
  },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center", position: "relative" },
  tabLabel: { fontSize: 9, letterSpacing: 0.2 },
  tabActiveBar: {
    position: "absolute", top: -10, left: "25%", right: "25%",
    height: 3, backgroundColor: PURPLE, borderRadius: 2,
  },
});
