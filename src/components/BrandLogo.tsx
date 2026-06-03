import { LotusMark } from "./LotusMark";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: { top: "text-[13px]", bottom: "text-[10px]", gap: "gap-0.5", lotus: "h-3.5 w-3.5" },
  md: { top: "text-base", bottom: "text-[11px]", gap: "gap-1", lotus: "h-4 w-4" },
  lg: { top: "text-xl md:text-2xl", bottom: "text-xs md:text-sm", gap: "gap-1.5", lotus: "h-5 w-5" },
};

export function BrandLogo({ className = "", size = "lg" }: BrandLogoProps) {
  const s = sizeMap[size];
  return (
    <div className={`flex flex-col items-center leading-none ${s.gap} ${className}`}>
      <div className="flex items-center gap-1.5">
        <LotusMark className={`${s.lotus} text-gold shrink-0`} />
        <span className={`font-display italic font-semibold text-primary tracking-wide ${s.top}`}>
          Indian Handicraft
        </span>
      </div>
      <span className={`font-display font-medium uppercase tracking-[0.35em] text-primary/80 ${s.bottom}`}>
        Standards
      </span>
    </div>
  );
}
