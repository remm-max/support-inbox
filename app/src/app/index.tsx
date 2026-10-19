import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { fetchTickets, type Ticket } from "../lib/api";

export default function Inbox() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setTickets(await fetchTickets());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Inbox</Text>
      {error && (
        <Text style={styles.error}>
          Can't reach the API: {error}. Check that it's running and that
          EXPO_PUBLIC_API_URL points to it.
        </Text>
      )}
      <FlatList
        data={tickets}
        keyExtractor={(t) => t.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          !error ? <Text style={styles.empty}>No tickets yet. Run "npm run seed" in api/.</Text> : null
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowTop}>
              <Text style={styles.subject} numberOfLines={1}>{item.subject}</Text>
              <Text style={[styles.status, item.status === "OPEN" ? styles.open : styles.closed]}>
                {item.status === "OPEN" ? "Open" : "Closed"}
              </Text>
            </View>
            <Text style={styles.meta}>{item.customerEmail}</Text>
            <Text style={styles.preview} numberOfLines={2}>{item.body}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FAFAF9", paddingTop: 56, paddingHorizontal: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 12, color: "#1C1917" },
  error: { color: "#B91C1C", marginBottom: 12, lineHeight: 20 },
  empty: { color: "#78716C", marginTop: 24 },
  row: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#D6D3D1" },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  subject: { flex: 1, fontSize: 16, fontWeight: "600", color: "#1C1917" },
  status: { fontSize: 12, fontWeight: "600" },
  open: { color: "#047857" },
  closed: { color: "#78716C" },
  meta: { fontSize: 13, color: "#78716C", marginTop: 2 },
  preview: { fontSize: 14, color: "#44403C", marginTop: 6, lineHeight: 20 },
});
