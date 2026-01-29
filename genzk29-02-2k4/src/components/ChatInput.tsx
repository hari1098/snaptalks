import { useState, useRef, useEffect } from "react";
import { Send, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

const EMOJI_LIST = [
  "😀", "😂", "🥰", "😍", "🤩", "😊", "😇", "🥳",
  "😎", "🤔", "😏", "😢", "😭", "😤", "🤯", "😱",
  "👍", "👎", "👋", "🙌", "👏", "🤝", "💪", "🙏",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "💕",
  "🔥", "✨", "💫", "⭐", "🌟", "💥", "💯", "🎉",
];

const ChatInput = ({ onSend, disabled }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage("");
    }
  };

  const handleEmojiClick = (emoji: string) => {
    setMessage((prev) => prev + emoji);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative flex items-center gap-2 p-4 glass border-t border-border/50"
    >
      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div
          ref={emojiRef}
          className="absolute bottom-full left-4 mb-2 p-3 glass rounded-2xl border border-border/50 shadow-lg animate-scale-in z-50"
        >
          <div className="grid grid-cols-8 gap-1 max-w-[280px]">
            {EMOJI_LIST.map((emoji, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleEmojiClick(emoji)}
                className="p-2 text-xl hover:bg-muted/50 rounded-lg transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        <Smile className="w-5 h-5" />
      </Button>

      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message..."
        disabled={disabled}
        className="flex-1 h-12 bg-muted/50 border-none rounded-full px-4 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50"
      />

      <Button
        type="submit"
        disabled={!message.trim() || disabled}
        className="shrink-0 w-12 h-12 rounded-full gradient-primary text-primary-foreground glow-primary hover:opacity-90 disabled:opacity-50"
      >
        <Send className="w-5 h-5" />
      </Button>
    </form>
  );
};

export default ChatInput;