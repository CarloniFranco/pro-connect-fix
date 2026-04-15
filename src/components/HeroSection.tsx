import { motion } from "framer-motion";
import { Home, Scissors, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden bg-primary px-4 pb-20 pt-24 md:pb-28 md:pt-36">
      {/* Subtle geometric accents */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute left-[10%] top-[20%] h-24 w-24 rounded-2xl border-2 border-primary-foreground/40 rotate-12" />
        <div className="absolute right-[12%] top-[30%] h-16 w-16 rounded-full border-2 border-primary-foreground/30" />
        <div className="absolute left-[40%] bottom-[15%] h-20 w-20 rounded-xl border-2 border-primary-foreground/20 -rotate-6" />
      </div>

      <div className="container relative z-10 mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2 backdrop-blur-sm">
            <Wrench className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-primary-foreground/80">
              Tu solución a un click
            </span>
          </div>

          <h1 className="mb-3 font-display text-5xl font-bold tracking-tight text-primary-foreground md:text-7xl">
            <span className="relative inline-flex items-center">
              {/* FIX text — starts tilted/broken, then straightens on hammer hit */}
              <motion.span
                initial={{ rotate: -12, scale: 0.95 }}
                animate={{ rotate: [-12, -12, 0, -2, 0], scale: [0.95, 0.95, 1.05, 0.98, 1] }}
                transition={{
                  duration: 1.8,
                  delay: 0.6,
                  times: [0, 0.45, 0.6, 0.75, 0.85],
                  ease: "easeOut",
                }}
                className="inline-block origin-bottom-left"
                style={{ animation: "fixPulse 30s ease-in-out 3s infinite" }}
              >
                FIX
              </motion.span>

              {/* Cursor arrow — slides in, clicks on FIX, then exits */}
              <motion.svg
                initial={{ opacity: 0, x: 40, y: -50 }}
                animate={{
                  opacity: [0, 1, 1, 1, 1, 0],
                  x: [40, 20, 2, 2, 2, 30],
                  y: [-50, -30, 2, 2, 2, -30],
                  scale: [1, 1, 1, 0.85, 1, 1],
                }}
                transition={{
                  duration: 1.8,
                  delay: 0.6,
                  times: [0, 0.25, 0.45, 0.55, 0.65, 1],
                  ease: "easeInOut",
                }}
                className="absolute -right-6 top-0 pointer-events-none md:-right-10 md:-top-2"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="white"
                stroke="hsl(var(--primary))"
                strokeWidth="1.5"
              >
                <path d="M5 3l14 8-6.5 1.5L11 19z" />
              </motion.svg>

              {/* Sparkle burst on impact */}
              <motion.span
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 1, 0], scale: [0, 1.3, 0] }}
                transition={{
                  duration: 0.5,
                  delay: 1.5,
                  ease: "easeOut",
                }}
                className="absolute -right-4 -top-4 text-2xl md:-right-6 md:-top-6 md:text-3xl pointer-events-none"
              >
                ✨
              </motion.span>
            </span>
          </h1>
          <p className="mx-auto mb-12 max-w-md text-lg font-medium text-primary-foreground/70 md:text-xl">
            ¿Qué tipo de servicio necesitás?
          </p>
        </motion.div>

        {/* Two main category buttons */}
        <div className="mx-auto flex max-w-lg flex-col gap-4 sm:flex-row sm:gap-5">
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/servicios/hogar")}
            className="group flex flex-1 flex-col items-center gap-3 rounded-xl bg-primary-foreground/10 p-6 backdrop-blur-sm border border-primary-foreground/15 transition-all hover:bg-primary-foreground/15 md:p-8"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-secondary shadow-md md:h-16 md:w-16">
              <Home className="h-7 w-7 text-secondary-foreground md:h-8 md:w-8" />
            </div>
            <span className="font-display text-lg font-bold text-primary-foreground md:text-xl">
              Hogar
            </span>
            <span className="text-xs text-primary-foreground/60 md:text-sm">
              Plomería, Electricidad, Gas y más
            </span>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/servicios/personal")}
            className="group flex flex-1 flex-col items-center gap-3 rounded-xl bg-primary-foreground/10 p-6 backdrop-blur-sm border border-primary-foreground/15 transition-all hover:bg-primary-foreground/15 md:p-8"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-accent shadow-md md:h-16 md:w-16">
              <Scissors className="h-7 w-7 text-accent-foreground md:h-8 md:w-8" />
            </div>
            <span className="font-display text-lg font-bold text-primary-foreground md:text-xl">
              Personal
            </span>
            <span className="text-xs text-primary-foreground/60 md:text-sm">
              Peluquería, Uñas, Estética
            </span>
          </motion.button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
