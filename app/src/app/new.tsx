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
  View,
} from "react-native";
import { router } from "expo-router";
import { createTicket } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function NewTicket() {
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [doneId, setDoneId] = useState<string | null>(null);
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const ticket = await createTicket({ customerEmail: email, subject, body });
      setDoneId(ticket.id);
      setSubmitting(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setSubmitting(false);
    }
  };

  if (doneId) {
    return (
      <View style={styles.done}>
        <Text style={styles.doneTitle}>Ticket sent</Text>
        <Text style={styles.doneText}>Thanks, we've received your ticket (#{doneId}).</Text>
        <Pressable
          style={styles.submit}
          onPress={() => {
            setDoneId(null);
            setSubject("");
            setBody("");
          }}
        >
          <Text style={styles.submitText}>Submit another</Text>
        </Pressable>
        {user && (
          <Pressable onPress={() => router.replace("/")}>
            <Text style={styles.doneLink}>Back to inbox</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Your email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <Text style={styles.label}>Subject</Text>
        <TextInput
          style={styles.input}
          value={subject}
          onChangeText={setSubject}
          placeholder="What do you need help with?"
        />

        <Text style={styles.label}>Details</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={body}
          onChangeText={setBody}
          placeholder="Describe the problem"
          multiline
          textAlignVertical="top"
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={[styles.submit, submitting && { opacity: 0.6 }]} onPress={submit} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#FAFAF9" />
          ) : (
            <Text style={styles.submitText}>Send ticket</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  form: { padding: 16, gap: 6 },
  done: { padding: 24, gap: 12, maxWidth: 480, width: "100%", alignSelf: "center" },
  doneTitle: { fontSize: 24, fontWeight: "700", color: "#1C1917" },
  doneText: { fontSize: 16, color: "#44403C", lineHeight: 22 },
  doneLink: { color: "#44403C", textDecorationLine: "underline", textAlign: "center", marginTop: 8 },
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
  multiline: { minHeight: 120 },
  error: { color: "#B91C1C", marginTop: 10 },
  submit: { backgroundColor: "#1C1917", borderRadius: 8, paddingVertical: 13, alignItems: "center", marginTop: 18 },
  submitText: { color: "#FAFAF9", fontWeight: "700", fontSize: 16 },
});
