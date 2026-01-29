import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Phone, Video, MoreVertical, Trash2, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import ChatBubble from "./ChatBubble";
import ChatInput from "./ChatInput";
import WebRTCCall from "./WebRTCCall";
import IncomingCallNotification from "./IncomingCallNotification";
import { useMessages } from "@/hooks/useMessages";
import { toast } from "sonner";
import { socket } from "@/components/socket";

interface ChatRoomProps {
  roomId: string;
  roomCode: string;
  isAdmin: boolean;
  clientName?: string;
  onBack?: () => void;
}

const ChatRoom = ({
  roomId,
  roomCode,
  isAdmin,
  clientName,
  onBack,
}: ChatRoomProps) => {
  const { messages, loading, sendMessage, markAsRead, deleteMessage } =
    useMessages(roomId);
  const [isCallOpen, setIsCallOpen] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [autoStart, setAutoStart] = useState(false);
  const [autoDelete, setAutoDelete] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const displayName = isAdmin
    ? clientName || `Guest #${roomCode.slice(0, 4)}`
    : "Admin";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (content: string) => {
    await sendMessage(content, isAdmin ? "admin" : "client");
  };

  // Share a call link in chat
  const handleShareCallLink = async (isVideo: boolean) => {
    const callType = isVideo ? "Video" : "Voice";
    const callMarker = isVideo ? "[VIDEO_CALL]" : "[AUDIO_CALL]";
    const emoji = isVideo ? "📹" : "📞";
    
    const message = `${emoji} ${callType} Call Link: Click to join the call! ${callMarker}`;
    await sendMessage(message, isAdmin ? "admin" : "client");
    toast.success(`${callType} call link shared!`);
  };

  // Start a call directly
  const handleStartCall = (isVideo: boolean) => {
    setIsVideoCall(isVideo);
    setAutoStart(true);
    setIsCallOpen(true);
  };

  // Join a call from a shared link or accept incoming
  const handleJoinCall = (isVideo: boolean) => {
    setIsVideoCall(isVideo);
    setAutoStart(false);
    setIsCallOpen(true);
  };

  // Reject incoming call
  const handleRejectCall = async () => {
    socket.emit("signal", {
      roomId,
      senderType: isAdmin ? "admin" : "client",
      signalType: "call-reject",
      signalData: {},
    });
  };

  const handleCloseCall = () => {
    setIsCallOpen(false);
    setAutoStart(false);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Incoming call notification */}
      <IncomingCallNotification
        roomId={roomId}
        isAdmin={isAdmin}
        onAccept={handleJoinCall}
        onReject={handleRejectCall}
      />

      {/* Header */}
      <header className="glass border-b border-border/50 px-4 py-3 flex items-center gap-3 shrink-0">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="shrink-0 text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center shrink-0">
            <span className="text-lg font-display font-bold text-primary-foreground">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <h2 className="font-display font-semibold text-foreground truncate">
              {displayName}
            </h2>
            <p className="text-xs text-muted-foreground">Online</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Share Call Link Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-primary hover:text-primary/80"
              >
                <Link className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-popover border-border">
              <DropdownMenuItem onClick={() => handleShareCallLink(true)}>
                <Video className="w-4 h-4 mr-2" />
                Share Video Call Link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShareCallLink(false)}>
                <Phone className="w-4 h-4 mr-2" />
                Share Voice Call Link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Direct Call Buttons */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleStartCall(false)}
            className="text-primary hover:text-primary/80"
            title="Start Voice Call"
          >
            <Phone className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleStartCall(true)}
            className="text-primary hover:text-primary/80"
            title="Start Video Call"
          >
            <Video className="w-5 h-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-foreground">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover border-border">
              <div className="px-3 py-2 flex items-center justify-between">
                <Label
                  htmlFor="auto-delete"
                  className="text-sm text-foreground cursor-pointer"
                >
                  Auto-delete on read
                </Label>
                <Switch
                  id="auto-delete"
                  checked={autoDelete}
                  onCheckedChange={setAutoDelete}
                />
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Clear all messages
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-full gradient-glow flex items-center justify-center mb-4">
              <span className="text-4xl">💬</span>
            </div>
            <h3 className="font-display font-semibold text-foreground mb-2">
              No messages yet
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Start the conversation! Messages will auto-delete after being read.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatBubble
              key={msg.id}
              content={msg.content}
              isOwn={
                (isAdmin && msg.sender_type === "admin") ||
                (!isAdmin && msg.sender_type === "client")
              }
              isRead={msg.is_read}
              timestamp={msg.created_at}
              onRead={() => markAsRead(msg.id)}
              onDelete={() => deleteMessage(msg.id)}
              autoDeleteOnRead={autoDelete}
              onJoinCall={handleJoinCall}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} />

      {/* WebRTC Call */}
      {isCallOpen && (
        <WebRTCCall
          roomId={roomId}
          isAdmin={isAdmin}
          participantName={displayName}
          onClose={handleCloseCall}
          autoStart={autoStart}
          isVideoCall={isVideoCall}
        />
      )}
    </div>
  );
};

export default ChatRoom;
