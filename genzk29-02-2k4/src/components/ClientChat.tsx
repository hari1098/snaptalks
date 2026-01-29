import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Zap, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ChatRoom from "./ChatRoom";
import { useRooms, Room } from "@/hooks/useRooms";

const ClientChat = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { getRoomByCode, updateClientName } = useRooms();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [name, setName] = useState("");
  const [showNameInput, setShowNameInput] = useState(true);

  useEffect(() => {
    const loadRoom = async () => {
      if (!roomCode) {
        setError(true);
        setLoading(false);
        return;
      }

      const foundRoom = await getRoomByCode(roomCode);
      if (foundRoom) {
        setRoom(foundRoom);
        if (foundRoom.client_name) {
          setShowNameInput(false);
        }
      } else {
        setError(true);
      }
      setLoading(false);
    };

    loadRoom();
  }, [roomCode]);

  const handleJoin = async () => {
    if (!room || !name.trim()) return;
    await updateClientName(room.id, name.trim());
    setShowNameInput(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="glass rounded-2xl p-8 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">
            Room Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            This chat room doesn't exist or has been closed.
          </p>
          <Button
            onClick={() => navigate("/")}
            className="gradient-primary text-primary-foreground rounded-xl"
          >
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  if (showNameInput) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse" />

        <div className="glass rounded-2xl p-8 w-full max-w-md relative animate-scale-in">
          <div className="flex items-center justify-center mb-6">
            <div className="gradient-primary p-3 rounded-2xl glow-primary">
              <Zap className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>

          <h1 className="text-3xl font-display font-bold text-center mb-2 text-gradient">
            SnapTalk
          </h1>
          <p className="text-muted-foreground text-center mb-8">
            Enter your name to join the chat Genz
          </p>

          <div className="space-y-4">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="h-14 bg-muted/50 border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50"
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />

            <Button
              onClick={handleJoin}
              disabled={!name.trim()}
              className="w-full h-14 gradient-primary text-primary-foreground font-semibold rounded-xl glow-primary hover:opacity-90 disabled:opacity-50"
            >
              Join Chat
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ChatRoom
      roomId={room.id}
      roomCode={room.room_code}
      isAdmin={false}
      clientName={room.client_name || name}
    />
  );
};

export default ClientChat;
