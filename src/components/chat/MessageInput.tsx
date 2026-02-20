import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Smile } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageInputProps {
  onSendMessage: (text: string) => void;
  onTyping: (isTyping: boolean) => void;
  placeholder?: string;
}

const MessageInput = ({ onSendMessage, onTyping, placeholder = "Type a message..." }: MessageInputProps) => {
  const [message, setMessage] = useState('');
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    return () => {
      if (typingTimeout) clearTimeout(typingTimeout);
    };
  }, [typingTimeout]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    onTyping(true);

    if (typingTimeout) clearTimeout(typingTimeout);

    const timeout = setTimeout(() => {
      onTyping(false);
    }, 2000);
    setTypingTimeout(timeout);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (trimmed && trimmed.length <= 5000) {
      onSendMessage(trimmed);
      setMessage('');
      onTyping(false);
      if (typingTimeout) clearTimeout(typingTimeout);
    }
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className={cn(
        "p-3 md:p-4 border-t border-border/30 bg-card/60 backdrop-blur-xl",
        "transition-all duration-300 ease-out",
        isFocused && "bg-card/80"
      )}
    >
      <div className={cn(
        "flex items-center gap-2 md:gap-3 p-1.5 md:p-2 rounded-2xl",
        "bg-background/60 border border-border/40",
        "transition-all duration-300 ease-out",
        isFocused && "border-primary/50 shadow-lg shadow-primary/10 bg-background/80"
      )}>
        <Input
          value={message}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className={cn(
            "flex-1 border-0 bg-transparent shadow-none",
            "text-sm md:text-base placeholder:text-muted-foreground/60",
            "focus-visible:ring-0 focus-visible:ring-offset-0",
            "transition-all duration-200"
          )}
        />
        <Button 
          type="submit" 
          size="icon" 
          disabled={!message.trim()}
          className={cn(
            "shrink-0 h-9 w-9 md:h-10 md:w-10 rounded-xl",
            "bg-primary hover:bg-primary/90",
            "transition-all duration-300 ease-out",
            "active:scale-95",
            message.trim() 
              ? "opacity-100 translate-x-0" 
              : "opacity-50"
          )}
        >
          <Send className={cn(
            "h-4 w-4 transition-transform duration-300",
            message.trim() && "translate-x-0.5 -translate-y-0.5"
          )} />
        </Button>
      </div>
    </form>
  );
};

export default MessageInput;
