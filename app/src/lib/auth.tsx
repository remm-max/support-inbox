import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import * as api from "./api";
import * as storage from "./storage";

const TOKEN_KEY = "inbox_token";

type AuthState = {
  user: api.User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, code?: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<api.User | null>(null);
  const [ready, setReady] = useState(false);

  const logout = useCallback(async () => {
    api.setAuthToken(null);
    setUser(null);
    await storage.removeItem(TOKEN_KEY);
  }, []);

  const accept = useCallback(async (payload: api.AuthPayload) => {
    api.setAuthToken(payload.token);
    await storage.setItem(TOKEN_KEY, payload.token);
    setUser(payload.user);
  }, []);

  // On startup: restore a saved token and check it's still valid.
  useEffect(() => {
    (async () => {
      const saved = await storage.getItem(TOKEN_KEY);
      if (saved) {
        api.setAuthToken(saved);
        try {
          const me = await api.fetchMe();
          if (me) setUser(me);
          else await logout();
        } catch {
          await logout();
        }
      }
      setReady(true);
    })();
  }, [logout]);

  // If any request comes back "UNAUTHENTICATED" (expired token), log out.
  useEffect(() => {
    api.setUnauthorizedHandler(() => {
      logout();
    });
    return () => api.setUnauthorizedHandler(null);
  }, [logout]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      ready,
      login: async (email, password) => accept(await api.login(email, password)),
      signup: async (email, password, code) =>
        accept(await api.signup(email, password, code)),
      logout,
    }),
    [user, ready, accept, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Wrap agent-only screens: shows a spinner while checking, redirects to /login if logged out.
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (!user) return <Redirect href="/login" />;
  return <>{children}</>;
}
