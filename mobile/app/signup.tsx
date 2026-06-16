import React, { useState } from "react";
import { Redirect, useRouter } from "expo-router";
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
import { useAuth } from "@/context/auth";
import { useTheme } from "@/context/theme";
import { useResponsive } from "@/utils/responsive";

const PURPLE = "#7C3AED";
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export default function SignupScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();
  const { s, fs, hPad } = useResponsive();
  const insets = useSafeAreaInsets();

  if (user) return <Redirect href="/" />;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const getPasswordStrength = (pwd: string): number => {
    if (pwd.length === 0) return 0;
    if (pwd.length < 4) return 1;
    if (pwd.length < 6) return 2;
    if (pwd.length < 10) return 3;
    return 4;
  };

  const strength = getPasswordStrength(password);
  const strengthColors = ["#E4D9F7", "#E11D48", "#F59E0B", PURPLE, "#10B981"];

  const handleSignup = async () => {
    setError("");

    if (!name.trim()) {
      setError("Please enter your full name");
      return;
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email");
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
      const res = await fetch(`${API_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Signup failed");
        return;
      }

      Alert.alert(
        "Success",
        "Account created! Please sign in with your credentials.",
        [{ text: "OK", onPress: () => router.replace("/login") }]
      );
    } catch (err) {
      console.error("Signup error:", err);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

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
            <Text style={{ fontSize: s(32) }}>💸</Text>
          </View>
          <Text style={[styles.title, { fontSize: fs(28) }]}>SplitEase</Text>
          <Text style={[styles.subtitle, { fontSize: fs(14), marginTop: s(8) }]}>
            Create your account
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
            </View>
          )}

          {/* Full Name */}
          <View style={{ marginBottom: s(16) }}>
            <Text style={[styles.label, { fontSize: fs(12) }]}>Full Name</Text>
            <TextInput
              style={[styles.input, { fontSize: fs(14), padding: s(12) }]}
              placeholder="John Doe"
              placeholderTextColor="#94a3b8"
              value={name}
              onChangeText={setName}
              editable={!loading}
            />
          </View>

          {/* Email */}
          <View style={{ marginBottom: s(16) }}>
            <Text style={[styles.label, { fontSize: fs(12) }]}>Email</Text>
            <TextInput
              style={[styles.input, { fontSize: fs(14), padding: s(12) }]}
              placeholder="you@example.com"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
            />
          </View>

          {/* Password */}
          <View style={{ marginBottom: s(16) }}>
            <Text style={[styles.label, { fontSize: fs(12) }]}>Password</Text>
            <View style={[styles.inputContainer, { borderRadius: s(10) }]}>
              <TextInput
                style={[
                  styles.passwordInput,
                  { fontSize: fs(14), paddingRight: s(40) },
                ]}
                placeholder="••••••••"
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
                placeholder="••••••••"
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

          {/* Sign Up Button */}
          <TouchableOpacity
            style={[
              styles.btn,
              { padding: s(14), borderRadius: s(10) },
              loading && styles.btnDisabled,
            ]}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.btnText, { fontSize: fs(15) }]}>
                Create Account
              </Text>
            )}
          </TouchableOpacity>

          {/* Sign In Link */}
          <View style={{ marginTop: s(16), flexDirection: "row", justifyContent: "center" }}>
            <Text style={[styles.footerText, { fontSize: fs(13) }]}>
              Already have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.replace("/login")}>
              <Text
                style={[
                  styles.footerLink,
                  { fontSize: fs(13), fontWeight: "600" },
                ]}
              >
                Sign In
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
  input: {
    borderWidth: 1,
    borderColor: "#E4D9F7",
    borderRadius: 10,
    color: "#1D1A24",
    backgroundColor: "#fff",
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
  footerText: {
    color: "#7B7487",
  },
  footerLink: {
    color: "#7C3AED",
  },
});
