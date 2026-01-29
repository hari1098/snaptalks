import { useEffect, useState, useRef } from "react";
import { Phone, Video, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { socket } from "@/components/socket";

interface IncomingCallNotificationProps {
  roomId: string;
  isAdmin: boolean;
  onAccept: (isVideo: boolean) => void;
  onReject: () => void;
}

const IncomingCallNotification = ({
  roomId,
  isAdmin,
  onAccept,
  onReject,
}: IncomingCallNotificationProps) => {
  const [incomingCall, setIncomingCall] = useState<{ isVideo: boolean } | null>(null);
  const senderType = isAdmin ? "admin" : "client";

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }
    
    socket.emit("join-room", roomId);

    const handleSignal = (data: any) => {
          const signal = {
            signal_type: data.signalType,
            signal_data: data.signalData,
            sender_type: data.senderType
          };
          
          console.log("Notification received signal:", signal.signal_type, "from:", signal.sender_type);
          
          // Only show notification if signal is from the other party
          // Backend call_signals allows offer/answer/ice-candidate/call-end/call-reject
          if (signal.sender_type !== senderType && signal.signal_type === "offer") {
            const data = signal.signal_data as unknown as { isVideo?: boolean };
            console.log("Showing incoming call notification (offer), isVideo:", data?.isVideo);
            setIncomingCall({ isVideo: data?.isVideo ?? false });
          }
          
          // Clear notification if call was ended or rejected
          if (signal.signal_type === "call-end" || signal.signal_type === "call-reject") {
            setIncomingCall(null);
          }
    };

    socket.on("signal", handleSignal);

    return () => {
      socket.off("signal", handleSignal);
    };
  }, [roomId, senderType]);

  const handleAccept = () => {
    if (!incomingCall) return;
    const isVideo = incomingCall.isVideo;
    setIncomingCall(null);
    onAccept(isVideo);
  };

  const handleReject = () => {
    setIncomingCall(null);
    onReject();
  };

  if (!incomingCall) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-in-right">
      <div className="bg-card border border-border rounded-2xl p-4 shadow-xl flex items-center gap-4">
        <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center animate-pulse">
          {incomingCall.isVideo ? (
            <Video className="w-6 h-6 text-primary-foreground" />
          ) : (
            <Phone className="w-6 h-6 text-primary-foreground" />
          )}
        </div>
        
        <div>
          <p className="font-medium text-foreground">
            Incoming {incomingCall.isVideo ? "Video" : "Voice"} Call
          </p>
          <p className="text-sm text-muted-foreground">Tap to answer</p>
        </div>

        <div className="flex items-center gap-2 ml-4">
          <Button
            size="icon"
            variant="destructive"
            className="rounded-full"
            onClick={handleReject}
          >
            <PhoneOff className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            className="rounded-full bg-green-500 hover:bg-green-600"
            onClick={handleAccept}
          >
            <Phone className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallNotification;
