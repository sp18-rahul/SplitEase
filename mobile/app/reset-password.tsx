import React, { useState, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/theme";
import { useResponsive } from "@/utils/responsive";

const PURPLE = "#7C3AED";
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams();
  const { colors } = useTheme();
  const { s, fs, hPad } = useResponsive();
  const insets = useSafeAreaInsets();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing reset token. Please request a new reset link.");
    }
  }, [token]);

  const getPasswordStrength = (pwd: string): number => {
    if (pwd.length === 0) return 0;
    if (pwd.length < 4) return 1;
    if (pwd.length < 6) return 2;
    if (pwd.length < 10) return 3;
    return 4;
  };

  const strength = getPasswordStrength(password);
  const strengthColors = ["#E4D9F7", "#E11D48", "#F59E0B", PURPLE, "#10B981"];

  const handleReset = async () => {
    setError("");

    if (!token) {
      setError("Invalid reset token");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: Array.isArray(token) ? token[0] : token,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to reset password");
        return;
      }

      setSuccess(true);
      Alert.alert(
        "Success",
        "Password reset successfully! You will be redirected to login.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/login"),
          },
        ]
      );
    } catch (err) {
      console.error("Reset password error:", err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View
        style={[
          styles.root,
          { backgroundColor: colors.background, justifyContent: "center", alignItems: "center", paddingHorizontal: hPad + s(20) },
        ]}
      >
        <Text style={{ fontSize: s(48), marginBottom: s(16) }}>✅</Text>
        <Text
          style={[
            styles.successTitle,
            { fontSize: fs(24), marginBottom: s(8) },
          ]}
        >
          Password Reset!
        </Text>
        <Text
          style={[
            styles.successText,
            { fontSize: fs(14), marginBottom: s(24), textAlign: "center" },
          ]}
        >
          Your password has been updated successfully.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: hPad + s(16),
          paddingTop: insets.top + s(20),
          paddingBottom: insets.bottom + s(40),
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={{ marginBottom: s(32), alignItems: "center" }}>
          <View
            style={{
              width: s(60),
              height: s(60),
              backgroundColor: PURPLE,
              borderRadius: s(16),
              alignItems: "center",
              justifyContent: "center",
              marginBottom: s(12),
            }}
          >
            <Text style={{ fontSize: s(32) }}>🔐</Text>
          </View>
          <Text style={[styles.title, { fontSize: fs(28) }]}>Reset Password</Text>
          <Text style={[styles.subtitle, { fontSize: fs(14), marginTop: s(8) }]}>
            Enter your new password
          </Text>
        </View>

        {/* Card */}
        <View
          style={[
            styles.card,
            {
              borderRadius: s(20),
              padding: s(24),
              backgroundColor: colors.surface,
            },
          ]}
        >
          {error && (
            <View
              style={[
                styles.errorBox,
                { borderRadius: s(10), padding: s(12), marginBottom: s(16) },
              ]}
            >
              <Text style={[styles.errorText, { fontSize: fs(13) }]}>
                {error}
              </Text>
              {error.includes("invalid") ||
              error.includes("expired") ? (
                <TouchableOpacity
                  style={{ marginTop: s(8) }}
                  onPress={() => router.push("/forgot-password")}
                >
                  <Text
                    style={[
                      styles.errorLink,
                      { fontSize: fs(12), fontWeight: "600" },
                    ]}
                  >
                    Request a new reset link →
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}

          {/* New Password */}
          <View style={{ marginBottom: s(16) }}>
            <Text style={[styles.label, { fontSize: fs(12) }]}>
              New Password
            </Text>
            <View style={[styles.inputContainer, { borderRadius: s(10) }]}>
              <TextInput
                style={[
                  styles.passwordInput,
                  { fontSize: fs(14), paddingRight: s(40) },
                ]}
                placeholder="At least 6 characters"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                <Text style={{ fontSize: fs(18) }}>
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </Text>
              </TouchableOpacity>
            </View>
            {/* Strength bars */}
            <View style={{ flexDirection: "row", gap: s(4), marginTop: s(8) }}>
              {[1, 2, 3, 4].map((level) => (
                <View
                  key={level}
                  style={{
                    flex: 1,
                    height: s(6),
                    borderRadius: s(3),
                    backgroundColor:
                      strength >= level ? strengthColors[strength] : "#E4D9F7",
                  }}
                />
              ))}
            </View>
          </View>

          {/* Confirm Password */}
          <View style={{ marginBottom: s(24) }}>
            <Text style={[styles.label, { fontSize: fs(12) }]}>
              Confirm Password
            </Text>
            <View style={[styles.inputContainer, { borderRadius: s(10) }]}>
              <TextInput
                style={[
                  styles.passwordInput,
                  { fontSize: fs(14), paddingRight: s(40) },
                ]}
                placeholder="Confirm your new password"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showConfirm}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowConfirm(!showConfirm)}
                disabled={loading}
              >
                <Text style={{ fontSize: fs(18) }}>
                  {showConfirm ? "👁️" : "👁️‍🗨️"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Reset Button */}
          <TouchableOpacity
            style={[
              styles.btn,
              { padding: s(14), borderRadius: s(10) },
              loading && styles.btnDisabled,
            ]}
            onPress={handleReset}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.btnText, { fontSize: fs(15) }]}>
                Reset Password
              </Text>
            )}
          </TouchableOpacity>

          {/* Back to Login Link */}
          <View style={{ marginTop: s(16), flexDirection: "row", justifyContent: "center" }}>
            <TouchableOpacity onPress={() => router.push("/login")}>
              <Text
                style={[
                  styles.backLink,
                  { fontSize: fs(13), fontWeight: "600" },
                ]}
              >
                Back to Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  title: {
    fontWeight: "800",
    color: "#7C3AED",
  },
  subtitle: {
    color: "#7B7487",
  },
  successTitle: {
    fontWeight: "800",
    color: "#1D1A24",
  },
  successText: {
    color: "#7B7487",
  },
  card: {
    backgroundColor: "#fff",
    shadowColor: "#7C3AED",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  label: {
    fontWeight: "600",
    color: "#1D1A24",
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E4D9F7",
    backgroundColor: "#fff",
  },
  passwordInput: {
    flex: 1,
    color: "#1D1A24",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  eyeBtn: {
    paddingRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  btn: {
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: "#fff",
    fontWeight: "700",
  },
  errorBox: {
    backgroundColor: "#fff1f2",
    borderWidth: 1,
    borderColor: "#fecdd3",
  },
  errorText: {
    color: "#e11d48",
    fontWeight: "600",
  },
  errorLink: {
    color: "#7C3AED",
  },
  backLink: {
    color: "#7C3AED",
  },
});
