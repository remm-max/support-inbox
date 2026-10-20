import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// Web has no SecureStore, so it falls back to localStorage.
export async function getItem(key: string): Promise<string | null> {
  try {
    if (Platform.OS === "web") return localStorage.getItem(key);
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === "web") localStorage.setItem(key, value);
    else await SecureStore.setItemAsync(key, value);
  } catch {}
}

export async function removeItem(key: string): Promise<void> {
  try {
    if (Platform.OS === "web") localStorage.removeItem(key);
    else await SecureStore.deleteItemAsync(key);
  } catch {}
}
