import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, ActivityIndicator, Alert, TextInput } from "react-native";
import * as Sharing from "expo-sharing";
import { groups } from "@/api/client";

const PURPLE = "#7C3AED";
const GREEN = "#16a34a";
const RED = "#e11d48";

interface InviteModalProps {
  visible: boolean;
  groupId: number;
  groupName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function InviteModal({ visible, groupId, groupName, onClose, onSuccess }: InviteModalProps) {
  const [loading, setLoading] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const handleGenerateInvite = async () => {
    setLoading(true);
    try {
      const res = await groups.generateInvite(groupId);
      const token = res.data.token || res.data.inviteToken;
      setInviteToken(token);
      const link = `https://split-ease-two.vercel.app/invite?token=${token}`;
      setInviteLink(link);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to generate invite link");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!inviteLink) return;
    try {
      await Sharing.shareAsync(inviteLink, {
        mimeType: "text/plain",
        dialogTitle: `Invite to ${groupName}`,
      });
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to share");
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    try {
      // Copy to clipboard
      const { Clipboard } = require("react-native");
      if (Clipboard) {
        Clipboard.setStringAsync(inviteLink);
        Alert.alert("Copied", "Invite link copied to clipboard!");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to copy link");
    }
  };

  const handleRevoke = async () => {
    Alert.alert("Revoke Invite", "This will invalidate the current invite link. Generate a new one to create a fresh link.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Revoke",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          try {
            await groups.revokeInvite(groupId);
            setInviteToken(null);
            setInviteLink(null);
            Alert.alert("Success", "Invite link revoked");
          } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to revoke invite");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: 300 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#000" }}>Invite to {groupName}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ fontSize: 20, color: "#94a3b8" }}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
              <ActivityIndicator size="large" color={PURPLE} />
            </View>
          ) : inviteLink ? (
            <>
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#64748b", marginBottom: 12, textTransform: "uppercase" }}>Invite Link</Text>
              <View style={{ backgroundColor: "#f1f5f9", borderRadius: 12, padding: 14, marginBottom: 16 }}>
                <Text style={{ fontSize: 13, color: "#334155", lineHeight: 20 }} selectable>
                  {inviteLink}
                </Text>
              </View>

              <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: PURPLE, paddingVertical: 12, borderRadius: 12, alignItems: "center" }}
                  onPress={handleShare}
                >
                  <Text style={{ color: "white", fontWeight: "700", fontSize: 14 }}>📤 Share</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: "#e0f2fe", paddingVertical: 12, borderRadius: 12, alignItems: "center" }}
                  onPress={handleCopyLink}
                >
                  <Text style={{ color: "#0369a1", fontWeight: "700", fontSize: 14 }}>📋 Copy</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={{ backgroundColor: "#fee2e2", paddingVertical: 12, borderRadius: 12, alignItems: "center", marginBottom: 12 }}
                onPress={handleRevoke}
              >
                <Text style={{ color: RED, fontWeight: "700", fontSize: 14 }}>🔒 Revoke Link</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 13, color: "#64748b", marginBottom: 20, lineHeight: 20 }}>
                Generate a shareable invite link for new members to join this group.
              </Text>
              <TouchableOpacity
                style={{ backgroundColor: PURPLE, paddingVertical: 14, borderRadius: 12, alignItems: "center" }}
                onPress={handleGenerateInvite}
              >
                <Text style={{ color: "white", fontWeight: "700", fontSize: 14 }}>🔗 Generate Invite Link</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
