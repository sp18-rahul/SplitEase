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
  const { colors } = useTheme();
  const r = useResponsive();
  const insets = useSafeAreaInsets();

  const [groupName, setGroupName] = useState("");
  const [emoji, setEmoji] = useState("💰");
  const [showEmojiGrid, setShowEmojiGrid] = useState(false);
  const [currency, setCurrency] = useState("INR");
  const [emailSearch, setEmailSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [searchError, setSearchError] = useState("");
  const [members, setMembers] = useState<FoundUser[]>([]);
  const [loading, setLoading] = useState(false);

  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  const [nameFocused, setNameFocused] = useState(false);

  const searchUser = async () => {
    if (!emailSearch.trim()) return;
    setSearching(true); setSearchError(""); setFoundUser(null);
    try {
      const res = await users.findByEmail(emailSearch.trim().toLowerCase());
      const list: FoundUser[] = res.data;
      if (!list || list.length === 0) {
        setSearchError("No user found with that email.");
      } else {
        const found = list[0];
        if (found.id === user?.userId) {
          setSearchError("That's you — you're added automatically.");
        } else if (members.some((m) => m.id === found.id)) {
          setSearchError("Already added.");
        } else {
          setFoundUser(found);
        }
      }
    } catch (error: any) {
      setSearchError(error.response?.data?.error || error.message || "Search failed.");
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
    for (let i = 0; i < 8; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    return pwd;
  };

  const inviteNewUser = async () => {
    setInviteError(""); setInviteSuccess("");
    if (!inviteName.trim() || !inviteEmail.trim()) { setInviteError("Name and email are required"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) { setInviteError("Invalid email format"); return; }
    if (members.some((m) => m.email.toLowerCase() === inviteEmail.toLowerCase())) {
      setInviteError("This user is already added"); return;
    }
    setInviting(true);
    try {
      const tempPassword = generateTempPassword();
      const res = await users.create({ name: inviteName.trim(), email: inviteEmail.trim() });
      const newUser = { id: res.data.id, name: inviteName.trim(), email: inviteEmail.trim() };
      try {
        await emailApi.sendWelcome(inviteEmail.trim(), inviteName.trim(), tempPassword, groupName || "a group", user?.name || "A friend");
      } catch { /* email non-critical */ }
      setMembers((prev) => [...prev, newUser]);
      setInviteName(""); setInviteEmail("");
      setInviteSuccess(`${inviteName.trim()} invited! They'll receive login credentials via email.`);
      setTimeout(() => setInviteSuccess(""), 4000);
    } catch (error: any) {
      setInviteError(error.response?.data?.error || error.message || "Failed to invite user");
    } finally {
      setInviting(false);
    }
  };

  const createGroup = async () => {
    if (!groupName.trim()) { Alert.alert("Error", "Enter a group name"); return; }
    if (members.length === 0) { Alert.alert("Error", "Add at least one member"); return; }
    setLoading(true);
    try {
      const res = await groups.create({ name: groupName.trim(), memberIds: members.map((m) => m.id), currency, emoji });
      if (res.data?.id) {
        router.replace(`/${res.data.id}`);
      } else {
        Alert.alert("Error", "Invalid response from server");
      }
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || error.message || "Failed to create group.");
    } finally {
      setLoading(false);
    }
  };

  const hPad = r.hPad + r.s(16);
  const canCreate = groupName.trim().length > 0 && members.length > 0 && !loading;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* ── HEADER ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.purpleLight }]}>
          <Text style={{ fontSize: 18, color: PURPLE }}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Create Group</Text>
        <TouchableOpacity
          onPress={createGroup}
          disabled={!canCreate}
          style={[styles.createHeaderBtn, !canCreate && styles.createHeaderBtnOff]}
        >
          {loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.createHeaderBtnText}>Create</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: hPad, paddingTop: r.s(16), paddingBottom: insets.bottom + r.s(120) }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── TOP CARD: Emoji + Name + Currency ── */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: r.s(18), padding: r.s(20), marginBottom: r.s(14) }]}>
          <View style={{ flexDirection: "row", gap: r.s(16), alignItems: "flex-start" }}>
            {/* Emoji circle */}
            <View style={{ alignItems: "center" }}>
              <TouchableOpacity
                style={[styles.emojiCircle, { width: r.s(80), height: r.s(80), borderRadius: r.s(40) }]}
                onPress={() => setShowEmojiGrid(!showEmojiGrid)}
                activeOpacity={0.85}
              >
                <Text style={{ fontSize: r.fs(38) }}>{emoji}</Text>
              </TouchableOpacity>
              <View style={[styles.editBadge, { width: r.s(22), height: r.s(22), borderRadius: r.s(11), top: -r.s(4), right: -r.s(4), backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={{ fontSize: r.fs(11) }}>✏️</Text>
              </View>
              <Text style={{ fontSize: r.fs(10), color: colors.textSecondary, marginTop: r.s(6), fontWeight: "600" }}>
                {showEmojiGrid ? "CLOSE" : "CHANGE"}
              </Text>
            </View>

            {/* Name + Currency */}
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionLabel, { fontSize: r.fs(11), marginBottom: r.s(8), color: colors.textSecondary }]}>GROUP NAME</Text>
              <TextInput
                style={[
                  styles.input,
                  { fontSize: r.fs(15), padding: r.s(12), borderRadius: r.s(12), marginBottom: r.s(14), color: colors.text, backgroundColor: colors.card, borderColor: colors.border },
                  nameFocused && { borderColor: PURPLE, backgroundColor: colors.purpleLight },
                ]}
                placeholder="e.g., Goa Trip, Roommates"
                placeholderTextColor={colors.textSecondary}
                value={groupName}
                onChangeText={setGroupName}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
              />
              <Text style={[styles.sectionLabel, { fontSize: r.fs(11), marginBottom: r.s(8), color: colors.textSecondary }]}>CURRENCY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: r.s(6) }}>
                {CURRENCIES.map((c) => (
                  <TouchableOpacity
                    key={c.code}
                    style={[
                      styles.currPill,
                      { paddingHorizontal: r.s(10), paddingVertical: r.s(7), borderRadius: r.s(20), backgroundColor: colors.card, borderColor: colors.border },
                      currency === c.code && { backgroundColor: colors.purpleLight, borderColor: PURPLE },
                    ]}
                    onPress={() => setCurrency(c.code)}
                  >
                    <Text style={{ fontSize: r.fs(13), fontWeight: "700", color: currency === c.code ? PURPLE : colors.textSecondary }}>
                      {c.symbol} {c.code}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Emoji grid */}
          {showEmojiGrid && (
            <View style={{ marginTop: r.s(16) }}>
              <View style={{ height: 1, backgroundColor: colors.border, marginBottom: r.s(14) }} />
              <Text style={[styles.sectionLabel, { fontSize: r.fs(11), marginBottom: r.s(10), color: colors.textSecondary }]}>PICK AN EMOJI</Text>
              <View style={styles.emojiGrid}>
                {GROUP_EMOJIS.map((e) => (
                  <TouchableOpacity
                    key={e}
                    style={[
                      styles.emojiBtn,
                      { width: r.s(44), height: r.s(44), borderRadius: r.s(12), backgroundColor: colors.card, borderColor: colors.border },
                      emoji === e && { borderColor: PURPLE, backgroundColor: colors.purpleLight },
                    ]}
                    onPress={() => { setEmoji(e); setShowEmojiGrid(false); }}
                  >
                    <Text style={{ fontSize: r.fs(22) }}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* ── ADD MEMBERS CARD ── */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: r.s(18), padding: r.s(20), marginBottom: r.s(14) }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: r.s(10), marginBottom: r.s(16) }}>
            <Text style={[styles.cardTitle, { fontSize: r.fs(16), color: colors.text }]}>Add Members</Text>
            <View style={styles.memberBadge}>
              <Text style={styles.memberBadgeText}>{members.length + 1} Selected</Text>
            </View>
          </View>

          {/* Email search */}
          <View style={[styles.searchRow, { gap: r.s(10), marginBottom: r.s(4) }]}>
            <TextInput
              style={[styles.input, { flex: 1, fontSize: r.fs(14), padding: r.s(12), borderRadius: r.s(12), color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
              placeholder="friend@example.com"
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              value={emailSearch}
              onChangeText={(t) => { setEmailSearch(t); setSearchError(""); setFoundUser(null); }}
              returnKeyType="search"
              onSubmitEditing={searchUser}
            />
            <TouchableOpacity
              style={[styles.searchBtn, { paddingHorizontal: r.s(16), borderRadius: r.s(12), minWidth: r.s(64) }, !emailSearch.trim() && { backgroundColor: colors.border }]}
              onPress={searchUser}
              disabled={!emailSearch.trim() || searching}
            >
              {searching
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.searchBtnText}>Find</Text>}
            </TouchableOpacity>
          </View>

          {!!searchError && (
            <Text style={{ fontSize: r.fs(12), color: "#e11d48", marginBottom: r.s(8), fontWeight: "500" }}>{searchError}</Text>
          )}

          {/* Found user */}
          {foundUser && (
            <View style={[styles.foundCard, { borderRadius: r.s(12), padding: r.s(12), marginBottom: r.s(8) }]}>
              <View style={[styles.foundAvatar, { width: r.s(38), height: r.s(38), borderRadius: r.s(19) }]}>
                <Text style={{ fontSize: r.fs(16), fontWeight: "800", color: "#16a34a" }}>{foundUser.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: r.fs(14), fontWeight: "700", color: "#0f172a" }}>{foundUser.name}</Text>
                <Text style={{ fontSize: r.fs(12), color: "#64748b" }}>{foundUser.email}</Text>
              </View>
              <TouchableOpacity style={[styles.addBtn, { paddingHorizontal: r.s(14), paddingVertical: r.s(8), borderRadius: r.s(20) }]} onPress={addMember}>
                <Text style={styles.addBtnText}>+ Add</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Creator row */}
          <View style={[styles.memberRow, { borderRadius: r.s(12), padding: r.s(12), marginBottom: r.s(6), backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.memberAvatar, { width: r.s(40), height: r.s(40), borderRadius: r.s(20), backgroundColor: PURPLE }]}>
              <Text style={{ fontSize: r.fs(16), fontWeight: "900", color: "white" }}>
                {user?.name?.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: r.fs(14), fontWeight: "700", color: colors.text }}>{user?.name} (You)</Text>
              <Text style={{ fontSize: r.fs(12), color: colors.textSecondary }}>{user?.email}</Text>
            </View>
            <View style={[styles.creatorChip, { backgroundColor: colors.purpleLight }]}>
              <Text style={styles.creatorChipText}>Creator</Text>
            </View>
          </View>

          {/* Added members */}
          {members.map((m) => (
            <View key={m.id} style={[styles.memberRow, { borderRadius: r.s(12), padding: r.s(12), marginBottom: r.s(6), backgroundColor: colors.card, borderColor: PURPLE, borderWidth: 1 }]}>
              <View style={[styles.memberAvatar, { width: r.s(40), height: r.s(40), borderRadius: r.s(20), backgroundColor: colors.purpleLight }]}>
                <Text style={{ fontSize: r.fs(16), fontWeight: "700", color: PURPLE }}>{m.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: r.fs(14), fontWeight: "700", color: colors.text }}>{m.name}</Text>
                <Text style={{ fontSize: r.fs(12), color: colors.textSecondary }}>{m.email}</Text>
              </View>
              <TouchableOpacity
                onPress={() => removeMember(m.id)}
                style={[styles.removeBtn, { width: r.s(28), height: r.s(28), borderRadius: r.s(14), backgroundColor: "rgba(225,29,72,0.12)" }]}
              >
                <Text style={{ fontSize: r.fs(13), color: "#e11d48", fontWeight: "700" }}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          {members.length === 0 && !foundUser && (
            <View style={{ alignItems: "center", paddingVertical: r.s(16) }}>
              <Text style={{ fontSize: r.fs(13), color: colors.textSecondary, textAlign: "center" }}>
                Search by email to find members, or invite new users below
              </Text>
            </View>
          )}
        </View>

        {/* ── INVITE NEW USER CARD ── */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: r.s(18), padding: r.s(20), marginBottom: r.s(14) }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: r.s(10), marginBottom: r.s(16) }}>
            <View style={[styles.inviteIcon, { width: r.s(36), height: r.s(36), borderRadius: r.s(10), backgroundColor: colors.purpleLight }]}>
              <Text style={{ fontSize: r.fs(18) }}>📨</Text>
            </View>
            <Text style={[styles.cardTitle, { fontSize: r.fs(16), color: colors.text }]}>Invite New User</Text>
          </View>

          {!!inviteError && (
            <View style={[styles.errorBox, { borderRadius: r.s(10), padding: r.s(10), marginBottom: r.s(12) }]}>
              <Text style={{ fontSize: r.fs(12), color: "#e11d48", fontWeight: "600" }}>⚠️ {inviteError}</Text>
            </View>
          )}
          {!!inviteSuccess && (
            <View style={[styles.successBox, { borderRadius: r.s(10), padding: r.s(10), marginBottom: r.s(12) }]}>
              <Text style={{ fontSize: r.fs(12), color: "#16a34a", fontWeight: "600" }}>✓ {inviteSuccess}</Text>
            </View>
          )}

          <Text style={[styles.sectionLabel, { fontSize: r.fs(11), marginBottom: r.s(8), color: colors.textSecondary }]}>NAME</Text>
          <TextInput
            style={[styles.input, { fontSize: r.fs(14), padding: r.s(12), borderRadius: r.s(12), marginBottom: r.s(12), color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
            placeholder="e.g., John Doe"
            placeholderTextColor={colors.textSecondary}
            value={inviteName}
            onChangeText={setInviteName}
          />
          <Text style={[styles.sectionLabel, { fontSize: r.fs(11), marginBottom: r.s(8), color: colors.textSecondary }]}>EMAIL</Text>
          <TextInput
            style={[styles.input, { fontSize: r.fs(14), padding: r.s(12), borderRadius: r.s(12), marginBottom: r.s(16), color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
            placeholder="john@example.com"
            placeholderTextColor={colors.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            value={inviteEmail}
            onChangeText={setInviteEmail}
          />

          <TouchableOpacity
            style={[styles.inviteBtn, { padding: r.s(14), borderRadius: r.s(12) }, inviting && { backgroundColor: "#C4B5FD" }]}
            onPress={inviteNewUser}
            disabled={inviting || !inviteName.trim() || !inviteEmail.trim()}
          >
            {inviting
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.inviteBtnText}>📧  Send Invite & Add</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── BOTTOM BAR ── */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + r.s(16), paddingHorizontal: hPad, backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.createBtn, { padding: r.s(16), borderRadius: r.s(999) }, !canCreate && styles.createBtnOff]}
          onPress={createGroup}
          disabled={!canCreate}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.createBtnText}>👥  Create Group</Text>}
        </TouchableOpacity>
        <Text style={{ fontSize: r.fs(11), color: colors.textSecondary, textAlign: "center", marginTop: r.s(10) }}>
          {members.length === 0 ? "Add at least one member to continue" : `You + ${members.length} member${members.length > 1 ? "s" : ""} · ${currency}`}
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "800" },
  createHeaderBtn: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20, backgroundColor: PURPLE },
  createHeaderBtnOff: { backgroundColor: "#C4B5FD" },
  createHeaderBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  card: {
    borderWidth: 1,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  cardTitle: { fontWeight: "800" },

  emojiCircle: {
    backgroundColor: PURPLE, alignItems: "center", justifyContent: "center",
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  editBadge: {
    position: "absolute",
    borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
  },
  emojiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  emojiBtn: { borderWidth: 2, alignItems: "center", justifyContent: "center" },

  sectionLabel: { fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  input: { borderWidth: 1.5 },
  currPill: { borderWidth: 1.5 },

  searchRow: { flexDirection: "row" },
  searchBtn: { backgroundColor: PURPLE, alignItems: "center", justifyContent: "center" },
  searchBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  memberBadge: { backgroundColor: PURPLE, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 3 },
  memberBadgeText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  foundCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0",
  },
  foundAvatar: { backgroundColor: "#dcfce7", alignItems: "center", justifyContent: "center" },
  addBtn: { backgroundColor: "#16a34a" },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  memberRow: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1 },
  memberAvatar: { alignItems: "center", justifyContent: "center" },
  creatorChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  creatorChipText: { fontSize: 12, fontWeight: "700", color: PURPLE },
  removeBtn: { alignItems: "center", justifyContent: "center" },

  inviteIcon: { alignItems: "center", justifyContent: "center" },
  inviteBtn: { backgroundColor: PURPLE, alignItems: "center" },
  inviteBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  errorBox: { backgroundColor: "#fff1f2", borderWidth: 1, borderColor: "#fecdd3" },
  successBox: { backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0" },

  bottomBar: { paddingTop: 14, borderTopWidth: 1 },
  createBtn: { backgroundColor: PURPLE, alignItems: "center" },
  createBtnOff: { backgroundColor: "#C4B5FD" },
  createBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
