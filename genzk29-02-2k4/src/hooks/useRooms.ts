import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Room {
  id: string;
  room_code: string;
  client_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useRooms = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = useCallback(async () => {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRooms(data as Room[]);
    }
    setLoading(false);
  }, []);

  const createRoom = async (): Promise<Room | null> => {
    const { data, error } = await supabase
      .from("rooms")
      .insert({})
      .select()
      .single();

    if (!error && data) {
      setRooms((prev) => [data as Room, ...prev]);
      return data as Room;
    }
    return null;
  };

  const getRoomByCode = async (code: string): Promise<Room | null> => {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("room_code", code)
      .eq("is_active", true)
      .maybeSingle();

    if (!error && data) {
      return data as Room;
    }
    return null;
  };

  const updateClientName = async (roomId: string, name: string) => {
    await supabase
      .from("rooms")
      .update({ client_name: name })
      .eq("id", roomId);
  };

  const deleteRoom = async (roomId: string) => {
    await supabase
      .from("rooms")
      .update({ is_active: false })
      .eq("id", roomId);
    setRooms((prev) => prev.filter((room) => room.id !== roomId));
  };

  useEffect(() => {
    fetchRooms();

    const channel = supabase
      .channel("rooms-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
        },
        (payload) => {
          if (payload.eventType === "INSERT" && (payload.new as Room).is_active) {
            setRooms((prev) => [payload.new as Room, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            if (!(payload.new as Room).is_active) {
              setRooms((prev) => prev.filter((r) => r.id !== payload.new.id));
            } else {
              setRooms((prev) =>
                prev.map((r) =>
                  r.id === payload.new.id ? (payload.new as Room) : r
                )
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRooms]);

  return { rooms, loading, createRoom, getRoomByCode, updateClientName, deleteRoom };
};
