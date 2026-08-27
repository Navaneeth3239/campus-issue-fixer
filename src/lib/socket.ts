import { io, type Socket } from "socket.io-client";
import { SOCKET_URL, getToken } from "./api";

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  if (typeof window === "undefined" || !SOCKET_URL) return null;
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket"],
      autoConnect: true,
      auth: { token: getToken() },
      reconnectionAttempts: 5,
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
