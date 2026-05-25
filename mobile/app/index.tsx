import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { api, type AuthMode } from "../src/api/client";
import { useAuth } from "../src/state/AuthContext";

export default function LoginScreen() {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/chats");
    }
  }, [loading, user]);

  async function submit() {
    setSubmitting(true);
    setError(null);

    try {
      await api.requestOtp(phone, mode);
      router.push({ pathname: "/otp", params: { phone, mode } });
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <ActivityIndicator style={styles.loader} />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Pulse Chat</Text>
        <Text style={styles.subtitle}>
          {mode === "signin" ? "Sign in with your phone number." : "Create your account with phone OTP."}
        </Text>
        <View style={styles.toggle}>
          <Pressable
            style={[styles.toggleButton, mode === "signin" ? styles.toggleButtonActive : null]}
            onPress={() => {
              setMode("signin");
              setError(null);
            }}
          >
            <Text style={[styles.toggleText, mode === "signin" ? styles.toggleTextActive : null]}>
              Sign in
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggleButton, mode === "signup" ? styles.toggleButtonActive : null]}
            onPress={() => {
              setMode("signup");
              setError(null);
            }}
          >
            <Text style={[styles.toggleText, mode === "signup" ? styles.toggleTextActive : null]}>
              Sign up
            </Text>
          </Pressable>
        </View>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+15551234567"
          keyboardType="phone-pad"
          autoComplete="tel"
        />
        <Pressable style={styles.button} onPress={submit} disabled={submitting || !phone.trim()}>
          <Text style={styles.buttonText}>
            {submitting ? "Sending..." : mode === "signin" ? "Sign in" : "Create account"}
          </Text>
        </Pressable>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1 },
  screen: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#eef2f8"
  },
  card: {
    gap: 14,
    borderRadius: 8,
    padding: 22,
    backgroundColor: "#ffffff"
  },
  title: {
    color: "#111827",
    fontSize: 28,
    fontWeight: "800"
  },
  subtitle: {
    color: "#64748b",
    fontSize: 15
  },
  toggle: {
    flexDirection: "row",
    gap: 4,
    borderWidth: 1,
    borderColor: "#dbe3ef",
    borderRadius: 8,
    padding: 4,
    backgroundColor: "#f8fafc"
  },
  toggleButton: {
    flex: 1,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6
  },
  toggleButtonActive: {
    backgroundColor: "#ffffff"
  },
  toggleText: {
    color: "#64748b",
    fontWeight: "800"
  },
  toggleTextActive: {
    color: "#4f46e5"
  },
  input: {
    borderWidth: 1,
    borderColor: "#dbe3ef",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16
  },
  button: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#4f46e5"
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "800"
  },
  error: {
    color: "#dc2626",
    fontWeight: "700"
  }
});
