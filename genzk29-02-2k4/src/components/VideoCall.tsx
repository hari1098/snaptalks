import { useRef, useEffect } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VideoCallProps {
  isOpen: boolean;
  onClose: () => void;
  isAudioOnly?: boolean;
  participantName?: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callStatus: "idle" | "calling" | "receiving" | "connected" | "ended";
  isAudioMuted: boolean;
  isVideoOff: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
  onAnswerCall?: () => void;
  onRejectCall?: () => void;
}

const VideoCall = ({
  isOpen,
  onClose,
  isAudioOnly = false,
  participantName = "User",
  localStream,
  remoteStream,
  callStatus,
  isAudioMuted,
  isVideoOff,
  onToggleAudio,
  onToggleVideo,
  onEndCall,
  onAnswerCall,
  onRejectCall,
}: VideoCallProps) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream to video/audio element
  useEffect(() => {
    if (remoteStream) {
      if (isAudioOnly && remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch((e) => {
          console.log("Remote audio play failed:", e);
        });
      } else if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch((e) => {
          console.log("Remote video play failed:", e);
        });
      }
    }
  }, [remoteStream, isAudioOnly]);

  const handleEndCall = () => {
    onEndCall();
    onClose();
  };

  if (!isOpen) return null;

  const isIncomingCall = callStatus === "receiving";
  const isConnecting = callStatus === "calling";
  const isConnected = callStatus === "connected";

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Main video area */}
      <div className="flex-1 relative bg-gradient-to-br from-card to-muted">
        {/* Remote video / Avatar placeholder */}
        <div className="absolute inset-0 flex items-center justify-center">
          {isConnected && remoteStream && remoteStream.getTracks().length > 0 && !isAudioOnly ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : isConnected && isAudioOnly && remoteStream ? (
            // Audio-only call - show avatar with audio indicator
            <div className="flex flex-col items-center gap-4">
              <div className="w-32 h-32 rounded-full gradient-primary flex items-center justify-center">
                <span className="text-5xl font-display font-bold text-primary-foreground">
                  {participantName.charAt(0).toUpperCase()}
                </span>
              </div>
              <h2 className="text-2xl font-display font-semibold text-foreground">
                {participantName}
              </h2>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-accent animate-pulse" />
                <p className="text-muted-foreground">Connected - Speaking</p>
              </div>
              {/* Hidden audio element for audio-only calls */}
              <audio ref={remoteAudioRef} autoPlay className="hidden" />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div
                className={cn(
                  "w-32 h-32 rounded-full gradient-primary flex items-center justify-center",
                  (isConnecting || isIncomingCall) && "animate-pulse-glow"
                )}
              >
                <span className="text-5xl font-display font-bold text-primary-foreground">
                  {participantName.charAt(0).toUpperCase()}
                </span>
              </div>
              <h2 className="text-2xl font-display font-semibold text-foreground">
                {participantName}
              </h2>
              <p className="text-muted-foreground">
                {isIncomingCall
                  ? "Incoming call..."
                  : isConnecting
                    ? "Calling..."
                    : isConnected
                      ? "Connected"
                      : "Waiting..."}
              </p>
            </div>
          )}
        </div>

        {/* Local video (picture-in-picture) */}
        {!isAudioOnly && localStream && (
          <div className="absolute bottom-24 right-4 w-32 h-44 md:w-40 md:h-56 rounded-2xl overflow-hidden glass shadow-lg">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className={cn(
                "w-full h-full object-cover",
                isVideoOff && "hidden"
              )}
            />
            {isVideoOff && (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <VideoOff className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Call controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 glass">
        <div className="flex items-center justify-center gap-4">
          {isIncomingCall ? (
            <>
              {/* Incoming call: Accept/Reject buttons */}
              <Button
                onClick={onRejectCall}
                className="w-16 h-16 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                <PhoneOff className="w-7 h-7" />
              </Button>
              <Button
                onClick={onAnswerCall}
                className="w-16 h-16 rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Phone className="w-7 h-7" />
              </Button>
            </>
          ) : (
            <>
              {/* Normal call controls */}
              <Button
                variant="outline"
                size="icon"
                onClick={onToggleAudio}
                className={cn(
                  "w-14 h-14 rounded-full border-2",
                  isAudioMuted
                    ? "bg-destructive/20 border-destructive text-destructive"
                    : "bg-muted border-border text-foreground"
                )}
              >
                {isAudioMuted ? (
                  <MicOff className="w-6 h-6" />
                ) : (
                  <Mic className="w-6 h-6" />
                )}
              </Button>

              <Button
                onClick={handleEndCall}
                className="w-16 h-16 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                <PhoneOff className="w-7 h-7" />
              </Button>

              {!isAudioOnly && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onToggleVideo}
                  className={cn(
                    "w-14 h-14 rounded-full border-2",
                    isVideoOff
                      ? "bg-destructive/20 border-destructive text-destructive"
                      : "bg-muted border-border text-foreground"
                  )}
                >
                  {isVideoOff ? (
                    <VideoOff className="w-6 h-6" />
                  ) : (
                    <Video className="w-6 h-6" />
                  )}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Call info bar */}
      <div className="absolute top-0 left-0 right-0 p-4 glass flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-2 h-2 rounded-full animate-pulse",
              isConnected ? "bg-accent" : "bg-primary"
            )}
          />
          <span className="text-sm text-foreground">
            {isAudioOnly ? "Voice Call" : "Video Call"}
          </span>
        </div>
        <span className="text-sm font-medium text-primary">
          {isConnected ? "Connected" : isConnecting ? "Calling..." : ""}
        </span>
      </div>
    </div>
  );
};

export default VideoCall;
