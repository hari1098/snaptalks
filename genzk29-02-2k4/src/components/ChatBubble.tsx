import { useState, useEffect } from "react";
import { Check, CheckCheck, Trash2, Video, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ChatBubbleProps {
  content: string;
  isOwn: boolean;
  isRead: boolean;
  timestamp: string;
  onRead?: () => void;
  onDelete?: () => void;
  autoDeleteOnRead?: boolean;
  onJoinCall?: (isVideo: boolean) => void;
}

// Check if message is a call link
const parseCallLink = (content: string): { type: "video" | "audio" } | null => {
  if (content.startsWith("📹 Video Call Link:") || content.includes("[VIDEO_CALL]")) {
    return { type: "video" };
  }
  if (content.startsWith("📞 Voice Call Link:") || content.includes("[AUDIO_CALL]")) {
    return { type: "audio" };
  }
  return null;
};

const ChatBubble = ({
  content,
  isOwn,
  isRead,
  timestamp,
  onRead,
  onDelete,
  autoDeleteOnRead = false,
  onJoinCall,
}: ChatBubbleProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [showDelete, setShowDelete] = useState(false);

  const callInfo = parseCallLink(content);
  const isCallMessage = callInfo !== null;

  useEffect(() => {
    // Mark as read when component mounts (message is seen)
    if (!isOwn && !isRead && onRead) {
      const timer = setTimeout(() => {
        onRead();
        if (autoDeleteOnRead && onDelete && !isCallMessage) {
          // Auto-delete after 2 minutes of being read (but not call messages)
          setTimeout(() => {
            setIsVisible(false);
            setTimeout(() => onDelete(), 300);
          }, 120000);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isOwn, isRead, onRead, onDelete, autoDeleteOnRead, isCallMessage]);

  if (!isVisible) return null;

  const formattedTime = new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Render call message with join button
  if (isCallMessage && callInfo) {
    const isVideo = callInfo.type === "video";
    return (
      <div
        className={cn(
          "flex w-full mb-3 animate-slide-in-right",
          isOwn ? "justify-end" : "justify-start"
        )}
        onMouseEnter={() => setShowDelete(true)}
        onMouseLeave={() => setShowDelete(false)}
      >
        <div
          className={cn(
            "relative max-w-[85%] md:max-w-[75%] p-4 rounded-2xl transition-all",
            isOwn
              ? "bg-primary/20 border border-primary/30 rounded-br-sm"
              : "bg-accent/20 border border-accent/30 rounded-bl-sm"
          )}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              isVideo ? "bg-primary/30" : "bg-accent/30"
            )}>
              {isVideo ? (
                <Video className="w-5 h-5 text-primary" />
              ) : (
                <Phone className="w-5 h-5 text-accent" />
              )}
            </div>
            <div>
              <p className="font-medium text-foreground">
                {isVideo ? "Video Call Invite" : "Voice Call Invite"}
              </p>
              <p className="text-xs text-muted-foreground">
                Click to join the call
              </p>
            </div>
          </div>

          <Button
            onClick={() => onJoinCall?.(isVideo)}
            className={cn(
              "w-full",
              isVideo
                ? "bg-primary hover:bg-primary/90"
                : "bg-accent hover:bg-accent/90"
            )}
          >
            {isVideo ? (
              <>
                <Video className="w-4 h-4 mr-2" />
                Join Video Call
              </>
            ) : (
              <>
                <Phone className="w-4 h-4 mr-2" />
                Join Voice Call
              </>
            )}
          </Button>

          <div className="flex items-center gap-1 mt-2 justify-end">
            <span className="text-xs text-muted-foreground">{formattedTime}</span>
            {isOwn && (
              <span className="text-muted-foreground">
                {isRead ? (
                  <CheckCheck className="w-4 h-4" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
              </span>
            )}
          </div>

          {/* Delete button */}
          {showDelete && onDelete && (
            <button
              onClick={onDelete}
              className={cn(
                "absolute -top-2 -right-2 p-1.5 rounded-full bg-destructive text-destructive-foreground hover:opacity-80 transition-all shadow-lg",
                "animate-scale-in"
              )}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Regular message bubble
  return (
    <div
      className={cn(
        "flex w-full mb-3 animate-slide-in-right",
        isOwn ? "justify-end" : "justify-start"
      )}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      <div
        className={cn(
          "relative max-w-[80%] md:max-w-[70%] px-4 py-3 rounded-2xl transition-all",
          isOwn
            ? "gradient-primary text-primary-foreground rounded-br-sm"
            : "bg-card border border-border text-card-foreground rounded-bl-sm"
        )}
      >
        <p className="text-sm md:text-base break-words">{content}</p>
        <div
          className={cn(
            "flex items-center gap-1 mt-1",
            isOwn ? "justify-end" : "justify-start"
          )}
        >
          <span
            className={cn(
              "text-xs",
              isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
            )}
          >
            {formattedTime}
          </span>
          {isOwn && (
            <span className="text-primary-foreground/70">
              {isRead ? (
                <CheckCheck className="w-4 h-4" />
              ) : (
                <Check className="w-4 h-4" />
              )}
            </span>
          )}
        </div>

        {/* Delete button */}
        {showDelete && onDelete && (
          <button
            onClick={onDelete}
            className={cn(
              "absolute -top-2 -right-2 p-1.5 rounded-full bg-destructive text-destructive-foreground hover:opacity-80 transition-all shadow-lg",
              "animate-scale-in"
            )}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatBubble;
