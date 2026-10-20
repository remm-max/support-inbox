import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { fetchTickets, type Status, type Ticket } from "../lib/api";

type Filter = Status | "ALL";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "OPEN", label: "Open" },
  { key: "CLOSED", label: "Closed" },
];

export default function Inbox() {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setTickets(await fetchTickets(filter === "ALL" ? undefined : filter));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }, [filter]);

  // Reload whenever this screen gains focus (e.g. after creating or closing a ticket).
  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.toolbar}>
        <View style={styles.filters}>
          {FILTERS.map((f) => (
            <Pressable key={f.key} onPress={() => setFilter(f.key)} style={styles.filterBtn}>
              <Text style={[styles.filterText, filter === f.key && styles.filterActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={styles.newBtn} onPress={() => router.push("/new")}>
          <Text style={styles.newBtnText}>New ticket</Text>
        </Pressable>
      </View>

      {error && (
        <Text style={styles.error}>
          Can't reach the API: {error}. Check that it's running and that
          EXPO_PUBLIC_API_URL points to it.
        </Text>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(t) => t.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            !error ? <Text style={styles.empty}>No tickets here yet.</Text> : null
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => router.push(`/ticket/${item.id}`)}
            >
              <View style={styles.rowTop}>
                <Text style={styles.subject} numberOfLines={1}>
                  {item.subject}
                </Text>
                <Text style={[styles.status, item.status === "OPEN" ? styles.open : styles.closed]}>
                  {item.status === "OPEN" ? "Open" : "Closed"}
                </Text>
              </View>
              <Text style={styles.meta}>{item.customerEmail}</Text>
              <Text style={styles.preview} numberOfLines={2}>
                {item.body}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16 },
  toolbar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  filters: { flexDirection: "row", gap: 4 },
  filterBtn: { paddingVertical: 8, paddingHorizontal: 10 },
  filterText: { fontSize: 15, color: "#78716C" },
  filterActive: { color: "#1C1917", fontWeight: "700" },
  newBtn: { backgroundColor: "#1C1917", paddingVertical: 9, paddingHorizontal: 14, borderRadius: 8 },
  newBtnText: { color: "#FAFAF9", fontWeight: "600" },
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
