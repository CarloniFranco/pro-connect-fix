import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface FelixLogoProps {
  className?: string;
  /** wink the right eye (firma state) */
  wink?: boolean;
  /** continuously wink every few seconds */
  animate?: boolean;
  /** override fill color (defaults to hsl(var(--primary))) */
  color?: string;
  /** show ground shadow under Felix */
  withShadow?: boolean;
}

/**
 * Felix — la mascota de FIX.
 * X violeta con carita amistosa. SVG vectorial, escala perfecta.
 */
const FelixLogo = ({ className, wink = true, animate = false, color, withShadow = false }: FelixLogoProps) => {
  // Si animate, arranca con los dos ojos abiertos y guiña al entrar.
  const [isWinking, setIsWinking] = useState(animate ? false : wink);
  const fill = color ?? "hsl(var(--primary))";

  useEffect(() => {
    if (!animate) {
      setIsWinking(wink);
      return;
    }
    // Guiño inicial al montar
    const initialTimeout = setTimeout(() => {
      setIsWinking(true);
      setTimeout(() => setIsWinking(false), 280);
    }, 500);
    // Luego, cada 2 minutos guiña una vez
    const interval = setInterval(() => {
      setIsWinking(true);
      setTimeout(() => setIsWinking(false), 280);
    }, 120000);
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [animate, wink]);

  return (
    <svg
      viewBox="0 0 120 130"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("block", className)}
      aria-label="Felix, la mascota de FIX"
      role="img"
    >
      {/* Cuerpo: dos barras redondeadas cruzadas */}
      <g>
        <rect
          x="14"
          y="46"
          width="92"
          height="28"
          rx="14"
          ry="14"
          fill={fill}
          transform="rotate(45 60 60)"
        />
        <rect
          x="14"
          y="46"
          width="92"
          height="28"
          rx="14"
          ry="14"
          fill={fill}
          transform="rotate(-45 60 60)"
        />
      </g>

      {/* Cara */}
      <g>
        {/* Ojo izquierdo */}
        <circle cx="48" cy="54" r="8" fill="#FFFFFF" />
        <circle cx="49.5" cy="55" r="3.4" fill="#0F0B2E" />

        {/* Ojo derecho (guiña si isWinking) */}
        {isWinking ? (
          <path
            d="M 64 54 Q 72 50 80 54"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
        ) : (
          <>
            <circle cx="72" cy="54" r="8" fill="#FFFFFF" />
            <circle cx="73.5" cy="55" r="3.4" fill="#0F0B2E" />
          </>
        )}

        {/* Sonrisa */}
        <path
          d="M 52 68 Q 60 76 68 68"
          stroke="#FFFFFF"
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
        />
      </g>

      {/* Sombra opcional */}
      {withShadow && (
        <ellipse
          cx="60"
          cy="120"
          rx="22"
          ry="4"
          fill={fill}
          opacity="0.25"
        />
      )}
    </svg>
  );
};

export default FelixLogo;
