interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg md:text-xl lg:text-2xl",
};

export function BrandLogo({ className = "", size = "lg" }: BrandLogoProps) {
  return (
    <span className={`font-display font-medium italic tracking-wide text-primary ${sizeMap[size]} ${className}`}>
      Indian Handicraft Standards
    </span>
  );
}
