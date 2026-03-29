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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/auth";
import { useResponsive } from "@/utils/responsive";

const INDIGO = "#4f46e5";

export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const { s, fs, isTablet, hPad, contentWidth } = useResponsive();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  const handleLogin = async () => {
    setError("");
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    const result = await login(email.trim().toLowerCase(), password);
    if (result.error) setError(result.error);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Decorative background blobs */}
      <View style={[styles.blob1, { width: s(280), height: s(280), borderRadius: s(140), top: -s(80), right: -s(90) }]} />
      <View style={[styles.blob2, { width: s(200), height: s(200), borderRadius: s(100), bottom: s(80), left: -s(70) }]} />
      <View style={[styles.blob3, { width: s(120), height: s(120), borderRadius: s(60), top: s(200), left: s(40) }]} />

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
        {/* Hero */}
        <View style={[styles.hero, { marginBottom: s(36) }]}>
          {/* Outer ring */}
          <View style={[styles.logoRing, { width: s(104), height: s(104), borderRadius: s(52), marginBottom: s(20) }]}>
            <View style={[styles.logoCircle, { width: s(88), height: s(88), borderRadius: s(44) }]}>
              <Text style={{ fontSize: fs(40) }}>💸</Text>
            </View>
          </View>
          <Text style={[styles.appName, { fontSize: fs(36) }]}>Splitwise</Text>
          <Text style={[styles.tagline, { fontSize: fs(15) }]}>
            Split expenses with friends, effortlessly.
          </Text>
        </View>

        {/* Card — constrained width on tablet */}
        <View style={[styles.card, { maxWidth: contentWidth, width: "100%", alignSelf: "center", borderRadius: s(28), padding: s(28) }]}>
          {/* Card top accent strip */}
          <View style={[styles.cardAccent, { borderRadius: s(4) }]} />

          <Text style={[styles.cardTitle, { fontSize: fs(22), marginBottom: s(20) }]}>Sign In</Text>

          {!!error && (
            <View style={[styles.errorBox, { borderRadius: s(12), padding: s(12), marginBottom: s(16) }]}>
              <Text style={[styles.errorText, { fontSize: fs(13) }]}>⚠️  {error}</Text>
            </View>
          )}

          <Text style={[styles.label, { fontSize: fs(11) }]}>Email</Text>
          <TextInput
            style={[
              styles.input,
              { fontSize: fs(15), padding: s(14), borderRadius: s(14), marginBottom: s(16) },
              emailFocused && styles.inputFocused,
            ]}
            placeholder="you@example.com"
            placeholderTextColor="#94a3b8"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
            returnKeyType="next"
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
          />

          <Text style={[styles.label, { fontSize: fs(11) }]}>Password</Text>
          <TextInput
            style={[
              styles.input,
              { fontSize: fs(15), padding: s(14), borderRadius: s(14), marginBottom: s(24) },
              passFocused && styles.inputFocused,
            ]}
            placeholder="••••••••"
            placeholderTextColor="#94a3b8"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            onFocus={() => setPassFocused(true)}
            onBlur={() => setPassFocused(false)}
          />

          <TouchableOpacity
            style={[styles.btn, { padding: s(16), borderRadius: s(14) }, isLoading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.btnText, { fontSize: fs(16) }]}>Sign In →</Text>
            )}
          </TouchableOpacity>

          <View style={[styles.hintRow, { marginTop: s(20) }]}>
            <View style={styles.hintLine} />
            <Text style={[styles.hint, { fontSize: fs(11), marginHorizontal: s(10) }]}>Demo Account</Text>
            <View style={styles.hintLine} />
          </View>
          <Text style={[styles.hintDetail, { fontSize: fs(12), marginTop: s(8) }]}>
            demo@example.com  ·  password123
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: INDIGO,
    overflow: "hidden",
  },
  blob1: { position: "absolute", backgroundColor: "rgba(255,255,255,0.09)" },
  blob2: { position: "absolute", backgroundColor: "rgba(255,255,255,0.06)" },
  blob3: { position: "absolute", backgroundColor: "rgba(255,255,255,0.04)" },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
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
  appName: {
    fontWeight: "900",
    color: "#fff",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  tagline: {
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
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
    backgroundColor: INDIGO,
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
    borderColor: INDIGO,
    backgroundColor: "#f5f3ff",
  },
  btn: {
    backgroundColor: INDIGO,
    alignItems: "center",
    shadowColor: INDIGO,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: {
    backgroundColor: "#a5b4fc",
    shadowOpacity: 0,
    elevation: 0,
  },
  btnText: {
    color: "#fff",
    fontWeight: "700",
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  hintLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e2e8f0",
  },
  hint: {
    color: "#94a3b8",
    fontWeight: "600",
  },
  hintDetail: {
    color: "#64748b",
    textAlign: "center",
    fontWeight: "500",
  },
});
