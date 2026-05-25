import { useLocalSearchParams, router } from "expo-router";
import { useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "../src/api/client";
import { useAuth } from "../src/state/AuthContext";

export default function OtpScreen() {
  const params = useLocalSearchParams<{ phone: string; mode?: "signin" | "signup" }>();
  const { signIn } = useAuth();
  const [otp, setOtp] = useState("123456");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const phone = params.phone || "";
  const mode = params.mode === "signup" ? "signup" : "signin";

  async function submit() {
    setSubmitting(true);
    setError(null);

    try {
      const result = await api.verifyOtp(phone, otp, mode, name || undefined);
      await signIn(result.token, result.user);
      router.replace("/chats");
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Verify</Text>
        <Text style={styles.subtitle}>
          {mode === "signin" ? "Sign in" : "Sign up"} for {phone}
        </Text>
        <TextInput style={styles.input} value={otp} onChangeText={setOtp} keyboardType="number-pad" />
        {mode === "signup" ? (
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Display name"
            autoComplete="name"
          />
        ) : null}
        <Pressable
          style={styles.button}
          onPress={submit}
          disabled={submitting || !otp.trim() || (mode === "signup" && !name.trim())}
        >
          <Text style={styles.buttonText}>
            {submitting ? "Checking..." : mode === "signin" ? "Verify sign in" : "Create account"}
          </Text>
        </Pressable>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 26,
    fontWeight: "800"
  },
  subtitle: {
    color: "#64748b"
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
