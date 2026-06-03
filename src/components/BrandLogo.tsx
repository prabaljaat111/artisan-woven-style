interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  variant?: "dark" | "light";
}

const sizeMap = {
  sm: { mark: 32, name: "text-[11px]", tag: "text-[8px]", gap: "gap-2.5" },
  md: { mark: 40, name: "text-[12px]", tag: "text-[9px]", gap: "gap-3" },
  lg: { mark: 52, name: "text-[13px] md:text-[15px]", tag: "text-[9px] md:text-[10px]", gap: "gap-3 md:gap-4" },
};

/**
 * Luxury monogram mark: an elegant interlaced "IHS" rendered with a paisley
 * (chikankari-inspired) flourish underneath. Pure SVG so it stays crisp at
 * any size and inherits color via currentColor.
 */
function Monogram({ size, color, accent }: { size: number; color: string; accent: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      aria-hidden="true"
    >
      {/* Paisley flourish — top */}
      <path
        d="M14 14 C 22 8, 42 8, 50 14"
        stroke={accent}
        strokeWidth="0.8"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="14" cy="14" r="1.1" fill={accent} />
      <circle cx="50" cy="14" r="1.1" fill={accent} />

      {/* IHS monogram — serif, hand-set */}
      <g fill={color}>
        {/* I */}
        <text
          x="14"
          y="44"
          fontFamily="'Cormorant Garamond', serif"
          fontWeight="500"
          fontStyle="italic"
          fontSize="34"
          letterSpacing="-1"
        >
          I
        </text>
        {/* H — larger, anchoring */}
        <text
          x="22"
          y="48"
          fontFamily="'Cormorant Garamond', serif"
          fontWeight="600"
          fontSize="44"
          letterSpacing="-2"
        >
          H
        </text>
        {/* S */}
        <text
          x="46"
          y="44"
          fontFamily="'Cormorant Garamond', serif"
          fontWeight="500"
          fontStyle="italic"
          fontSize="34"
          letterSpacing="-1"
        >
          S
        </text>
      </g>

      {/* Paisley flourish — bottom (mirrored chikankari curl) */}
      <path
        d="M14 52 C 22 58, 42 58, 50 52"
        stroke={accent}
        strokeWidth="0.8"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M28 56 q 4 3 8 0"
        stroke={accent}
        strokeWidth="0.7"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="32" cy="58.2" r="0.9" fill={accent} />
    </svg>
  );
}

export function BrandLogo({
  className = "",
  size = "lg",
  showWordmark = true,
  variant = "dark",
}: BrandLogoProps) {
  const s = sizeMap[size];
  const isLight = variant === "light";
  const markColor = isLight ? "rgba(250,247,242,1)" : "currentColor";
  const accentColor = "var(--gold)";
  const wordColor = isLight ? "text-primary-foreground" : "text-primary";
  const subColor = isLight ? "text-primary-foreground/65" : "text-primary/55";

  return (
    <span
      className={`inline-flex items-center ${s.gap} ${className} ${isLight ? "text-primary-foreground" : "text-primary"}`}
      aria-label="Indian Handicraft Standards"
    >
      <Monogram size={s.mark} color={markColor} accent={accentColor} />

      {showWordmark && (
        <span className="hidden sm:flex flex-col leading-[1.15]">
          <span
            className={`font-display ${wordColor} ${s.name} tracking-[0.28em] uppercase whitespace-nowrap`}
            style={{ fontWeight: 500 }}
          >
            Indian Handicraft Standards
          </span>
          <span
            className={`font-display italic ${subColor} ${s.tag} tracking-[0.22em] whitespace-nowrap mt-0.5`}
          >
            Chikankari · Lucknow
          </span>
        </span>
      )}
    </span>
  );
}
