import { cn } from "@/lib/utils";
import felixImg from "@/assets/felix-wink.png";

export type FelixMood = "neutral" | "happy" | "sad";

interface FelixLogoProps {
  className?: string;
  wink?: boolean;
  animate?: boolean;
  mood?: FelixMood;
  color?: string;
  withShadow?: boolean;
}

/**
 * Felix — la mascota de FIX.
 * X violeta guiñando un ojo. Imagen oficial.
 */
const FelixLogo = ({
  className,
  mood = "neutral",
  withShadow = false,
}: FelixLogoProps) => {
  const moodAnim =
    mood === "happy"
      ? "animate-felix-celebrate origin-bottom"
      : mood === "sad"
      ? "animate-felix-sway origin-top"
      : "";

  return (
    <div className={cn("relative inline-block", className)}>
      <img
        src={felixImg}
        alt="Felix, la mascota de FIX"
        className={cn("block w-full h-full object-contain", moodAnim)}
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
