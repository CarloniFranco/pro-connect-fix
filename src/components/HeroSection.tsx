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
            FI
            <motion.span
              initial={{ y: -180, scaleY: 1.3, scaleX: 0.8, opacity: 0 }}
              animate={{
                y: [null, 0, -18, 0, -6, 0],
                scaleY: [1.3, 0.7, 1.1, 0.9, 1.05, 1],
                scaleX: [0.8, 1.3, 0.95, 1.1, 0.98, 1],
                opacity: 1,
              }}
              transition={{
                duration: 1.4,
                delay: 0.3,
                ease: "easeOut",
                y: { duration: 1.4, times: [0, 0.4, 0.55, 0.7, 0.85, 1] },
                scaleY: { duration: 1.4, times: [0, 0.4, 0.55, 0.7, 0.85, 1] },
                scaleX: { duration: 1.4, times: [0, 0.4, 0.55, 0.7, 0.85, 1] },
              }}
              className="inline-block origin-bottom"
              style={{ animation: "spinX 30s ease-in-out 2s infinite" }}
            >
              X
            </motion.span>
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
