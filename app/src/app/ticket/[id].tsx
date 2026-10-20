import { useCallback, useState } from "react";
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
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  addReply,
  fetchTicket,
  setTicketStatus,
  type TicketDetail,
} from "../../lib/api";

const when = (iso: string) => new Date(iso).toLocaleString();

export default function TicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setTicket(await fetchTicket(String(id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [load]),
  );

  const send = async () => {
    if (!ticket) return;
    setSending(true);
    setError(null);
    try {
      await addReply(ticket.id, draft);
      setDraft("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  };

  const toggleStatus = async () => {
    if (!ticket) return;
    try {
      setError(null);
      await setTicketStatus(ticket.id, ticket.status === "OPEN" ? "CLOSED" : "OPEN");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;
  if (!ticket) {
    return (
      <Text style={styles.notFound}>
        {error ?? "That ticket doesn't exist."}
      </Text>
    );
  }

  const isOpen = ticket.status === "OPEN";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.head}>
          <Text style={styles.subject}>{ticket.subject}</Text>
          <Pressable onPress={toggleStatus} style={styles.statusBtn}>
            <Text style={styles.statusBtnText}>{isOpen ? "Close ticket" : "Reopen ticket"}</Text>
          </Pressable>
        </View>
        <Text style={styles.meta}>
          {ticket.customerEmail} · {isOpen ? "Open" : "Closed"}
        </Text>

        <View style={[styles.bubble, styles.customer]}>
          <Text style={styles.bubbleMeta}>Customer · {when(ticket.createdAt)}</Text>
          <Text style={styles.bubbleText}>{ticket.body}</Text>
        </View>

        {ticket.replies.map((r) => (
          <View
            key={r.id}
            style={[styles.bubble, r.author === "AGENT" ? styles.agent : styles.customer]}
          >
            <Text style={styles.bubbleMeta}>
              {r.author === "AGENT" ? "Agent" : "Customer"} · {when(r.createdAt)}
            </Text>
            <Text style={styles.bubbleText}>{r.body}</Text>
          </View>
        ))}

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={styles.composer}>
        <TextInput
          style={styles.composerInput}
          value={draft}
          onChangeText={setDraft}
          placeholder="Write a reply"
          multiline
        />
        <Pressable
          style={[styles.send, (sending || !draft.trim()) && { opacity: 0.5 }]}
          onPress={send}
          disabled={sending || !draft.trim()}
        >
          <Text style={styles.sendText}>Send reply</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10 },
  notFound: { margin: 24, color: "#78716C", fontSize: 16 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  subject: { flex: 1, fontSize: 22, fontWeight: "700", color: "#1C1917" },
  statusBtn: { borderWidth: 1, borderColor: "#D6D3D1", borderRadius: 8, paddingVertical: 7, paddingHorizontal: 10 },
  statusBtnText: { fontSize: 13, fontWeight: "600", color: "#44403C" },
  meta: { color: "#78716C", fontSize: 13, marginBottom: 6 },
  bubble: { borderRadius: 10, padding: 12, maxWidth: "92%" },
  customer: { backgroundColor: "#F0EFED", alignSelf: "flex-start" },
  agent: { backgroundColor: "#DCEFE7", alignSelf: "flex-end" },
  bubbleMeta: { fontSize: 12, color: "#78716C", marginBottom: 4 },
  bubbleText: { fontSize: 15, lineHeight: 21, color: "#1C1917" },
  error: { color: "#B91C1C", marginTop: 6 },
  composer: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#D6D3D1", padding: 12, gap: 8, backgroundColor: "#FAFAF9" },
  composerInput: {
    borderWidth: 1,
    borderColor: "#D6D3D1",
    borderRadius: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 120,
    color: "#1C1917",
  },
  send: { backgroundColor: "#1C1917", borderRadius: 8, paddingVertical: 11, alignItems: "center" },
  sendText: { color: "#FAFAF9", fontWeight: "700" },
});
