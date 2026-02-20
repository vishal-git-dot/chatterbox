import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  userName: string;
  className?: string;
}

const TypingIndicator = ({ userName, className }: TypingIndicatorProps) => {
  return (
    <div className={cn("flex items-center gap-2 px-4 py-2 animate-fade-in", className)}>
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-sm text-muted-foreground">{userName} is typing...</span>
    </div>
  );
};

export default TypingIndicator;
