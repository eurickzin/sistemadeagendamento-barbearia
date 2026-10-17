interface RevealProps {
  children: React.ReactNode;
  direction?: "left" | "right" | "up";
  delay?: number;
  className?: string;
}

export default function Reveal({
  children,
  direction = "left",
  delay = 0,
  className = "",
}: RevealProps) {
  return (
    <div
      style={{
        animationDelay: `${delay}ms`,
      }}
      className={`reveal reveal-${direction} ${className}`}
    >
      {children}
    </div>
  );
}
