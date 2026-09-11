import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";

export function RealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Determine the Socket.IO URL
    // If we are developing (Vite port), connect to the backend (port 3000)
    // If in production, connect to the current origin
    const isDev = typeof window !== "undefined" && 
      (window.location.port === "5173" || window.location.port === "5174" || window.location.port === "3001");
    
    const socketUrl = isDev ? "http://localhost:3000" : window.location.origin;
    
    console.log("[RealtimeSync] Connecting to Socket.IO at:", socketUrl);
    const socket = io(socketUrl);

    socket.on("connect", () => {
      console.log("[RealtimeSync] Connected successfully to live scoring updates");
    });

    socket.on("matchUpdate", (data) => {
      console.log("[RealtimeSync] Match update received:", data);
      // Invalidate queries so that react-query fetches the latest state
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["medalTally"] });
    });

    socket.on("matchDelete", (matchId) => {
      console.log("[RealtimeSync] Match delete received:", matchId);
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["medalTally"] });
    });

    socket.on("disconnect", () => {
      console.log("[RealtimeSync] Disconnected from live scoring updates");
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  return null; // Logic-only component
}
