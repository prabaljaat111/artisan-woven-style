import ihsLetters from "@/assets/brand/ihs-letters.png.asset.json";
import ihsFull from "@/assets/brand/ihs-full-logo.png.asset.json";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  variant?: "dark" | "light";
}

const sizeMap = {
  sm: { mark: "h-9 w-9", name: "text-[10px]", tag: "text-[8px]", gap: "gap-2.5" },
  md: { mark: "h-12 w-12", name: "text-[11px]", tag: "text-[8.5px]", gap: "gap-3" },
  lg: {
    mark: "h-14 w-14 md:h-[68px] md:w-[68px]",
    name: "text-[12px] md:text-[13px]",
    tag: "text-[8.5px] md:text-[9.5px]",
    gap: "gap-3 md:gap-3.5",
  },
};

/**
 * Primary brand identity — IHS arched emblem (cropped from the full mark)
 * paired with a refined serif wordmark. Designed as a fashion-house lockup:
 * the mark dominates, the type whispers.
 */
export function BrandLogo({
  className = "",
  size = "lg",
  showWordmark = true,
  variant = "dark",
}: BrandLogoProps) {
  const s = sizeMap[size];
  const isLight = variant === "light";
  const wordColor = isLight ? "text-primary-foreground" : "text-primary";
  const subColor = isLight ? "text-primary-foreground/65" : "text-primary/55";

  return (
    <span
      className={`inline-flex items-center ${s.gap} ${className}`}
      aria-label="Indian Handicraft Standards — The Art of Chikankari"
    >
      <img
        src={ihsLetters.url}
        alt=""
        aria-hidden="true"
        className={`${s.mark} object-contain shrink-0 ${
          isLight ? "brightness-0 invert" : ""
        }`}
        loading="eager"
        decoding="sync"
      />

      {showWordmark && (
        <span className="hidden sm:flex flex-col leading-[1.15]">
          <span
            className={`font-display ${wordColor} ${s.name} tracking-[0.18em] uppercase whitespace-nowrap`}
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

/**
 * The complete original artwork — kurti illustration, floral vines, full
 * wordmark and tagline. Use this in the footer, About page, brand story
 * sections, and the loading screen.
 */
export function FullBrandLogo({
  className = "",
  alt = "Indian Handicraft Standards — The Art of Chikankari",
}: {
  className?: string;
  alt?: string;
}) {
  return (
    <img
      src={ihsFull.url}
      alt={alt}
      className={`object-contain ${className}`}
      loading="lazy"
      decoding="async"
    />
  );
}
