export function BrandLogo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 22"
      fill="none"
      className={className}
      aria-hidden
    >
      <text
        x="0"
        y="17"
        fill="#2C2C2C"
        fontFamily="system-ui, sans-serif"
        fontSize="16"
        fontWeight="700"
        letterSpacing="-0.02em"
      >
        ServeLine
      </text>
    </svg>
  );
}
