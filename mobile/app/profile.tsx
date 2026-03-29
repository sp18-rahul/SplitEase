import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { users } from "@/api/client";
import { useAuth } from "@/context/auth";
import { useResponsive } from "@/utils/responsive";

const INDIGO = "#4f46e5";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateName } = useAuth();
  const r = useResponsive();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState(user?.name || "");
  const [upiId, setUpiId] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await users.getProfile();
        setName(res.data.name || user?.name || "");
        setUpiId(res.data.upiId || "");
      } catch {
        // fallback
      } finally {
        setLoadingProfile(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) { setError("Name cannot be empty"); return; }
    setError("");
    setSaving(true);
    try {
      const res = await users.updateProfile({
        name: name.trim(),
        upiId: upiId.trim() || undefined,
      });
      updateName(res.data.name);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Failed to update profile. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  const initial = user?.name?.charAt(0).toUpperCase() || "?";
  const hPad = r.hPad + r.s(16);

  if (loadingProfile) {
    return <View style={styles.center}><ActivityIndicator size="large" color={INDIGO} /></View>;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView
        style={styles.root}
        contentContainerStyle={{ paddingBottom: insets.bottom + r.s(40) }}
      >
        {/* Avatar section */}
        <View style={[styles.avatarSection, { paddingVertical: r.s(36), paddingHorizontal: hPad }]}>
          <View style={[styles.avatarCircle, { width: r.s(88), height: r.s(88), borderRadius: r.s(44), marginBottom: r.s(14) }]}>
            <Text style={{ fontSize: r.fs(38), fontWeight: "900", color: "#fff" }}>{initial}</Text>
          </View>
          <Text style={{ fontSize: r.fs(22), fontWeight: "800", color: "#fff", marginBottom: r.s(4) }}>{user?.name}</Text>
          <Text style={{ fontSize: r.fs(14), color: "rgba(255,255,255,0.75)", fontWeight: "500" }}>{user?.email}</Text>
        </View>

        {/* Cards container — centered on tablet */}
        <View style={{ paddingHorizontal: hPad, paddingTop: r.s(8) }}>
          {/* Edit profile */}
          <View style={[styles.card, { borderRadius: r.s(18), padding: r.s(20), marginBottom: r.s(14) }]}>
            <Text style={[styles.cardTitle, { fontSize: r.fs(11), marginBottom: r.s(16) }]}>Profile</Text>

            {!!error && (
              <View style={[styles.errorBox, { borderRadius: r.s(10), padding: r.s(10), marginBottom: r.s(12) }]}>
                <Text style={[styles.errorText, { fontSize: r.fs(13) }]}>{error}</Text>
              </View>
            )}
            {saved && (
              <View style={[styles.successBox, { borderRadius: r.s(10), padding: r.s(10), marginBottom: r.s(12) }]}>
                <Text style={[styles.successText, { fontSize: r.fs(13) }]}>✓ Profile updated!</Text>
              </View>
            )}

            {/* On tablet: name + upi side by side */}
            {r.isTablet ? (
              <View style={{ flexDirection: "row", gap: r.s(16) }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { fontSize: r.fs(12), marginBottom: r.s(8) }]}>Display Name</Text>
                  <TextInput
                    style={[styles.input, { padding: r.s(14), fontSize: r.fs(15), borderRadius: r.s(12) }]}
                    value={name}
                    onChangeText={(t) => { setName(t); setSaved(false); setError(""); }}
                    placeholder="Your name"
                    placeholderTextColor="#94a3b8"
                    returnKeyType="next"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { fontSize: r.fs(12), marginBottom: r.s(8) }]}>
                    UPI ID <Text style={styles.optional}>(for payments)</Text>
                  </Text>
                  <TextInput
                    style={[styles.input, { padding: r.s(14), fontSize: r.fs(15), borderRadius: r.s(12) }]}
                    value={upiId}
                    onChangeText={(t) => { setUpiId(t); setSaved(false); }}
                    placeholder="yourname@upi or phone@bank"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    returnKeyType="done"
                    onSubmitEditing={handleSave}
                  />
                </View>
              </View>
            ) : (
              <>
                <Text style={[styles.fieldLabel, { fontSize: r.fs(12), marginBottom: r.s(8) }]}>Display Name</Text>
                <TextInput
                  style={[styles.input, { padding: r.s(14), fontSize: r.fs(15), borderRadius: r.s(12) }]}
                  value={name}
                  onChangeText={(t) => { setName(t); setSaved(false); setError(""); }}
                  placeholder="Your name"
                  placeholderTextColor="#94a3b8"
                  returnKeyType="next"
                />

                <Text style={[styles.fieldLabel, { fontSize: r.fs(12), marginBottom: r.s(8) }]}>
                  UPI ID <Text style={styles.optional}>(for payments)</Text>
                </Text>
                <TextInput
                  style={[styles.input, { padding: r.s(14), fontSize: r.fs(15), borderRadius: r.s(12) }]}
                  value={upiId}
                  onChangeText={(t) => { setUpiId(t); setSaved(false); }}
                  placeholder="yourname@upi or phone@bank"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
                />
              </>
            )}

            {!!upiId && (
              <View style={[styles.upiHint, { borderRadius: r.s(8), padding: r.s(10), marginBottom: r.s(14) }]}>
                <Text style={[styles.upiHintText, { fontSize: r.fs(12) }]}>💳 Members can pay you directly via UPI</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.btn, { borderRadius: r.s(12), padding: r.s(14) }, saving && styles.btnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={[styles.btnText, { fontSize: r.fs(15) }]}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Account info */}
          <View style={[styles.card, { borderRadius: r.s(18), padding: r.s(20), marginBottom: r.s(14) }]}>
            <Text style={[styles.cardTitle, { fontSize: r.fs(11), marginBottom: r.s(16) }]}>Account</Text>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { fontSize: r.fs(14) }]}>Email</Text>
              <Text style={[styles.infoValue, { fontSize: r.fs(14) }]}>{user?.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { fontSize: r.fs(14) }]}>User ID</Text>
              <Text style={[styles.infoValue, { fontSize: r.fs(14) }]}>#{user?.userId}</Text>
            </View>
            {!!upiId && (
              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <Text style={[styles.infoLabel, { fontSize: r.fs(14) }]}>UPI ID</Text>
                <Text style={[styles.infoValue, { fontSize: r.fs(14), color: INDIGO }]}>{upiId}</Text>
              </View>
            )}
          </View>

          {/* About */}
          <View style={[styles.card, { borderRadius: r.s(18), padding: r.s(20), marginBottom: r.s(14) }]}>
            <Text style={[styles.cardTitle, { fontSize: r.fs(11), marginBottom: r.s(16) }]}>About</Text>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { fontSize: r.fs(14) }]}>App</Text>
              <Text style={[styles.infoValue, { fontSize: r.fs(14) }]}>Splitwise</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={[styles.infoLabel, { fontSize: r.fs(14) }]}>Version</Text>
              <Text style={[styles.infoValue, { fontSize: r.fs(14) }]}>1.0.0</Text>
            </View>
          </View>

          {/* Sign out */}
          <View style={[styles.card, { borderRadius: r.s(18), padding: r.s(20), marginBottom: r.s(8) }]}>
            <TouchableOpacity
              style={[styles.logoutBtn, { borderRadius: r.s(12), padding: r.s(14) }]}
              onPress={handleLogout}
              activeOpacity={0.85}
            >
              <Text style={[styles.logoutText, { fontSize: r.fs(15) }]}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f1f0ff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  avatarSection: {
    alignItems: "center",
    backgroundColor: INDIGO,
  },
  avatarCircle: {
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 3, borderColor: "rgba(255,255,255,0.4)",
  },
  card: {
    backgroundColor: "#fff",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  cardTitle: {
    fontWeight: "700", color: "#94a3b8",
    textTransform: "uppercase", letterSpacing: 0.5,
  },
  fieldLabel: { fontWeight: "600", color: "#475569" },
  optional: { fontWeight: "400", color: "#94a3b8" },
  errorBox: { backgroundColor: "#fff1f2", borderWidth: 1, borderColor: "#fecdd3" },
  errorText: { color: "#e11d48", fontWeight: "600" },
  successBox: { backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0" },
  successText: { color: "#16a34a", fontWeight: "600" },
  input: {
    borderWidth: 1.5, borderColor: "#e2e8f0",
    color: "#0f172a", backgroundColor: "#f8fafc",
    marginBottom: 14,
  },
  upiHint: { backgroundColor: "#fef9c3", borderWidth: 1, borderColor: "#fde047" },
  upiHintText: { color: "#854d0e", fontWeight: "600" },
  btn: { backgroundColor: INDIGO, alignItems: "center" },
  btnDisabled: { backgroundColor: "#a5b4fc" },
  btnText: { color: "#fff", fontWeight: "700" },
  infoRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f1f5f9",
  },
  infoLabel: { color: "#64748b", fontWeight: "500" },
  infoValue: { color: "#0f172a", fontWeight: "600", maxWidth: "60%", textAlign: "right" },
  logoutBtn: {
    backgroundColor: "#fff1f2", alignItems: "center",
    borderWidth: 1, borderColor: "#fecdd3",
  },
  logoutText: { color: "#e11d48", fontWeight: "700" },
});
