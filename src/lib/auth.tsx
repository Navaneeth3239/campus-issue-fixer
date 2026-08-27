import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { USER_KEY, clearSession, getToken, setToken } from "./api";
import { disconnectSocket } from "./socket";
import type { User } from "./types";

/** Set VITE_SKIP_AUTH=true to bypass login and use the app as a guest student. */
export const SKIP_AUTH = import.meta.env.VITE_SKIP_AUTH === "true";

const GUEST_USER: User = {
  id: "guest-student",
  name: "Student",
  email: "student@local",
};

interface AuthState {
  user: User | null;
  ready: boolean;
  isAuthenticated: boolean;
  signIn: (token: string, user: User) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const noop = () => undefined;

const SSR_AUTH_FALLBACK: AuthState = {
  user: null,
  ready: false,
  isAuthenticated: false,
  signIn: noop,
  signOut: noop,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(SKIP_AUTH ? GUEST_USER : null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (SKIP_AUTH) {
      setToken("guest.local");
      window.localStorage.setItem(USER_KEY, JSON.stringify(GUEST_USER));
      setUser(GUEST_USER);
      setReady(true);
      return;
    }

    const token = getToken();
    const raw = window.localStorage.getItem(USER_KEY);
    if (token && raw) {
      try {
        setUser(JSON.parse(raw) as User);
      } catch {
        clearSession();
      }
    }
    setReady(true);
  }, []);

  const signIn = useCallback((token: string, nextUser: User) => {
    setToken(token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const signOut = useCallback(() => {
    clearSession();
    disconnectSocket();
    if (SKIP_AUTH) {
      setToken("guest.local");
      window.localStorage.setItem(USER_KEY, JSON.stringify(GUEST_USER));
      setUser(GUEST_USER);
      return;
    }
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, ready, isAuthenticated: !!user, signIn, signOut }),
    [user, ready, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    if (typeof window === "undefined") return SSR_AUTH_FALLBACK;
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
