import { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { socket } from "@/components/socket";

interface UseWebRTCCallProps {
  roomId: string;
  isAdmin: boolean;
  onCallEnded?: () => void;
  autoStart?: boolean;
  isVideoCall?: boolean;
}

interface SignalData {
  type: "offer" | "answer" | "ice-candidate" | "call-end" | "call-reject";
  payload?: unknown;
}

// TURN/STUN servers for NAT traversal
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
};

export const useWebRTCCall = ({ 
  roomId, 
  isAdmin, 
  onCallEnded,
  autoStart = false,
  isVideoCall = false,
}: UseWebRTCCallProps) => {
  const { toast } = useToast();
  const [isCallActive, setIsCallActive] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
const [isScreenSharing, setIsScreenSharing] = useState(false);
const [connectionState, setConnectionState] = useState<string>("disconnected");
const [error, setError] = useState<string | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const isVideoCallRef = useRef(isVideoCall);
  const hasStartedRef = useRef(false);
  const isCallerRef = useRef(false);
  const autoStartAttemptedRef = useRef(false);
  const originalVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const senderType = isAdmin ? "admin" : "client";

  // Send signal through database
  const sendSignal = useCallback(async (signalData: SignalData) => {
    try {
      console.log("Sending signal:", signalData.type, "as:", senderType);
      // Emit signal via Socket.IO to your backend
      socket.emit("signal", {
        roomId,
        senderType,
        signalType: signalData.type,
        signalData: signalData.payload ?? {},
      });
    } catch (error) {
      console.error("Error sending signal:", error);
    }
  }, [roomId, senderType]);

  // Clean up resources
  const cleanup = useCallback(() => {
    console.log("Cleaning up WebRTC resources");
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    pendingCandidatesRef.current = [];
    hasStartedRef.current = false;
    isCallerRef.current = false;
  }, []);

  const stopLocalStream = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
  }, [localStream]);

  const resetCallState = useCallback(() => {
    cleanup();
    stopLocalStream();
    setRemoteStream(null);
    setIsCallActive(false);
    setIsRinging(false);
    setConnectionState("disconnected");
  }, [cleanup, stopLocalStream]);

  // Get user media
  const getUserMedia = useCallback(async (isVideo: boolean) => {
    try {
      setError(null);
      console.log("Getting user media, video:", isVideo);
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Media devices API not accessible. Please ensure you are using HTTPS or localhost. If testing on a mobile device in the same network, you must enable HTTPS in your development server.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo ? { facingMode: "user", width: 640, height: 480 } : false,
      });
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error("Error getting user media:", error);
      const errorMessage = error instanceof Error ? error.message : "Could not access camera or microphone.";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Media Access Error",
        description: errorMessage,
      });
      throw error;
    }
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback((stream: MediaStream) => {
    console.log("Creating peer connection");
    const pc = new RTCPeerConnection(ICE_SERVERS);
    
    // Add local tracks
    stream.getTracks().forEach(track => {
      console.log("Adding track:", track.kind);
      pc.addTrack(track, stream);
    });

    // Handle remote tracks
    pc.ontrack = (event) => {
      console.log("Received remote track:", event.track.kind);
      setRemoteStream(event.streams[0]);
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Sending ICE candidate");
        sendSignal({
          type: "ice-candidate",
          payload: event.candidate.toJSON() as unknown,
        });
      }
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      console.log("Connection state:", pc.connectionState);
      setConnectionState(pc.connectionState);
      if (pc.connectionState === "connected") {
        console.log("Call connected successfully!");
      }
      if (pc.connectionState === "failed") {
        console.log("Connection failed, cleaning up");
        resetCallState();
        onCallEnded?.();
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE connection state:", pc.iceConnectionState);
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [sendSignal, resetCallState, onCallEnded]);

  // Apply pending ICE candidates
  const applyPendingCandidates = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc || !pc.remoteDescription) return;

    console.log("Applying", pendingCandidatesRef.current.length, "pending ICE candidates");
    for (const candidate of pendingCandidatesRef.current) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error("Error adding pending ICE candidate:", error);
      }
    }
    pendingCandidatesRef.current = [];
  }, []);

  // Start a call (caller initiates)
  const startCall = useCallback(async (isVideo: boolean) => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    isCallerRef.current = true;
    
    try {
      isVideoCallRef.current = isVideo;
      setIsRinging(true);
      console.log("Starting call, isVideo:", isVideo);

      // Create offer immediately (backend only allows offer/answer/ice-candidate)
      const stream = await getUserMedia(isVideo);
      const pc = createPeerConnection(stream);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log("Sending offer");
      await sendSignal({
        type: "offer",
        payload: { offer, isVideo } as unknown,
      });
    } catch (error) {
      console.error("Error starting call:", error);
      resetCallState();
      onCallEnded?.();
    }
  }, [sendSignal, resetCallState, getUserMedia, createPeerConnection]);

  // Accept/join a call (called from parent component)
  // If an offer already exists, answer it. Otherwise, start as caller.
  const acceptCall = useCallback(async (isVideo: boolean) => {
    if (hasStartedRef.current) return;

    try {
      console.log("Joining call, trying to find latest offer...");

      // Replace Supabase select with a fetch to your MongoDB API
      // Endpoint should return the latest offer for this room excluding the current sender
      let offerRow = null;
      try {
        const response = await fetch(`/api/rooms/${roomId}/offer?exclude=${senderType}`);
        if (response.ok) {
          const data = await response.json();
          offerRow = data.offer; // Assuming API returns { offer: { signal_data: ..., sender_type: ... } }
        }
      } catch (err) {
        console.error("Error fetching offer from API:", err);
      }

      // No offer yet -> we become the caller
      if (!offerRow) {
        console.log("No offer found. Starting call as caller...");
        await startCall(isVideo);
        return;
      }

      hasStartedRef.current = true;
      isCallerRef.current = false;

      const signalData = (offerRow.signal_data ?? {}) as Record<string, unknown>;
      const offerData = (signalData.offer ?? signalData) as unknown as RTCSessionDescriptionInit;
      const offerIsVideo = (signalData.isVideo as boolean | undefined) ?? isVideo;
      isVideoCallRef.current = offerIsVideo;

      setIsRinging(false);
      setIsCallActive(true);
      console.log("Answering offer, isVideo:", offerIsVideo);

      const stream = await getUserMedia(offerIsVideo);
      const pc = createPeerConnection(stream);
      await pc.setRemoteDescription(new RTCSessionDescription(offerData));
      await applyPendingCandidates();

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log("Sending answer");
      await sendSignal({
        type: "answer",
        payload: { answer } as unknown,
      });
    } catch (error) {
      console.error("Error accepting/joining call:", error);
      resetCallState();
      onCallEnded?.();
    }
  }, [roomId, senderType, getUserMedia, createPeerConnection, sendSignal, resetCallState, applyPendingCandidates, startCall]);

  // End the call
  const endCall = useCallback(async () => {
    console.log("Ending call");
    await sendSignal({ type: "call-end" });
    resetCallState();
    onCallEnded?.();
  }, [sendSignal, resetCallState, onCallEnded]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsAudioMuted(!isAudioMuted);
    }
  }, [localStream, isAudioMuted]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  }, [localStream, isVideoOff]);

  // Toggle screen sharing
  const toggleScreenShare = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc || !localStream) return;

    try {
      if (isScreenSharing) {
        // Stop screen sharing, restore camera
        if (originalVideoTrackRef.current) {
          const videoSender = pc.getSenders().find(s => s.track?.kind === "video");
          if (videoSender) {
            await videoSender.replaceTrack(originalVideoTrackRef.current);
          }
          
          // Update local stream
          const screenTrack = localStream.getVideoTracks()[0];
          if (screenTrack) {
            screenTrack.stop();
            localStream.removeTrack(screenTrack);
          }
          localStream.addTrack(originalVideoTrackRef.current);
          setLocalStream(new MediaStream(localStream.getTracks()));
        }
        originalVideoTrackRef.current = null;
        setIsScreenSharing(false);
      } else {
        // Start screen sharing
        if (!navigator.mediaDevices?.getDisplayMedia) {
          throw new Error("Screen sharing not supported in this browser or context.");
        }

        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: "always" } as MediaTrackConstraints,
          audio: false,
        });
        
        const screenTrack = screenStream.getVideoTracks()[0];
        const videoSender = pc.getSenders().find(s => s.track?.kind === "video");
        
        if (videoSender && videoSender.track) {
          // Save original video track
          originalVideoTrackRef.current = videoSender.track;
          
          // Replace with screen track
          await videoSender.replaceTrack(screenTrack);
          
          // Update local stream for preview
          localStream.removeTrack(originalVideoTrackRef.current);
          localStream.addTrack(screenTrack);
          setLocalStream(new MediaStream(localStream.getTracks()));
          
          // Handle screen share stop (user clicks browser's stop button)
          screenTrack.onended = () => {
            toggleScreenShare();
          };
          
          setIsScreenSharing(true);
        } else {
          // No video sender (audio-only call), just add screen track
          pc.addTrack(screenTrack, localStream);
          localStream.addTrack(screenTrack);
          setLocalStream(new MediaStream(localStream.getTracks()));
          
          screenTrack.onended = () => {
            toggleScreenShare();
          };
          
          setIsScreenSharing(true);
        }
      }
    } catch (error) {
      console.error("Error toggling screen share:", error);
      // User cancelled or error occurred
      toast({
        variant: "destructive",
        title: "Screen Share Error",
        description: "Could not start screen sharing.",
      });
      setIsScreenSharing(false);
    }
  }, [localStream, isScreenSharing]);

  // Handle incoming signals
  const handleSignal = useCallback(async (signal: { signal_type: string; signal_data: any; sender_type: string }) => {
    // Ignore our own signals
    if (signal.sender_type === senderType) return;

    const data = signal.signal_data as Record<string, unknown>;
    const signalType = signal.signal_type;

    console.log("Hook received signal:", signalType, "from:", signal.sender_type);

    switch (signalType) {
      case "call-reject": {
        console.log("Call rejected");
        setIsRinging(false);
        resetCallState();
        onCallEnded?.();
        break;
      }

      case "call-end": {
        console.log("Call ended by other party");
        resetCallState();
        onCallEnded?.();
        break;
      }

      case "offer": {
        // If we are the caller (we sent an offer), ignore offers from the other side.
        if (isCallerRef.current) return;
        break;
      }

      case "answer": {
        const pc = peerConnectionRef.current;
        if (!pc) {
          console.log("No peer connection for answer");
          return;
        }

        try {
          setIsRinging(false);
          setIsCallActive(true);
          console.log("Received answer, setting remote description");
          const answerData = ((data as unknown as { answer?: RTCSessionDescriptionInit }).answer ?? data) as unknown as RTCSessionDescriptionInit;
          await pc.setRemoteDescription(new RTCSessionDescription(answerData));
          await applyPendingCandidates();
        } catch (error) {
          console.error("Error handling answer:", error);
        }
        break;
      }

      case "ice-candidate": {
        const pc = peerConnectionRef.current;
        if (!pc) return;

        try {
          if (pc.remoteDescription) {
            console.log("Adding ICE candidate directly");
            await pc.addIceCandidate(new RTCIceCandidate(data as RTCIceCandidateInit));
          } else {
            console.log("Queueing ICE candidate");
            pendingCandidatesRef.current.push(data as RTCIceCandidateInit);
          }
        } catch (error) {
          console.error("Error adding ICE candidate:", error);
        }
        break;
      }
    }
  }, [senderType, getUserMedia, createPeerConnection, sendSignal, resetCallState, onCallEnded, applyPendingCandidates]);

  // Auto-start call if requested
  useEffect(() => {
    const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (autoStart && !isSecure) {
      console.error("Auto-start blocked: Insecure context");
      setError("Cannot start call: Application is running over HTTP. Please use HTTPS.");
      return;
    }

    if (autoStart && !hasStartedRef.current && !autoStartAttemptedRef.current) {
      console.log("Auto-starting call");
      autoStartAttemptedRef.current = true;
      startCall(isVideoCall);
    }
  }, [autoStart, isVideoCall, startCall]);

  // Subscribe to signals
  useEffect(() => {
    console.log("Setting up realtime subscription for room:", roomId);
    if (!socket.connected) {
      socket.connect();
    }
    
    // Join the room
    socket.emit("join-room", roomId);

    // Listen for signals
    const onSignal = (data: any) => {
      handleSignal({
        signal_type: data.signalType,
        signal_data: data.signalData,
        sender_type: data.senderType
      });
    };

    socket.on("signal", onSignal);

    return () => {
      console.log("Unsubscribing from realtime");
      socket.off("signal", onSignal);
      socket.emit("leave-room", roomId);
    };
  }, [roomId, senderType, handleSignal]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      resetCallState();
    };
  }, []);

  return {
    isCallActive,
    isRinging,
    localStream,
    remoteStream,
    isAudioMuted,
    isVideoOff,
    isScreenSharing,
    connectionState,
    startCall,
    acceptCall,
    endCall,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    error,
  };
};
