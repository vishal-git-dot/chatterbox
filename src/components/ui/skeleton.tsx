import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}

function GradientSkeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted",
        className
      )}
      {...props}
    >
      <div
        className="absolute inset-0 bg-[image:var(--gradient-primary)] opacity-20 animate-pulse"
        style={{
          backgroundSize: "200% 100%",
          animation: "shimmer 2s infinite linear",
        }}
      />
    </div>
  );
}

function ShimmerSkeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted",
        className
      )}
      {...props}
    >
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.1), transparent)",
          animation: "shimmer 2s infinite linear",
        }}
      />
    </div>
  );
}

export { Skeleton, GradientSkeleton, ShimmerSkeleton };
