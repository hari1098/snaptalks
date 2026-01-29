import { io } from "socket.io-client";

// Connect to the current origin (Vite dev server), which proxies to the backend
export const socket = io({
  autoConnect: false,
});