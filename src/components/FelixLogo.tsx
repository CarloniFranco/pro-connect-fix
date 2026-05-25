import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import felixWink from "@/assets/felix-wink.png";
import felixOpen from "@/assets/felix-open.png";

export type FelixMood = "neutral" | "happy" | "sad";

interface FelixLogoProps {
  className?: string;
  /** mostrar el guiño fijo */
  wink?: boolean;
  /** guiñar periódicamente */
  animate?: boolean;
  mood?: FelixMood;
  color?: string;
  withShadow?: boolean;
}

/**
 * Felix — la mascota de FIX.
 * Alterna entre ojos abiertos y guiño para animar.
 */
const FelixLogo = ({
  className,
  wink = false,
  animate = false,
  mood = "neutral",
  withShadow = false,
}: FelixLogoProps) => {
  const [isWinking, setIsWinking] = useState(wink);

  useEffect(() => {
    if (!animate) {
      setIsWinking(wink);
      return;
    }
    // Guiño rápido cada ~4s
    const tick = () => {
      setIsWinking(true);
      setTimeout(() => setIsWinking(false), 350);
    };
    const initial = setTimeout(tick, 1500);
    const interval = setInterval(tick, 4000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [animate, wink]);

  const moodAnim =
    mood === "happy"
      ? "animate-felix-celebrate origin-bottom"
      : mood === "sad"
      ? "animate-felix-sway origin-top"
      : "";

  const src = isWinking ? felixWink : felixOpen;

  return (
    <div className={cn("relative inline-block", className)}>
      <img
        src={src}
        alt="Felix, la mascota de FIX"
        className={cn("block w-full h-full object-contain transition-opacity", moodAnim)}
        draggable={false}
      />
      {withShadow && (
        <span
          aria-hidden
          className="absolute left-1/2 bottom-0 -translate-x-1/2 h-1.5 w-1/3 rounded-full bg-primary/25 blur-sm"
        />
      )}
    </div>
  );
};

export default FelixLogo;
