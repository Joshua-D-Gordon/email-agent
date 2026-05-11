import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        aria-hidden
        className="relative inline-flex size-8 items-center justify-center rounded-lg bg-foreground text-background shadow-sm"
      >
        <span className="absolute inset-0 rounded-lg bg-gradient-to-br from-foreground via-foreground to-[var(--brand-violet-deep)]" />
        <span className="relative text-sm font-bold tracking-tight">AE</span>
      </span>
      {showWordmark && (
        <span className="text-base font-semibold tracking-tight text-foreground">
          agent<span className="text-[var(--brand-violet)]">email</span>
        </span>
      )}
    </div>
  );
}
