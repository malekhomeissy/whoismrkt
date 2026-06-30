// Universal avatar / logo display used everywhere in MRKT.
// Shows the image if available, otherwise renders initials with a deterministic colour.

const PALETTE = [
  "oklch(0.78 0.005 0)",  "oklch(0.75 0.005 0)",
  "oklch(0.32 0 0)", "oklch(0.35 0 0)",
  "oklch(0.60 0.005 0)",  "oklch(0.30 0 0)",
];

function colorFor(name: string): string {
  return PALETTE[(name.charCodeAt(0) ?? 0) % PALETTE.length];
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map(w => w[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join("") || "?";
}

export interface AvatarProps {
  src?:       string | null;
  name?:      string;
  size?:      number;
  shape?:     "circle" | "square";
  fontSize?:  number;
  className?: string;
  style?:     React.CSSProperties;
}

export function Avatar({
  src,
  name    = "?",
  size    = 36,
  shape   = "circle",
  fontSize,
  className,
  style,
}: AvatarProps) {
  const radius  = shape === "circle" ? "50%" : `${Math.round(size * 0.2)}px`;
  const fsize   = fontSize ?? Math.round(size * 0.38);

  const base: React.CSSProperties = {
    width:        size,
    height:       size,
    borderRadius: radius,
    flexShrink:   0,
    overflow:     "hidden",
    display:      "flex",
    alignItems:   "center",
    justifyContent: "center",
    ...style,
  };

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={className}
        style={{ ...base, objectFit: "cover" }}
      />
    );
  }

  return (
    <div
      className={className}
      style={{
        ...base,
        background: colorFor(name),
        color:      "oklch(0.065 0 0)",
        fontSize:   fsize,
        fontWeight: 700,
        letterSpacing: "-0.01em",
      }}
    >
      {initials(name)}
    </div>
  );
}
