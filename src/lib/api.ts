import axios from "axios";

export const TOKEN_KEY = "campsolver.token";
export const USER_KEY = "campsolver.user";

export const API_BASE_URL = import.meta.env["VITE_API_BASE_URL"] ?? "";
export const SOCKET_URL = import.meta.env["VITE_SOCKET_URL"] ?? "";
export const SUPABASE_URL = import.meta.env["VITE_SUPABASE_URL"] ?? "";
export const SUPABASE_ANON_KEY = import.meta.env["VITE_SUPABASE_ANON_KEY"] ?? "";
export const SKIP_AUTH = import.meta.env.VITE_SKIP_AUTH === "true";

export function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.set?.("Authorization", `Bearer ${token}`);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const requestUrl = String(error?.config?.url ?? "");
    const isAuthRequest =
      requestUrl.includes("/auth/login") || requestUrl.includes("/auth/register");

    if (
      status === 401 &&
      typeof window !== "undefined" &&
      !SKIP_AUTH &&
      !isAuthRequest &&
      !window.location.pathname.startsWith("/login") &&
      !window.location.pathname.startsWith("/register")
    ) {
      clearSession();
      window.location.replace("/home");
    }
    return Promise.reject(error);
  },
);
