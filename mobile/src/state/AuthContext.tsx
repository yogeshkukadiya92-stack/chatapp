import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import type { ChatUser } from "../types/chat";
import { api, getStoredToken, removeToken, storeToken } from "../api/client";

type AuthContextValue = {
  user: ChatUser | null;
  token: string | null;
  loading: boolean;
  signIn: (token: string, user: ChatUser) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<ChatUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStoredToken()
      .then(async (storedToken) => {
        if (!storedToken) {
          return;
        }

        setToken(storedToken);
        const result = await api.me();
        setUser(result.user);
      })
      .catch(() => removeToken())
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      async signIn(nextToken, nextUser) {
        await storeToken(nextToken);
        setToken(nextToken);
        setUser(nextUser);
      },
      async signOut() {
        await removeToken();
        setToken(null);
        setUser(null);
      }
    }),
    [loading, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return value;
}
