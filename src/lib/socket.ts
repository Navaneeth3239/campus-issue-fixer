import { SOCKET_URL, getToken } from "./api";

type SocketClient = {
  emit: (event: string, ...args: unknown[]) => void;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  off: (event: string, handler: (...args: unknown[]) => void) => void;
  disconnect: () => void;
};

let socket: SocketClient | null = null;

/**
 * Socket.io is browser-only — never import socket.io-client during SSR.
 */
export function getSocket(): SocketClient | null {
  if (typeof window === "undefined" || !SOCKET_URL) return null;
  return socket;
}

export async function connectSocket(): Promise<SocketClient | null> {
  if (typeof window === "undefined" || !SOCKET_URL) return null;
  if (socket) return socket;

  const { io } = await import("socket.io-client");
  socket = io(SOCKET_URL, {
    transports: ["websocket"],
    autoConnect: true,
    auth: { token: getToken() },
    reconnectionAttempts: 5,
  }) as SocketClient;

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
