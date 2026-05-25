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
  const [isWinking, setIsWinking] = useState(animate ? false : wink);

  useEffect(() => {
    if (!animate) {
      setIsWinking(wink);
      return;
    }
    // Arranca con ojos abiertos 3s, después guiña y queda guiñado.
    // Cada 45s: abre 3s y vuelve a guiñar.
    setIsWinking(false);
    const initial = setTimeout(() => setIsWinking(true), 3000);
    const interval = setInterval(() => {
      setIsWinking(false);
      setTimeout(() => setIsWinking(true), 3000);
    }, 45000);
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
        src={felixOpen}
        alt="Felix, la mascota de FIX"
        className={cn(
          "block w-full h-full object-contain transition-opacity duration-200",
          moodAnim,
          isWinking ? "opacity-0" : "opacity-100"
        )}
        draggable={false}
        decoding="async"
      />
      <img
        src={felixWink}
        aria-hidden
        className={cn(
          "absolute inset-0 block w-full h-full object-contain transition-opacity duration-200",
          moodAnim,
          isWinking ? "opacity-100" : "opacity-0"
        )}
        draggable={false}
        decoding="async"
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
