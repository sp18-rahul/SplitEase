import React, { useState } from "react";
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
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/theme";
import { useResponsive } from "@/utils/responsive";
import { authApi } from "@/api/client";

const PURPLE = "#7C3AED";
const PURPLE_LIGHT = "#EDE9FE";
const BG = "#F8F5FF";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { s, fs, hPad, contentWidth } = useResponsive();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);

  const handleSubmit = async () => {
    setError("");
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Please enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      await authApi.forgotPassword(trimmed);
      setSubmitted(true);
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Decorative blobs */}
      <View style={[styles.blob1, { width: s(280), height: s(280), borderRadius: s(140), top: -s(80), right: -s(90) }]} />
      <View style={[styles.blob2, { width: s(200), height: s(200), borderRadius: s(100), bottom: s(80), left: -s(70) }]} />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingHorizontal: hPad + s(24),
            paddingTop: insets.top + s(32),
            paddingBottom: insets.bottom + s(24),
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back button */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { marginBottom: s(24) }]}
          activeOpacity={0.7}
        >
          <Text style={[styles.backBtnText, { fontSize: fs(14) }]}>← Back to Sign In</Text>
        </TouchableOpacity>

        {/* Hero */}
        <View style={[styles.hero, { marginBottom: s(32) }]}>
          <View style={[styles.logoRing, { width: s(96), height: s(96), borderRadius: s(48), marginBottom: s(16) }]}>
            <View style={[styles.logoCircle, { width: s(80), height: s(80), borderRadius: s(40) }]}>
              <Text style={{ fontSize: fs(36) }}>🔐</Text>
            </View>
          </View>
          <Text style={[styles.title, { fontSize: fs(28) }]}>Forgot Password?</Text>
          <Text style={[styles.subtitle, { fontSize: fs(14) }]}>
            No worries! Enter your email and{"\n"}we'll send you a reset link.
          </Text>
        </View>

        {/* Card */}
        <View
          style={[
            styles.card,
            {
              maxWidth: contentWidth,
              width: "100%",
              alignSelf: "center",
              borderRadius: s(28),
              padding: s(28),
            },
          ]}
        >
          <View style={[styles.cardAccent, { borderRadius: s(4) }]} />

          {submitted ? (
            /* ── Success state ── */
            <View style={{ alignItems: "center", paddingVertical: s(8) }}>
              <Text style={{ fontSize: fs(52), marginBottom: s(16) }}>📬</Text>
              <Text style={[styles.successTitle, { fontSize: fs(20), marginBottom: s(12) }]}>
                Check your inbox!
              </Text>
              <Text style={[styles.successBody, { fontSize: fs(13), marginBottom: s(28) }]}>
                If <Text style={{ fontWeight: "700" }}>{email}</Text> is registered, you'll
                receive a password reset link shortly.{"\n"}The link expires in 1 hour.
              </Text>
              <Text style={[styles.spamHint, { fontSize: fs(12), marginBottom: s(24) }]}>
                Can't find it? Check your spam folder.
              </Text>
              <TouchableOpacity
                style={[styles.btn, { padding: s(16), borderRadius: s(14) }]}
                onPress={() => router.replace("/login")}
                activeOpacity={0.85}
              >
                <Text style={[styles.btnText, { fontSize: fs(16) }]}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ── Form state ── */
            <>
              <Text style={[styles.cardTitle, { fontSize: fs(20), marginBottom: s(20) }]}>
                Reset Password
              </Text>

              {!!error && (
                <View style={[styles.errorBox, { borderRadius: s(12), padding: s(12), marginBottom: s(16) }]}>
                  <Text style={[styles.errorText, { fontSize: fs(13) }]}>⚠️  {error}</Text>
                </View>
              )}

              <Text style={[styles.label, { fontSize: fs(11) }]}>Email Address</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    fontSize: fs(15),
                    padding: s(14),
                    borderRadius: s(14),
                    marginBottom: s(24),
                  },
                  emailFocused && styles.inputFocused,
                ]}
                placeholder="you@example.com"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                returnKeyType="send"
                onSubmitEditing={handleSubmit}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />

              <TouchableOpacity
                style={[
                  styles.btn,
                  { padding: s(16), borderRadius: s(14) },
                  loading && styles.btnDisabled,
                ]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.btnText, { fontSize: fs(16) }]}>
                    Send Reset Link →
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PURPLE,
    overflow: "hidden",
  },
  blob1: { position: "absolute", backgroundColor: "rgba(255,255,255,0.09)" },
  blob2: { position: "absolute", backgroundColor: "rgba(255,255,255,0.06)" },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
  },
  backBtn: {
    alignSelf: "flex-start",
  },
  backBtnText: {
    color: "rgba(255,255,255,0.85)",
    fontWeight: "600",
  },
  hero: {
    alignItems: "center",
  },
  logoRing: {
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  logoCircle: {
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  title: {
    fontWeight: "900",
    color: "#fff",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    lineHeight: 22,
  },
  card: {
    backgroundColor: "#fff",
    shadowColor: "#1e1b4b",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 12,
  },
  cardAccent: {
    height: 4,
    backgroundColor: PURPLE,
    marginBottom: 20,
    width: 48,
  },
  cardTitle: {
    fontWeight: "800",
    color: "#0f172a",
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
  label: {
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 2,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    color: "#0f172a",
    backgroundColor: "#f8fafc",
  },
  inputFocused: {
    borderColor: PURPLE,
    backgroundColor: "#EDE9FE",
  },
  btn: {
    backgroundColor: PURPLE,
    alignItems: "center",
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: {
    backgroundColor: "#C4B5FD",
    shadowOpacity: 0,
    elevation: 0,
  },
  btnText: {
    color: "#fff",
    fontWeight: "700",
  },
  successTitle: {
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
  },
  successBody: {
    color: "#475569",
    textAlign: "center",
    lineHeight: 20,
  },
  spamHint: {
    color: "#94a3b8",
    textAlign: "center",
  },
});
