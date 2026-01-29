import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import type { Json } from "@/integrations/supabase/types";

interface UseWebRTCProps {
  roomId: string;
  isAdmin: boolean;
  onCallEnded?: () => void;
  onCallRejected?: () => void;
  onIncomingCall?: (isVideo: boolean) => void;
}

interface CallSignal {
  id: string;
  room_id: string;
  sender_type: string;
  signal_type: string;
  signal_data: {
    type?: string;
    sdp?: string;
    candidate?: RTCIceCandidateInit;
    isVideo?: boolean;
  };
  created_at: string;
}

// Free STUN servers for NAT traversal
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
};

export const useWebRTC = ({
  roomId,
  isAdmin,
  onCallEnded,
  onCallRejected,
  onIncomingCall,
}: UseWebRTCProps) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callStatus, setCallStatus] = useState<
    "idle" | "calling" | "receiving" | "connected" | "ended"
  >("idle");
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [incomingCallIsVideo, setIncomingCallIsVideo] = useState(false);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const senderType = isAdmin ? "admin" : "client";

  // Send signal through Supabase
  const sendSignal = useCallback(
    async (signalType: string, signalData: CallSignal["signal_data"]) => {
      try {
        await supabase.from("call_signals").insert([
          {
            room_id: roomId,
            sender_type: senderType,
            signal_type: signalType,
            signal_data: signalData as Json,
          },
        ]);
      } catch (error) {
        console.error("Error sending signal:", error);
      }
    },
    [roomId, senderType]
  );

  // Clean up old signals
  const cleanupSignals = useCallback(async () => {
    try {
      await supabase.from("call_signals").delete().eq("room_id", roomId);
    } catch (error) {
      console.error("Error cleaning up signals:", error);
    }
  }, [roomId]);

  // Cleanup function for ending calls
  const cleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    remoteStreamRef.current = null;

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    pendingCandidatesRef.current = [];
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback(() => {
    // Clean up existing connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Create remote stream to collect tracks
    const newRemoteStream = new MediaStream();
    remoteStreamRef.current = newRemoteStream;
    setRemoteStream(newRemoteStream);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Sending ICE candidate");
        sendSignal("ice-candidate", { candidate: event.candidate.toJSON() });
      }
    };

    pc.ontrack = (event) => {
      console.log("Received remote track:", event.track.kind);
      if (remoteStreamRef.current) {
        remoteStreamRef.current.addTrack(event.track);
        // Force state update
        setRemoteStream(new MediaStream(remoteStreamRef.current.getTracks()));
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE connection state:", pc.iceConnectionState);
      if (pc.iceConnectionState === "connected") {
        setCallStatus("connected");
      } else if (
        pc.iceConnectionState === "disconnected" ||
        pc.iceConnectionState === "failed"
      ) {
        console.log("Connection failed or disconnected");
        cleanup();
        setCallStatus("idle");
        onCallEnded?.();
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("Connection state:", pc.connectionState);
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [sendSignal, cleanup, onCallEnded]);

  // Get user media
  const getUserMedia = useCallback(async (video: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video,
        audio: true,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsVideoOff(!video);
      return stream;
    } catch (error) {
      console.error("Error getting user media:", error);
      throw error;
    }
  }, []);

  // Start a call (initiator)
  const startCall = useCallback(
    async (isVideo: boolean) => {
      try {
        await cleanupSignals();
        cleanup();
        setCallStatus("calling");

        const stream = await getUserMedia(isVideo);
        const pc = createPeerConnection();

        stream.getTracks().forEach((track) => {
          console.log("Adding local track:", track.kind);
          pc.addTrack(track, stream);
        });

        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: isVideo,
        });
        await pc.setLocalDescription(offer);

        console.log("Sending offer");
        await sendSignal("offer", {
          type: "offer",
          sdp: offer.sdp,
          isVideo,
        });
      } catch (error) {
        console.error("Error starting call:", error);
        cleanup();
        setCallStatus("idle");
      }
    },
    [cleanupSignals, cleanup, getUserMedia, createPeerConnection, sendSignal]
  );

  // Answer a call
  const answerCall = useCallback(async () => {
    try {
      const pc = peerConnectionRef.current;
      if (!pc) {
        console.error("No peer connection when answering");
        return;
      }

      const stream = await getUserMedia(incomingCallIsVideo);

      stream.getTracks().forEach((track) => {
        console.log("Adding local track for answer:", track.kind);
        pc.addTrack(track, stream);
      });

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      console.log("Sending answer");
      await sendSignal("answer", {
        type: "answer",
        sdp: answer.sdp,
      });

      // Add any pending ICE candidates
      console.log("Adding pending candidates:", pendingCandidatesRef.current.length);
      for (const candidate of pendingCandidatesRef.current) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("Error adding pending ICE candidate:", e);
        }
      }
      pendingCandidatesRef.current = [];

      setCallStatus("connected");
    } catch (error) {
      console.error("Error answering call:", error);
      cleanup();
      setCallStatus("idle");
    }
  }, [incomingCallIsVideo, getUserMedia, sendSignal, cleanup]);

  // Reject a call
  const rejectCall = useCallback(async () => {
    await sendSignal("call-reject", {});
    cleanup();
    setCallStatus("idle");
  }, [sendSignal, cleanup]);

  // End the call
  const endCall = useCallback(async () => {
    await sendSignal("call-end", {});
    cleanup();
    setCallStatus("idle");
    onCallEnded?.();
  }, [sendSignal, cleanup, onCallEnded]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = isAudioMuted;
      });
      setIsAudioMuted(!isAudioMuted);
    }
  }, [isAudioMuted]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = isVideoOff;
      });
      setIsVideoOff(!isVideoOff);
    }
  }, [isVideoOff]);

  // Handle incoming signals
  const handleSignal = useCallback(
    async (signal: CallSignal) => {
      // Ignore our own signals
      if (signal.sender_type === senderType) return;

      const { signal_type, signal_data } = signal;
      console.log("Received signal:", signal_type);

      switch (signal_type) {
        case "offer": {
          console.log("Processing offer, isVideo:", signal_data.isVideo);
          // Incoming call - create peer connection and set remote description
          const pc = createPeerConnection();
          try {
            await pc.setRemoteDescription(
              new RTCSessionDescription({
                type: "offer",
                sdp: signal_data.sdp,
              })
            );
            setIncomingCallIsVideo(signal_data.isVideo || false);
            setCallStatus("receiving");
            onIncomingCall?.(signal_data.isVideo || false);
          } catch (e) {
            console.error("Error setting remote description for offer:", e);
          }
          break;
        }

        case "answer": {
          console.log("Processing answer");
          const pc = peerConnectionRef.current;
          if (pc && pc.signalingState === "have-local-offer") {
            try {
              await pc.setRemoteDescription(
                new RTCSessionDescription({
                  type: "answer",
                  sdp: signal_data.sdp,
                })
              );
              setCallStatus("connected");
            } catch (e) {
              console.error("Error setting remote description for answer:", e);
            }
          }
          break;
        }

        case "ice-candidate": {
          console.log("Processing ICE candidate");
          const pc = peerConnectionRef.current;
          if (signal_data.candidate) {
            if (pc?.remoteDescription) {
              try {
                await pc.addIceCandidate(
                  new RTCIceCandidate(signal_data.candidate)
                );
              } catch (e) {
                console.error("Error adding ICE candidate:", e);
              }
            } else {
              console.log("Queuing ICE candidate");
              pendingCandidatesRef.current.push(signal_data.candidate);
            }
          }
          break;
        }

        case "call-end": {
          console.log("Call ended by remote");
          cleanup();
          setCallStatus("idle");
          onCallEnded?.();
          break;
        }

        case "call-reject": {
          console.log("Call rejected by remote");
          cleanup();
          setCallStatus("idle");
          onCallRejected?.();
          break;
        }
      }
    },
    [
      senderType,
      createPeerConnection,
      cleanup,
      onCallEnded,
      onCallRejected,
      onIncomingCall,
    ]
  );

  // Subscribe to signals
  useEffect(() => {
    const channel = supabase
      .channel(`call-signals-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_signals",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          handleSignal(payload.new as CallSignal);
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      cleanup();
    };
  }, [roomId, handleSignal, cleanup]);

  return {
    localStream,
    remoteStream,
    callStatus,
    isAudioMuted,
    isVideoOff,
    incomingCallIsVideo,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    toggleAudio,
    toggleVideo,
  };
};
