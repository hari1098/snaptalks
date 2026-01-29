import { useState, useEffect, useCallback } from "react";
import { socket } from "@/components/socket";

export interface Message {
  id: string;
  room_id: string;
  sender_type: "admin" | "client";
  content: string;
  is_read: boolean;
  created_at: string;
}

export const useMessages = (roomId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!roomId) return;

    try {
      const response = await fetch(`/api/messages/${roomId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  const sendMessage = async (content: string, senderType: "admin" | "client") => {
    if (!roomId) return;

    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_id: roomId, sender_type: senderType, content }),
      });
      return true;
    } catch (error) {
      console.error("Error sending message:", error);
      return false;
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      await fetch(`/api/messages/${messageId}/read`, {
        method: "PUT",
      });
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      await fetch(`/api/messages/${messageId}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  useEffect(() => {
    fetchMessages();

    if (!roomId) return;

    // Ensure we are joined to the room for socket events
    if (!socket.connected) socket.connect();
    socket.emit("join-room", roomId);

    const handleMessageEvent = (event: { type: string; payload: any }) => {
      if (event.type === "INSERT") {
        setMessages((prev) => [...prev, event.payload as Message]);
      } else if (event.type === "UPDATE") {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === event.payload.id ? (event.payload as Message) : msg
          )
        );
      } else if (event.type === "DELETE") {
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== event.payload.id)
        );
      }
    };

    socket.on("message-event", handleMessageEvent);

    return () => {
      socket.off("message-event", handleMessageEvent);
    };
  }, [roomId, fetchMessages]);

  return { messages, loading, sendMessage, markAsRead, deleteMessage };
};
