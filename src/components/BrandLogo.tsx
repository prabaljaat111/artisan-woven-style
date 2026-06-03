interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  /** Show the full brand name beside the monogram (desktop only by default). */
  showWordmark?: boolean;
  /** Force a specific color variant. Defaults to dark primary on light bg. */
  variant?: "dark" | "light";
}

const sizeMap = {
  sm: {
    mark: "h-8 w-8 text-[11px]",
    wordmark: "text-[10px]",
    tagline: "text-[8px]",
    gap: "gap-2",
  },
  md: {
    mark: "h-10 w-10 text-[13px]",
    wordmark: "text-[11px]",
    tagline: "text-[9px]",
    gap: "gap-2.5",
  },
  lg: {
    mark: "h-11 w-11 md:h-12 md:w-12 text-sm md:text-[15px]",
    wordmark: "text-[11px] md:text-xs",
    tagline: "text-[9px] md:text-[10px]",
    gap: "gap-3",
  },
};

export function BrandLogo({
  className = "",
  size = "lg",
  showWordmark = true,
  variant = "dark",
}: BrandLogoProps) {
  const s = sizeMap[size];
  const isLight = variant === "light";
  const markColor = isLight ? "text-primary-foreground" : "text-primary";
  const ringColor = isLight ? "border-primary-foreground/40" : "border-primary/25";
  const accentColor = "text-gold";
  const wordColor = isLight ? "text-primary-foreground" : "text-primary";
  const subColor = isLight ? "text-primary-foreground/70" : "text-primary/60";

  return (
    <span
      className={`inline-flex items-center ${s.gap} ${className}`}
      aria-label="Indian Handicraft Standards"
    >
      {/* Monogram mark */}
      <span
        className={`relative inline-flex items-center justify-center rounded-full border ${ringColor} ${s.mark} ${markColor} font-display font-semibold tracking-[0.12em] shrink-0`}
      >
        <span className="relative">
          I<span className={accentColor}>H</span>S
        </span>
        {/* tiny gold accent dot */}
        <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-[3px] w-[3px] rounded-full bg-gold" />
      </span>

      {/* Wordmark (hidden on mobile to keep header compact) */}
      {showWordmark && (
        <span className="hidden sm:flex flex-col leading-tight">
          <span
            className={`font-display italic ${wordColor} ${s.wordmark} tracking-wide whitespace-nowrap`}
          >
            Indian Handicraft Standards
          </span>
          <span
            className={`uppercase ${subColor} ${s.tagline} tracking-[0.32em] whitespace-nowrap`}
          >
            Chikankari · Lucknow
          </span>
        </span>
      )}
    </span>
  );
}
