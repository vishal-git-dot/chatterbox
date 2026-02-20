import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const Spinner = ({ size = "md", className }: SpinnerProps) => {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
  };

  return (
    <div
      className={cn(
        "rounded-full border-t-transparent animate-spin",
        "bg-gradient-to-r from-primary via-accent to-primary bg-clip-border",
        sizeClasses[size],
        className
      )}
      style={{
        borderImage: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent))) 1",
      }}
    />
  );
};

export const GradientSpinner = ({ size = "md", className }: SpinnerProps) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      <div className="absolute inset-0 rounded-full bg-[image:var(--gradient-primary)] opacity-20" />
      <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" 
           style={{
             borderImage: "var(--gradient-primary) 1",
           }} />
    </div>
  );
};

export const PulseLoader = ({ className }: { className?: string }) => {
  return (
    <div className={cn("flex gap-2 items-center justify-center", className)}>
      <div className="w-3 h-3 rounded-full bg-[image:var(--gradient-primary)] animate-pulse" 
           style={{ animationDelay: "0ms" }} />
      <div className="w-3 h-3 rounded-full bg-[image:var(--gradient-primary)] animate-pulse" 
           style={{ animationDelay: "150ms" }} />
      <div className="w-3 h-3 rounded-full bg-[image:var(--gradient-primary)] animate-pulse" 
           style={{ animationDelay: "300ms" }} />
    </div>
  );
};
