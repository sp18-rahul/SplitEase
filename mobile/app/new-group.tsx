import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { users, groups, emailApi } from "@/api/client";
import { useAuth } from "@/context/auth";
import { useTheme } from "@/context/theme";
import { useResponsive } from "@/utils/responsive";

const PURPLE = "#7C3AED";
const PURPLE_LIGHT = "#EDE9FE";
const BG = "#F8F5FF";

const CURRENCIES = [
  { code: "INR", symbol: "₹", label: "Indian Rupee" },
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "JPY", symbol: "¥", label: "Japanese Yen" },
  { code: "AED", symbol: "د.إ", label: "UAE Dirham" },
];

const GROUP_EMOJIS = [
  "💰", "🏠", "🍕", "✈️", "🎉", "🚗", "🎮", "🏖️",
  "🍺", "🛒", "🏋️", "🎸", "🐾", "🌿", "💻", "📚",
  "🎭", "🚀", "⚽", "🎯",
];

interface FoundUser { id: number; name: string; email: string; }

export default function NewGroupScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const r = useResponsive();
  const insets = useSafeAreaInsets();

  const [groupName, setGroupName] = useState("");
  const [emoji, setEmoji] = useState("💰");
  const [currency, setCurrency] = useState("INR");
  const [emailSearch, setEmailSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [searchError, setSearchError] = useState("");
  const [members, setMembers] = useState<FoundUser[]>([]);
  const [loading, setLoading] = useState(false);

  // Invite new user states
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");

  const searchUser = async () => {
    if (!emailSearch.trim()) return;
    setSearching(true);
    setSearchError("");
    setFoundUser(null);
    try {
      console.log("Searching for user:", emailSearch);
      const res = await users.findByEmail(emailSearch.trim().toLowerCase());
      const list: FoundUser[] = res.data;

      if (!list || list.length === 0) {
        setSearchError("No user found with that email.");
      } else {
        const found = list[0];
        if (found.id === user?.userId) {
          setSearchError("That's you! You'll be added automatically.");
        } else if (members.some((m) => m.id === found.id)) {
          setSearchError("Already added.");
        } else {
          setFoundUser(found);
        }
      }
    } catch (error: any) {
      console.error("Search error:", error);
      const errorMsg = error.response?.data?.error || error.message || "Search failed. Try again.";
      setSearchError(errorMsg);
    } finally {
      setSearching(false);
    }
  };

  const addMember = () => {
    if (!foundUser) return;
    setMembers((prev) => [...prev, foundUser]);
    setFoundUser(null); setEmailSearch(""); setSearchError("");
  };

  const removeMember = (id: number) => setMembers((prev) => prev.filter((m) => m.id !== id));

  const generateTempPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let pwd = "";
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  };

  const inviteNewUser = async () => {
    if (!inviteName.trim() || !inviteEmail.trim()) {
      setInviteError("Name and email are required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      setInviteError("Invalid email format");
      return;
    }

    // Check if email already exists
    const emailExists = members.some((m) => m.email.toLowerCase() === inviteEmail.toLowerCase());
    if (emailExists) {
      setInviteError("This user is already added");
      return;
    }

    setInviting(true);
    setInviteError("");
    try {
      // Generate temporary password
      const tempPassword = generateTempPassword();

      // Create user
      console.log("Creating new user:", inviteName, inviteEmail);
      const res = await users.create({ name: inviteName.trim(), email: inviteEmail.trim() });
      const newUser = { id: res.data.id, name: inviteName, email: inviteEmail };

      console.log("User created, sending welcome email");
      // Send welcome email
      try {
        await emailApi.sendWelcome(
          inviteEmail.trim(),
          inviteName.trim(),
          tempPassword,
          groupName || "a group",
          user?.name || "A friend"
        );
      } catch (emailError: any) {
        console.error("Email sending failed (non-critical):", emailError);
        // Don't fail the whole operation if email fails
      }

      setMembers((prev) => [...prev, newUser]);
      setInviteName("");
      setInviteEmail("");
      setShowInviteForm(false);
      Alert.alert("Success", `${inviteName} invited! Check their email for login credentials.`);
    } catch (error: any) {
      console.error("Invite error:", error);
      const errorMsg = error.response?.data?.error || error.message || "Failed to invite user";
      setInviteError(errorMsg);
    } finally {
      setInviting(false);
    }
  };

  const createGroup = async () => {
    if (!groupName.trim()) { Alert.alert("Error", "Enter a group name"); return; }
    if (members.length === 0) { Alert.alert("Error", "Please add at least one member"); return; }

    setLoading(true);
    try {
      const memberIds = members.map((m) => m.id);
      console.log("Creating group with:", { name: groupName, memberIds, currency, emoji });

      const res = await groups.create({
        name: groupName.trim(),
        memberIds,
        currency,
        emoji
      });

      console.log("Group created:", res.data);

      if (res.data && res.data.id) {
        router.replace(`/${res.data.id}`);
      } else {
        Alert.alert("Error", "Invalid response from server");
      }
    } catch (error: any) {
      console.error("Create group error:", error);
      const errorMsg = error.response?.data?.error ||
                       error.message ||
                       "Failed to create group. Please try again.";
      Alert.alert("Error", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const hPad = r.hPad + r.s(16);
  // How many emoji columns based on screen width
  const emojiCols = r.isLargeTablet ? 10 : r.isTablet ? 8 : 5;
  const emojiSize = r.s(48);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: insets.bottom + r.s(120), paddingHorizontal: hPad, paddingTop: r.s(16) }}
      >
        {/* Emoji Picker */}
        <View style={[styles.formCard, { borderRadius: r.s(18), padding: r.s(18), marginBottom: r.s(12), backgroundColor: colors.surface }]}>
          <Text style={[styles.label, { fontSize: r.fs(12), marginBottom: r.s(14) }]}>Group Emoji</Text>
          <View style={[styles.emojiGrid, { gap: r.s(8) }]}>
            {GROUP_EMOJIS.map((e) => (
              <TouchableOpacity
                key={e}
                style={[
                  styles.emojiBtn,
                  { width: emojiSize, height: emojiSize, borderRadius: r.s(14) },
                  emoji === e && styles.emojiBtnActive,
                ]}
                onPress={() => setEmoji(e)}
              >
                <Text style={{ fontSize: r.fs(22) }}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* Selected emoji preview */}
          <View style={[styles.emojiPreview, { marginTop: r.s(14), borderRadius: r.s(12), paddingHorizontal: r.s(14), paddingVertical: r.s(10) }]}>
            <Text style={{ fontSize: r.fs(24) }}>{emoji}</Text>
            <Text style={[styles.emojiPreviewText, { fontSize: r.fs(13) }]}>Selected group emoji</Text>
          </View>
        </View>

        {/* Group name + currency card */}
        <View style={[styles.formCard, { borderRadius: r.s(18), padding: r.s(18), marginBottom: r.s(12) }]}>
          {r.isTablet ? (
            <View style={{ flexDirection: "row", gap: r.s(16) }}>
              <View style={{ flex: 2 }}>
                <Text style={[styles.label, { fontSize: r.fs(12), marginBottom: r.s(10) }]}>Group Name</Text>
                <TextInput style={[styles.input, { fontSize: r.fs(15), padding: r.s(14) }]}
                  placeholder="e.g., Goa Trip, Flat mates..." placeholderTextColor="#94a3b8"
                  value={groupName} onChangeText={setGroupName} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { fontSize: r.fs(12), marginBottom: r.s(10) }]}>Currency</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: r.s(8) }}>
                  {CURRENCIES.map((c) => (
                    <TouchableOpacity key={c.code}
                      style={[styles.currPill, { paddingHorizontal: r.s(12), paddingVertical: r.s(8), borderRadius: r.s(20) }, currency === c.code && styles.currPillActive]}
                      onPress={() => setCurrency(c.code)}>
                      <Text style={[styles.currSymbol, { fontSize: r.fs(15) }]}>{c.symbol}</Text>
                      <Text style={[styles.currCode, { fontSize: r.fs(13) }, currency === c.code && styles.currCodeActive]}>{c.code}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          ) : (
            <>
              <Text style={[styles.label, { fontSize: r.fs(12), marginBottom: r.s(10), color: colors.textSecondary }]}>Group Name</Text>
              <TextInput style={[styles.input, { fontSize: r.fs(15), padding: r.s(14), marginBottom: r.s(18), borderColor: colors.border, backgroundColor: isDark ? "#1e293b" : "#f8fafc", color: colors.text }]}
                placeholder="e.g., Goa Trip, Flat mates..." placeholderTextColor="#94a3b8"
                value={groupName} onChangeText={setGroupName} />
              <Text style={[styles.label, { fontSize: r.fs(12), marginBottom: r.s(10), color: colors.textSecondary }]}>Currency</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: r.s(8), paddingBottom: r.s(2) }}>
                {CURRENCIES.map((c) => (
                  <TouchableOpacity key={c.code}
                    style={[styles.currPill, { gap: r.s(4), paddingHorizontal: r.s(14), paddingVertical: r.s(10), borderRadius: r.s(20), backgroundColor: colors.surface, borderColor: colors.border }, currency === c.code && styles.currPillActive]}
                    onPress={() => setCurrency(c.code)}>
                    <Text style={[styles.currSymbol, { fontSize: r.fs(15), color: colors.text }]}>{c.symbol}</Text>
                    <Text style={[styles.currCode, { fontSize: r.fs(13), color: colors.textSecondary }, currency === c.code && styles.currCodeActive]}>{c.code}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}
        </View>

        {/* Add Members */}
        <View style={[styles.formCard, { borderRadius: r.s(18), padding: r.s(18), marginBottom: r.s(12), backgroundColor: colors.surface }]}>
          <Text style={[styles.label, { fontSize: r.fs(12), marginBottom: r.s(12), color: colors.textSecondary }]}>Add Members by Email</Text>
          <View style={[styles.searchRow, { gap: r.s(10) }]}>
            <TextInput
              style={[styles.input, { flex: 1, fontSize: r.fs(15), padding: r.s(14), borderColor: colors.border, backgroundColor: isDark ? "#1e293b" : "#f8fafc", color: colors.text }]}
              placeholder="friend@example.com" placeholderTextColor="#94a3b8"
              keyboardType="email-address" autoCapitalize="none"
              value={emailSearch}
              onChangeText={(t) => { setEmailSearch(t); setSearchError(""); setFoundUser(null); }}
              returnKeyType="search" onSubmitEditing={searchUser}
            />
            <TouchableOpacity
              style={[styles.searchBtn, { paddingHorizontal: r.s(16), borderRadius: r.s(12), minWidth: r.s(64) }, !emailSearch.trim() && { backgroundColor: "#e2e8f0" }]}
              onPress={searchUser} disabled={!emailSearch.trim() || searching}>
              {searching ? <ActivityIndicator color="#fff" size="small" /> : <Text style={[styles.searchBtnText, { fontSize: r.fs(14) }]}>Find</Text>}
            </TouchableOpacity>
          </View>
          {!!searchError && <Text style={[styles.searchError, { fontSize: r.fs(13) }]}>{searchError}</Text>}
          {foundUser && (
            <View style={[styles.foundCard, { gap: r.s(12), borderRadius: r.s(12), padding: r.s(12), marginTop: r.s(10) }]}>
              <View style={[styles.foundAvatar, { width: r.s(38), height: r.s(38), borderRadius: r.s(10) }]}>
                <Text style={{ fontSize: r.fs(16), fontWeight: "800", color: "#16a34a" }}>{foundUser.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.foundName, { fontSize: r.fs(14) }]}>{foundUser.name}</Text>
                <Text style={[styles.foundEmail, { fontSize: r.fs(12) }]}>{foundUser.email}</Text>
              </View>
              <TouchableOpacity style={[styles.addBtn, { paddingHorizontal: r.s(12), paddingVertical: r.s(8), borderRadius: r.s(10) }]} onPress={addMember}>
                <Text style={[styles.addBtnText, { fontSize: r.fs(13) }]}>+ Add</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Invite New User */}
        {!showInviteForm ? (
          <TouchableOpacity
            style={[styles.formCard, { borderRadius: r.s(18), padding: r.s(18), marginBottom: r.s(12), backgroundColor: PURPLE_LIGHT }]}
            onPress={() => setShowInviteForm(true)}>
            <Text style={[styles.label, { fontSize: r.fs(12), marginBottom: r.s(8), color: PURPLE }]}>+ Invite New User</Text>
            <Text style={[{ fontSize: r.fs(13), color: PURPLE, fontWeight: "600" }]}>Create account and add to group</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.formCard, { borderRadius: r.s(18), padding: r.s(18), marginBottom: r.s(12), backgroundColor: colors.surface }]}>
            <Text style={[styles.label, { fontSize: r.fs(12), marginBottom: r.s(12), color: colors.textSecondary }]}>Invite New User</Text>
            {!!inviteError && <Text style={[{ fontSize: r.fs(13), color: "#e11d48", marginBottom: r.s(10), fontWeight: "600" }]}>{inviteError}</Text>}

            <TextInput
              style={[styles.input, { fontSize: r.fs(15), padding: r.s(14), marginBottom: r.s(10), borderColor: colors.border, backgroundColor: isDark ? "#1e293b" : "#f8fafc", color: colors.text }]}
              placeholder="Full name" placeholderTextColor="#94a3b8"
              value={inviteName}
              onChangeText={setInviteName}
            />
            <TextInput
              style={[styles.input, { fontSize: r.fs(15), padding: r.s(14), marginBottom: r.s(12), borderColor: colors.border, backgroundColor: isDark ? "#1e293b" : "#f8fafc", color: colors.text }]}
              placeholder="email@example.com" placeholderTextColor="#94a3b8"
              keyboardType="email-address" autoCapitalize="none"
              value={inviteEmail}
              onChangeText={setInviteEmail}
            />

            <View style={{ flexDirection: "row", gap: r.s(10) }}>
              <TouchableOpacity
                style={[styles.searchBtn, { flex: 1, paddingHorizontal: r.s(16), borderRadius: r.s(12) }]}
                onPress={inviteNewUser} disabled={inviting}>
                {inviting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={[styles.searchBtnText, { fontSize: r.fs(14) }]}>Send Invite</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.searchBtn, { paddingHorizontal: r.s(16), borderRadius: r.s(12), backgroundColor: "#e2e8f0" }]}
                onPress={() => { setShowInviteForm(false); setInviteError(""); setInviteName(""); setInviteEmail(""); }}>
                <Text style={[styles.searchBtnText, { fontSize: r.fs(14), color: "#64748b" }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Members List */}
        <View style={[styles.formCard, { borderRadius: r.s(18), padding: r.s(18), marginBottom: r.s(12), backgroundColor: colors.surface }]}>
          <Text style={[styles.label, { fontSize: r.fs(12), marginBottom: r.s(12), color: colors.textSecondary }]}>
            Members ({members.length + 1})
          </Text>
          <View style={[styles.memberRow, { gap: r.s(12), borderRadius: r.s(12), padding: r.s(12), marginBottom: r.s(8), backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.memberAvatar, { width: r.s(36), height: r.s(36), borderRadius: r.s(10), backgroundColor: PURPLE_LIGHT }]}>
              <Text style={{ fontSize: r.fs(14), fontWeight: "700", color: PURPLE }}>
                {user?.name?.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.memberName, { fontSize: r.fs(14), color: colors.text }]}>{user?.name} (you)</Text>
              <Text style={[styles.memberEmail, { fontSize: r.fs(12), color: colors.textSecondary }]}>{user?.email}</Text>
            </View>
          </View>
          {members.map((m) => (
            <View key={m.id} style={[styles.memberRow, { gap: r.s(12), borderRadius: r.s(12), padding: r.s(12), marginBottom: r.s(8), backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.memberAvatar, { width: r.s(36), height: r.s(36), borderRadius: r.s(10), backgroundColor: isDark ? "#334155" : "#f1f5f9" }]}>
                <Text style={{ fontSize: r.fs(14), fontWeight: "700", color: isDark ? "#e2e8f0" : "#475569" }}>{m.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.memberName, { fontSize: r.fs(14), color: colors.text }]}>{m.name}</Text>
                <Text style={[styles.memberEmail, { fontSize: r.fs(12), color: colors.textSecondary }]}>{m.email}</Text>
              </View>
              <TouchableOpacity onPress={() => removeMember(m.id)}
                style={[styles.removeBtn, { width: r.s(28), height: r.s(28), borderRadius: r.s(14) }]}>
                <Text style={{ fontSize: r.fs(13), color: "#e11d48", fontWeight: "700" }}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>


      <View style={[styles.bottomBar, { paddingHorizontal: hPad, paddingBottom: insets.bottom + r.s(16), backgroundColor: colors.background, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.btn, { padding: r.s(16), borderRadius: r.s(14) }, (!groupName.trim() || loading) && styles.btnDisabled]}
          onPress={createGroup} disabled={!groupName.trim() || loading} activeOpacity={0.85}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.btnText, { fontSize: r.fs(16) }]}>Create Group</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  label: { fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 },
  input: { borderWidth: 1.5, borderColor: "#e2e8f0", borderRadius: 12, color: "#0f172a", backgroundColor: "#f8fafc" },
  formCard: {
    backgroundColor: "#fff",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  emojiGrid: { flexDirection: "row", flexWrap: "wrap" },
  emojiBtn: { backgroundColor: "#f8f5ff", borderWidth: 2, borderColor: "#e2e8f0", alignItems: "center", justifyContent: "center" },
  emojiBtnActive: { borderColor: PURPLE, backgroundColor: PURPLE_LIGHT },
  emojiPreview: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#EDE9FE", borderWidth: 1, borderColor: "#C4B5FD" },
  emojiPreviewText: { color: "#7C3AED", fontWeight: "600" },
  currPill: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1.5, borderColor: "#e2e8f0", backgroundColor: "#fff" },
  currPillActive: { borderColor: PURPLE, backgroundColor: PURPLE_LIGHT },
  currSymbol: { fontWeight: "700", color: "#0f172a" },
  currCode: { fontWeight: "600", color: "#64748b" },
  currCodeActive: { color: PURPLE },
  searchRow: { flexDirection: "row" },
  searchBtn: { backgroundColor: PURPLE, alignItems: "center", justifyContent: "center" },
  searchBtnText: { color: "#fff", fontWeight: "700" },
  searchError: { color: "#e11d48", marginTop: 8, fontWeight: "500" },
  foundCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0" },
  foundAvatar: { backgroundColor: "#dcfce7", alignItems: "center", justifyContent: "center" },
  foundName: { fontWeight: "700", color: "#0f172a" },
  foundEmail: { color: "#64748b" },
  addBtn: { backgroundColor: "#16a34a" },
  addBtnText: { color: "#fff", fontWeight: "700" },
  memberRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: "#f1f5f9" },
  memberAvatar: { backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },
  memberName: { fontWeight: "700", color: "#0f172a" },
  memberEmail: { color: "#64748b" },
  removeBtn: { backgroundColor: "#fff1f2", alignItems: "center", justifyContent: "center" },
  bottomBar: { backgroundColor: BG, paddingTop: 16, borderTopWidth: 1, borderColor: "#e2e8f0" },
  btn: { backgroundColor: PURPLE, alignItems: "center" },
  btnDisabled: { backgroundColor: "#C4B5FD" },
  btnText: { color: "#fff", fontWeight: "700" },
});
