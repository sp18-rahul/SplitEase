import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Redirect } from "expo-router";
import { users } from "@/api/client";
import { useAuth } from "@/context/auth";
import { useTheme } from "@/context/theme";

const PURPLE = "#7C3AED";
const PURPLE_LIGHT = "#EDE9FE";
const BG = "#F8F5FF";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateName } = useAuth();
  if (!user) return <Redirect href="/login" />;

  const { theme, setTheme, colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState(user?.name || "");
  const [upiId, setUpiId] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [editingUpi, setEditingUpi] = useState(false);
  const [savingUpi, setSavingUpi] = useState(false);
  const [upiSuccess, setUpiSuccess] = useState(false);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);

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

  const handleSaveName = async () => {
    if (!name.trim() || name.trim() === user?.name) { setEditingName(false); return; }
    setSaving(true); setError("");
    try {
      const res = await users.updateProfile({ name: name.trim() });
      updateName(res.data.name);
      setEditingName(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { setError("Failed to update name."); }
    finally { setSaving(false); }
  };

  const handleSaveUpi = async () => {
    setSavingUpi(true);
    try {
      await users.updateProfile({ upiId: upiId.trim() || undefined });
      setEditingUpi(false);
      setUpiSuccess(true);
      setTimeout(() => setUpiSuccess(false), 3000);
    } catch { Alert.alert("Error", "Failed to save UPI ID"); }
    finally { setSavingUpi(false); }
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme).catch(console.error);
  };

  const initial = user?.name?.charAt(0).toUpperCase() || "?";

  if (loadingProfile) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* ── HEADER ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={styles.headerAvatar}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>{initial}</Text>
          </View>
          <Text style={styles.headerBrand}>SplitEase</Text>
        </View>
        <TouchableOpacity style={styles.headerIconBtn}>
          <Text style={{ fontSize: 16 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 96, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── PROFILE HERO CARD (web-style) ── */}
        <View style={styles.heroCard}>
          {/* Top row: avatar + name/email */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 14 }}>
            {/* Big circular avatar */}
            <View style={{ position: "relative", flexShrink: 0 }}>
              <View style={styles.heroAvatar}>
                <Text style={{ fontSize: 36, fontWeight: "900", color: "#fff" }}>{initial}</Text>
              </View>
              <TouchableOpacity
                style={styles.editAvatarBtn}
                onPress={() => { setName(user?.name || ""); setEditingName(true); }}
              >
                <Text style={{ fontSize: 12, color: "white" }}>✏️</Text>
              </TouchableOpacity>
            </View>

            {/* Name / Email */}
            <View style={{ flex: 1, minWidth: 0 }}>
              {editingName ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <TextInput
                    style={[styles.nameInput, { flex: 1 }]}
                    value={name}
                    onChangeText={t => { setName(t); setSaved(false); setError(""); }}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleSaveName}
                  />
                  <TouchableOpacity
                    style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                    onPress={handleSaveName}
                    disabled={saving}
                  >
                    {saving
                      ? <ActivityIndicator size="small" color="white" />
                      : <Text style={{ color: "white", fontWeight: "700", fontSize: 12 }}>Save</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingName(false)}>
                    <Text style={{ color: "#475569", fontSize: 12 }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.heroName} numberOfLines={2}>{user?.name}</Text>
              )}
              {!!error && <Text style={{ color: "#E11D48", fontSize: 12, marginBottom: 4 }}>{error}</Text>}
              {saved && <Text style={{ color: "#16a34a", fontSize: 12, marginBottom: 4 }}>Name updated!</Text>}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={{ fontSize: 14, color: PURPLE }}>✅</Text>
                <Text style={styles.heroEmail} numberOfLines={1}>{user?.email}</Text>
              </View>
            </View>
          </View>

          {/* Action buttons row */}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              style={styles.editProfileBtn}
              onPress={() => { setName(user?.name || ""); setEditingName(true); }}
            >
              <Text style={styles.editProfileBtnText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.manageBtn}>
              <Text style={styles.manageBtnText}>Accounts</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── STAT CARDS (web-style 3-col) ── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={{ fontSize: 24, color: PURPLE, marginBottom: 6 }}>👥</Text>
            <Text style={styles.statLabel}>ACTIVE GROUPS</Text>
            <Text style={styles.statValue}>—</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={{ fontSize: 24, color: PURPLE, marginBottom: 6 }}>⬆️</Text>
            <Text style={styles.statLabel}>YOU'RE OWED</Text>
            <Text style={[styles.statValue, { color: PURPLE, fontSize: 16 }]}>—</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={{ fontSize: 24, color: "#E11D48", marginBottom: 6 }}>⬇️</Text>
            <Text style={styles.statLabel}>YOU OWE</Text>
            <Text style={[styles.statValue, { color: "#E11D48", fontSize: 16 }]}>—</Text>
          </View>
        </View>

        {/* ── PAYMENT DETAILS CARD ── */}
        <View style={styles.sectionCard}>
          <View style={styles.cardSectionHeader}>
            <View style={styles.cardSectionIcon}>
              <Text style={{ fontSize: 18 }}>💳</Text>
            </View>
            <Text style={styles.cardSectionTitle}>Payment Details</Text>
          </View>

          <Text style={styles.fieldLabel}>Default UPI ID</Text>
          <View style={styles.upiRow}>
            {editingUpi ? (
              <>
                <TextInput
                  style={[styles.upiInput, { flex: 1 }]}
                  value={upiId}
                  onChangeText={setUpiId}
                  placeholder="yourname@upi"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoFocus
                />
                <TouchableOpacity
                  style={[styles.saveBtn, savingUpi && { opacity: 0.6 }]}
                  onPress={handleSaveUpi}
                  disabled={savingUpi}
                >
                  <Text style={{ color: "white", fontWeight: "700", fontSize: 12 }}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingUpi(false)}>
                  <Text style={{ color: "#475569", fontSize: 12 }}>✕</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[styles.upiInput, { flex: 1, color: upiId ? "#1D1A24" : "#9CA3AF" }]}>
                  {upiId || "Not set"}
                </Text>
                <TouchableOpacity onPress={() => setEditingUpi(true)} style={{ padding: 4 }}>
                  <Text style={{ fontSize: 16, color: "#7B7487" }}>📋</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
          {upiSuccess && <Text style={{ color: "#16a34a", fontSize: 12, marginTop: 6 }}>UPI ID saved!</Text>}
          <Text style={styles.fieldHint}>This ID will be shared with group members to settle debts.</Text>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <TouchableOpacity style={styles.outlineBtn}>
              <Text style={styles.outlineBtnText}>View QR Code</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => setEditingUpi(true)}
            >
              <Text style={styles.primaryBtnText}>Update ID</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── APP PREFERENCES CARD ── */}
        <View style={styles.sectionCard}>
          <View style={styles.cardSectionHeader}>
            <View style={[styles.cardSectionIcon, { backgroundColor: "#F0EEFF" }]}>
              <Text style={{ fontSize: 18 }}>⚙️</Text>
            </View>
            <Text style={styles.cardSectionTitle}>App Preferences</Text>
          </View>

          {/* Currency */}
          <View style={styles.prefRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.prefTitle}>Currency Preference</Text>
              <Text style={styles.prefSubtitle}>Set your default currency for new groups</Text>
            </View>
            <View style={styles.prefValueChip}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#1D1A24" }}>₹ INR</Text>
            </View>
          </View>

          {/* Dark Mode */}
          <View style={[styles.prefRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.prefTitle}>Dark Mode</Text>
              <Text style={styles.prefSubtitle}>
                {theme === "system" ? "System" : theme === "dark" ? "Always On" : "Always Off"}
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {(["light", "dark", "system"] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  onPress={() => handleThemeChange(t)}
                  style={[
                    styles.themeChip,
                    theme === t && styles.themeChipActive,
                  ]}
                >
                  <Text style={[styles.themeChipText, theme === t && styles.themeChipTextActive]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* ── SECURITY CARD ── */}
        <View style={styles.sectionCard}>
          <Text style={[styles.cardSectionTitle, { marginBottom: 14 }]}>Security &amp; Privacy</Text>

          <View style={styles.prefRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
              <View style={[styles.cardSectionIcon, { backgroundColor: PURPLE_LIGHT }]}>
                <Text style={{ fontSize: 16 }}>🔐</Text>
              </View>
              <View>
                <Text style={styles.prefTitle}>Two-Factor Auth</Text>
                <Text style={styles.prefSubtitle}>{twoFAEnabled ? "Enabled via SMS" : "Disabled"}</Text>
              </View>
            </View>
            <Switch
              value={twoFAEnabled}
              onValueChange={setTwoFAEnabled}
              trackColor={{ false: "#e2e8f0", true: PURPLE }}
              thumbColor="#fff"
            />
          </View>

          <TouchableOpacity
            style={[styles.prefRow, { borderBottomWidth: 0, paddingBottom: 0 }]}
            onPress={() => router.push("/forgot-password")}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
              <View style={[styles.cardSectionIcon, { backgroundColor: PURPLE_LIGHT }]}>
                <Text style={{ fontSize: 16 }}>👤</Text>
              </View>
              <View>
                <Text style={styles.prefTitle}>Change Password</Text>
                <Text style={styles.prefSubtitle}>Send reset link to email</Text>
              </View>
            </View>
            <Text style={{ color: "#9CA3AF", fontSize: 18 }}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── DANGER ZONE ── */}
        <View style={styles.dangerCard}>
          <View style={styles.cardSectionHeader}>
            <View style={[styles.cardSectionIcon, { backgroundColor: "#E11D48" }]}>
              <Text style={{ fontSize: 18 }}>⚠️</Text>
            </View>
            <Text style={[styles.cardSectionTitle, { color: "#E11D48" }]}>Danger Zone</Text>
          </View>

          <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
            <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout}>
              <Text style={styles.signOutBtnText}>Sign Out</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn}>
              <Text style={styles.deleteBtnText}>Delete Account</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 12, color: "#E11D48", lineHeight: 18 }}>
            Deleting your account is permanent and cannot be undone. All your data will be removed.
          </Text>
        </View>

        <Text style={styles.version}>SPLITEASE V1.0.0 • BUILD 100</Text>
      </ScrollView>

      {/* ── BOTTOM NAV ── */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom + 4 }]}>
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

  // Profile hero card
  heroCard: {
    backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: "#F0EEFF",
    padding: 20, marginTop: 16, marginBottom: 14,
  },
  heroAvatar: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 3, borderColor: PURPLE_LIGHT,
    background: PURPLE,
    backgroundColor: PURPLE,
    alignItems: "center", justifyContent: "center",
  },
  editAvatarBtn: {
    position: "absolute", bottom: 0, right: 0,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: PURPLE, borderWidth: 2, borderColor: "white",
    alignItems: "center", justifyContent: "center",
  },
  heroName: { fontSize: 22, fontWeight: "900", color: "#1D1A24", marginBottom: 6 },
  heroEmail: { fontSize: 13, color: "#7B7487" },
  nameInput: {
    borderWidth: 1.5, borderColor: PURPLE, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6, fontSize: 16, fontWeight: "700",
    color: "#1D1A24", minWidth: 120,
  },
  saveBtn: {
    backgroundColor: PURPLE, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6, alignItems: "center", justifyContent: "center",
  },
  cancelBtn: {
    backgroundColor: "#F1F5F9", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, alignItems: "center", justifyContent: "center",
  },
  editProfileBtn: {
    backgroundColor: PURPLE, borderRadius: 999,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  editProfileBtnText: { color: "white", fontWeight: "700", fontSize: 13 },
  manageBtn: {
    borderWidth: 1.5, borderColor: PURPLE, borderRadius: 999,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  manageBtnText: { color: PURPLE, fontWeight: "700", fontSize: 13 },

  // Stats
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  statCard: {
    flex: 1, backgroundColor: "#fff", borderRadius: 16,
    borderWidth: 1, borderColor: "#F0EEFF",
    padding: 16, alignItems: "center",
  },
  statLabel: { fontSize: 9, fontWeight: "700", color: "#7B7487", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, textAlign: "center" },
  statValue: { fontSize: 20, fontWeight: "900", color: "#1D1A24" },

  // Section cards
  sectionCard: {
    backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#F0EEFF",
    padding: 20, marginBottom: 14,
  },
  cardSectionHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  cardSectionIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: PURPLE,
    alignItems: "center", justifyContent: "center",
  },
  cardSectionTitle: { fontSize: 15, fontWeight: "700", color: "#1D1A24" },

  fieldLabel: { fontSize: 11, fontWeight: "600", color: "#7B7487", marginBottom: 8 },
  fieldHint: { fontSize: 11, color: "#7B7487", marginTop: 8, lineHeight: 16 },
  upiRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#F5F0FF", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  },
  upiInput: { fontSize: 14, color: "#1D1A24", padding: 0, fontFamily: "monospace" as any },

  outlineBtn: {
    flex: 1, borderWidth: 1.5, borderColor: "#E4D9F7", borderRadius: 999,
    paddingVertical: 10, alignItems: "center",
  },
  outlineBtnText: { fontSize: 13, fontWeight: "700", color: "#1D1A24" },
  primaryBtn: {
    flex: 1, backgroundColor: PURPLE, borderRadius: 999,
    paddingVertical: 10, alignItems: "center",
  },
  primaryBtnText: { fontSize: 13, fontWeight: "700", color: "white" },

  prefRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingBottom: 14, marginBottom: 14,
    borderBottomWidth: 1, borderBottomColor: "#F0EEFF",
  },
  prefTitle: { fontSize: 14, fontWeight: "600", color: "#1D1A24", marginBottom: 2 },
  prefSubtitle: { fontSize: 12, color: "#7B7487" },
  prefValueChip: {
    borderWidth: 1.5, borderColor: "#E4D9F7", borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  themeChip: {
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5,
    borderWidth: 1, borderColor: "#E4D9F7", backgroundColor: "white",
  },
  themeChipActive: { backgroundColor: PURPLE_LIGHT, borderColor: PURPLE },
  themeChipText: { fontSize: 11, fontWeight: "600", color: "#4A4455" },
  themeChipTextActive: { color: PURPLE },

  // Danger zone
  dangerCard: {
    backgroundColor: "#fff", borderRadius: 16,
    borderWidth: 1, borderColor: "#fecdd3",
    padding: 20, marginBottom: 14, position: "relative", overflow: "hidden",
  },
  signOutBtn: {
    flex: 1, borderWidth: 2, borderColor: "#E11D48", borderRadius: 999,
    paddingVertical: 10, alignItems: "center",
  },
  signOutBtnText: { fontSize: 13, fontWeight: "700", color: "#E11D48" },
  deleteBtn: {
    flex: 1, backgroundColor: "#E11D48", borderRadius: 999,
    paddingVertical: 10, alignItems: "center",
  },
  deleteBtnText: { fontSize: 13, fontWeight: "700", color: "white" },

  version: {
    textAlign: "center", fontSize: 11, color: "#9CA3AF",
    fontWeight: "500", marginTop: 8, marginBottom: 4, letterSpacing: 0.5,
  },

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
