import type { CSSProperties, ReactNode } from "react";

/**
 * A “homepage-style” card surface: rounded, subtle border, translucent fill.
 * Use this instead of nested <Card> to keep pages visually consistent.
 */
export default function Surface({
  children,
  className,
  style,
  dense,
  interactive,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  dense?: boolean;
  interactive?: boolean;
  onClick?: () => void;
}) {
  const cls = [
    "st-surface",
    dense ? "st-surfaceDense" : "",
    interactive ? "st-surfaceInteractive st-cardHover" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={cls}
      style={style}
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={(e) => {
        if (!interactive || !onClick) return;
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
    >
      {children}
    </div>
  );
}
