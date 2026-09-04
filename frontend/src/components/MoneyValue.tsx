interface MoneyValueProps {
  children: React.ReactNode;
  size?: "hero" | "lg" | "md" | "sm";
  className?: string;
}

/**
 * Renders a pre-formatted monetary string (e.g. "₹64,999") with the one
 * consistent numeral treatment used everywhere money appears in the product.
 * Does not format values itself — callers pass the already-formatted string.
 */
export default function MoneyValue({ children, size = "md", className = "" }: MoneyValueProps) {
  const sizeClass = {
    hero: "text-money-hero",
    lg: "text-money-lg",
    md: "text-money-md",
    sm: "text-money-sm",
  }[size];

  return <span className={`${sizeClass} ${className}`}>{children}</span>;
}
