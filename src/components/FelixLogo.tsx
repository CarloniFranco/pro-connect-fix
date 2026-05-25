import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export type FelixMood = "neutral" | "happy" | "sad";

interface FelixLogoProps {
  className?: string;
  /** wink the right eye (firma state) — solo aplica a mood "neutral" */
  wink?: boolean;
  /** continuously wink every few seconds — solo aplica a mood "neutral" */
  animate?: boolean;
  /** estado emocional de Felix */
  mood?: FelixMood;
  /** override fill color (defaults to hsl(var(--primary))) */
  color?: string;
  /** show ground shadow under Felix */
  withShadow?: boolean;
}

/**
 * Felix — la mascota de FIX.
 * X violeta con carita. SVG vectorial, escala perfecta.
 * mood: neutral (default, soporta wink), happy (festejando), sad (triste).
 */
const FelixLogo = ({
  className,
  wink = true,
  animate = false,
  mood = "neutral",
  color,
  withShadow = false,
}: FelixLogoProps) => {
  const [isWinking, setIsWinking] = useState(animate ? false : wink);
  const fill = color ?? "hsl(var(--primary))";

  useEffect(() => {
    if (mood !== "neutral") return;
    if (!animate) {
      setIsWinking(wink);
      return;
    }
    setIsWinking(false);
    const initial = setTimeout(() => setIsWinking(true), 3000);
    const interval = setInterval(() => {
      setIsWinking(false);
      setTimeout(() => setIsWinking(true), 3000);
    }, 60000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [animate, wink, mood]);

  // Mood-based animation class (apply to wrapper so SVG bounces/sways)
  const moodAnim =
    mood === "happy"
      ? "animate-felix-celebrate origin-bottom"
      : mood === "sad"
      ? "animate-felix-sway origin-top"
      : "";

  return (
    <svg
      viewBox="0 0 120 130"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("block", moodAnim, className)}
      aria-label="Felix, la mascota de FIX"
      role="img"
    >
      {/* Cuerpo: dos barras redondeadas cruzadas */}
      <g>
        <rect x="14" y="46" width="92" height="28" rx="14" ry="14" fill={fill} transform="rotate(45 60 60)" />
        <rect x="14" y="46" width="92" height="28" rx="14" ry="14" fill={fill} transform="rotate(-45 60 60)" />
      </g>

      {/* Cara */}
      <g>
        {mood === "happy" ? (
          <>
            {/* Ojos cerrados de felicidad ^_^ */}
            <path d="M 42 56 Q 48 50 54 56" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <path d="M 66 56 Q 72 50 78 56" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            {/* Sonrisa amplia con dientes/lengua sugerida */}
            <path d="M 48 66 Q 60 80 72 66" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            {/* Rubores */}
            <circle cx="40" cy="64" r="3" fill="#FFFFFF" opacity="0.55" />
            <circle cx="80" cy="64" r="3" fill="#FFFFFF" opacity="0.55" />
          </>
        ) : mood === "sad" ? (
          <>
            {/* Ojos tristes, párpado caído */}
            <circle cx="48" cy="55" r="7" fill="#FFFFFF" />
            <circle cx="48" cy="57" r="3" fill="#0F0B2E" />
            <path d="M 41 52 Q 48 49 55 52" stroke={fill} strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <circle cx="72" cy="55" r="7" fill="#FFFFFF" />
            <circle cx="72" cy="57" r="3" fill="#0F0B2E" />
            <path d="M 65 52 Q 72 49 79 52" stroke={fill} strokeWidth="2.5" strokeLinecap="round" fill="none" />
            {/* Boca triste */}
            <path d="M 52 74 Q 60 66 68 74" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" fill="none" />
            {/* Lagrimita */}
            <path d="M 46 64 Q 45 70 48 72 Q 51 70 50 64 Z" fill="#7DD3FC" opacity="0.85" />
          </>
        ) : (
          <>
            {/* Círculo de la cara centrado en la X */}
            <circle cx="60" cy="60" r="20" fill={fill} />

            {/* Ojo izquierdo grande con pupila y brillo */}
            <circle cx="52" cy="58" r="6.5" fill="#FFFFFF" />
            <circle cx="52.5" cy="59" r="4" fill="#0F0B2E" />
            <circle cx="54" cy="57" r="1.4" fill="#FFFFFF" />

            {/* Ojo derecho (guiña si isWinking) */}
            {isWinking ? (
              <path d="M 62 58 Q 68 54 74 58" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" fill="none" />
            ) : (
              <>
                <circle cx="68" cy="58" r="6.5" fill="#FFFFFF" />
                <circle cx="68.5" cy="59" r="4" fill="#0F0B2E" />
                <circle cx="70" cy="57" r="1.4" fill="#FFFFFF" />
              </>
            )}

            {/* Sonrisa simple */}
            <path d="M 54 70 Q 60 75 66 70" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" fill="none" />
          </>


        )}
      </g>

      {withShadow && <ellipse cx="60" cy="120" rx="22" ry="4" fill={fill} opacity="0.25" />}
    </svg>
  );
};

export default FelixLogo;
