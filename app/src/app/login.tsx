import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { Redirect, router } from "expo-router";
import { useAuth } from "../lib/auth";

export default function Login() {
  const { user, ready, login, signup } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (ready && user) return <Redirect href="/" />;

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") await login(email, password);
      else await signup(email, password, code);
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setSubmitting(false);
    }
  };

  const isLogin = mode === "login";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>{isLogin ? "Log in" : "Create an agent account"}</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="agent@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder={isLogin ? "Your password" : "At least 8 characters"}
          secureTextEntry
          autoCapitalize="none"
        />

        {!isLogin && (
          <>
            <Text style={styles.label}>Invite code (if you were given one)</Text>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={setCode}
              autoCapitalize="none"
            />
          </>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={[styles.submit, submitting && { opacity: 0.6 }]}
          onPress={submit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FAFAF9" />
          ) : (
            <Text style={styles.submitText}>{isLogin ? "Log in" : "Sign up"}</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => {
            setMode(isLogin ? "signup" : "login");
            setError(null);
          }}
        >
          <Text style={styles.link}>
            {isLogin ? "No account? Sign up" : "Have an account? Log in"}
          </Text>
        </Pressable>

        <Pressable onPress={() => router.push("/new")}>
          <Text style={styles.link}>Customer? Submit a ticket instead</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  form: { padding: 16, gap: 6, maxWidth: 480, width: "100%", alignSelf: "center" },
  heading: { fontSize: 24, fontWeight: "700", color: "#1C1917", marginBottom: 6 },
  label: { fontSize: 14, fontWeight: "600", color: "#44403C", marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#D6D3D1",
    borderRadius: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#1C1917",
  },
  error: { color: "#B91C1C", marginTop: 10 },
  submit: { backgroundColor: "#1C1917", borderRadius: 8, paddingVertical: 13, alignItems: "center", marginTop: 18 },
  submitText: { color: "#FAFAF9", fontWeight: "700", fontSize: 16 },
  link: { color: "#44403C", textDecorationLine: "underline", marginTop: 14, textAlign: "center" },
});
