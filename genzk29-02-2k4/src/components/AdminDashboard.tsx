import { useState } from "react";
import {
  Plus,
  Copy,
  Trash2,
  MessageCircle,
  LogOut,
  Zap,
  Users,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRooms, Room } from "@/hooks/useRooms";
import { logoutAdmin } from "@/lib/adminAuth";
import ChatRoom from "./ChatRoom";
import { toast } from "@/hooks/use-toast";

interface AdminDashboardProps {
  onLogout: () => void;
}

const AdminDashboard = ({ onLogout }: AdminDashboardProps) => {
  const { rooms, loading, createRoom, deleteRoom } = useRooms();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCreateRoom = async () => {
    const room = await createRoom();
    if (room) {
      toast({
        title: "Room created!",
        description: "Share the link with your client to start chatting.",
      });
    }
  };

  const handleCopyLink = (room: Room) => {
    const link = `${window.location.origin}/chat/${room.room_code}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link);
    } else {
      // Fallback for environments without clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
    setCopiedId(room.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: "Link copied!",
      description: "Share this link with your client.",
    });
  };

  const handleLogout = () => {
    logoutAdmin();
    onLogout();
  };

  if (selectedRoom) {
    return (
      <ChatRoom
        roomId={selectedRoom.id}
        roomCode={selectedRoom.room_code}
        isAdmin={true}
        clientName={selectedRoom.client_name || undefined}
        onBack={() => setSelectedRoom(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="glass border-b border-border/50 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="gradient-primary p-2 rounded-xl glow-primary">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl text-gradient">
                SnapTalk
              </h1>
              <p className="text-xs text-muted-foreground">Admin Dashboard</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-foreground">
                  {rooms.length}
                </p>
                <p className="text-xs text-muted-foreground">Active Chats</p>
              </div>
            </div>
          </div>
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-foreground">
                  0
                </p>
                <p className="text-xs text-muted-foreground">Unread</p>
              </div>
            </div>
          </div>
        </div>

        {/* Create room button */}
        <Button
          onClick={handleCreateRoom}
          className="w-full h-14 gradient-primary text-primary-foreground font-semibold rounded-2xl glow-primary hover:opacity-90 gap-2 mb-6"
        >
          <Plus className="w-5 h-5" />
          Create New Chat Room
        </Button>

        {/* Rooms list */}
        <div className="space-y-3">
          <h2 className="font-display font-semibold text-foreground px-1">
            Chat Rooms
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full gradient-glow flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2">
                No active rooms
              </h3>
              <p className="text-sm text-muted-foreground">
                Create a room to start chatting with clients
              </p>
            </div>
          ) : (
            rooms.map((room) => (
              <div
                key={room.id}
                className="glass rounded-2xl p-4 flex items-center gap-3 animate-fade-in"
              >
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => setSelectedRoom(room)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full gradient-accent flex items-center justify-center shrink-0">
                      <span className="text-lg font-display font-bold text-accent-foreground">
                        {(room.client_name || "G").charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate">
                        {room.client_name || `Guest #${room.room_code.slice(0, 4)}`}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Code: {room.room_code}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopyLink(room)}
                    className="text-primary hover:text-primary/80"
                  >
                    {copiedId === room.id ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteRoom(room.id)}
                    className="text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
