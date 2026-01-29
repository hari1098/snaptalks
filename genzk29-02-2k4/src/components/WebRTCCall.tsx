import { useRef, useEffect } from "react";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, X, MonitorUp, MonitorOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWebRTCCall } from "@/hooks/useWebRTCCall";

interface WebRTCCallProps {
  roomId: string;
  isAdmin: boolean;
  participantName?: string;
  onClose: () => void;
  // For starting a call directly (caller)
  autoStart?: boolean;
  isVideoCall?: boolean;
}

const WebRTCCall = ({
  roomId,
  isAdmin,
  participantName = "User",
  onClose,
  autoStart = false,
  isVideoCall = false,
}: WebRTCCallProps) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const {
    isCallActive,
    isRinging,
    localStream,
    remoteStream,
    isAudioMuted,
    isVideoOff,
    isScreenSharing,
    connectionState,
    acceptCall,
    endCall,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
  } = useWebRTCCall({
    roomId,
    isAdmin,
    onCallEnded: onClose,
    autoStart,
    isVideoCall,
  });

  // If not auto-starting (joining a call), accept it
  useEffect(() => {
    if (!autoStart) {
      console.log("Joining call, accepting with video:", isVideoCall);
      acceptCall(isVideoCall);
    }
  }, []);

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream to video/audio elements
  useEffect(() => {
    if (remoteStream) {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
    }
  }, [remoteStream]);

  const handleEndCall = () => {
    endCall();
  };

  // Ringing UI (waiting for other party)
  if (isRinging) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="w-24 h-24 mx-auto rounded-full gradient-primary flex items-center justify-center relative">
            <div className="animate-ping absolute w-24 h-24 rounded-full bg-primary/40" />
            <Phone className="w-12 h-12 text-primary-foreground relative z-10" />
          </div>
          
          <div>
            <h2 className="text-2xl font-display font-bold text-foreground">
              Calling...
            </h2>
            <p className="text-muted-foreground mt-1">Waiting for {participantName} to answer</p>
          </div>

          <Button
            size="lg"
            variant="destructive"
            className="w-16 h-16 rounded-full"
            onClick={handleEndCall}
          >
            <PhoneOff className="w-8 h-8" />
          </Button>
        </div>
      </div>
    );
  }

  // Active call UI (or connecting)
  const hasVideo = (localStream?.getVideoTracks().length ?? 0) > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Status bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            connectionState === "connected" ? "bg-green-500" : 
            connectionState === "connecting" ? "bg-yellow-500 animate-pulse" : "bg-yellow-500 animate-pulse"
          )} />
          <span className="text-white text-sm capitalize">
            {connectionState === "disconnected" ? "Connecting..." : connectionState}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleEndCall}
          className="text-white hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Video area */}
      <div className="flex-1 relative">
        {/* Remote video (full screen) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={cn(
            "w-full h-full object-cover",
            !remoteStream && "hidden"
          )}
        />
        
        {/* Remote audio for voice calls */}
        <audio ref={remoteAudioRef} autoPlay />

        {/* Placeholder when no remote video */}
        {(!remoteStream || !hasVideo) && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto rounded-full gradient-primary flex items-center justify-center mb-4">
                <span className="text-4xl font-display font-bold text-primary-foreground">
                  {participantName.charAt(0).toUpperCase()}
                </span>
              </div>
              <p className="text-foreground font-medium">{participantName}</p>
              <p className="text-sm text-muted-foreground capitalize">
                {connectionState === "disconnected" ? "Connecting..." : connectionState}
              </p>
            </div>
          </div>
        )}

        {/* Local video (picture-in-picture) */}
        {localStream && hasVideo && (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={cn(
              "absolute bottom-24 right-4 w-32 h-44 md:w-40 md:h-56 object-cover rounded-2xl border-2 border-white/20",
              isVideoOff && "hidden"
            )}
          />
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 flex items-center justify-center gap-4 bg-gradient-to-t from-black/70 to-transparent">
        <Button
          variant="ghost"
          size="lg"
          className={cn(
            "w-14 h-14 rounded-full",
            isAudioMuted ? "bg-red-500/20 text-red-500 hover:bg-red-500/30" : "bg-white/10 text-white hover:bg-white/20"
          )}
          onClick={toggleAudio}
        >
          {isAudioMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </Button>

        <Button
          size="lg"
          variant="destructive"
          className="w-16 h-16 rounded-full"
          onClick={handleEndCall}
        >
          <PhoneOff className="w-8 h-8" />
        </Button>

        {hasVideo && (
          <Button
            variant="ghost"
            size="lg"
            className={cn(
              "w-14 h-14 rounded-full",
              isVideoOff ? "bg-red-500/20 text-red-500 hover:bg-red-500/30" : "bg-white/10 text-white hover:bg-white/20"
            )}
            onClick={toggleVideo}
          >
            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </Button>
        )}

        <Button
          variant="ghost"
          size="lg"
          className={cn(
            "w-14 h-14 rounded-full",
            isScreenSharing ? "bg-green-500/20 text-green-500 hover:bg-green-500/30" : "bg-white/10 text-white hover:bg-white/20"
          )}
          onClick={toggleScreenShare}
          title={isScreenSharing ? "Stop sharing" : "Share screen"}
        >
          {isScreenSharing ? <MonitorOff className="w-6 h-6" /> : <MonitorUp className="w-6 h-6" />}
        </Button>
      </div>
    </div>
  );
};

export default WebRTCCall;
