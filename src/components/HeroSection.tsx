import { motion } from "framer-motion";
import { Home, Scissors, Wrench, Car, PawPrint } from "lucide-react";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden bg-primary px-4 pb-16 pt-20 sm:pb-20 sm:pt-24 md:pb-28 md:pt-36">
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
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2">
            <Wrench className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-primary-foreground/80">
              Tu solución a un click
            </span>
          </div>

          <h1 className="mb-3 font-display text-[3.25rem] leading-none font-bold tracking-tight text-primary-foreground sm:text-6xl md:text-7xl">
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
          <p className="mx-auto mb-8 max-w-md text-base font-medium text-primary-foreground/70 sm:mb-12 sm:text-lg md:text-xl">
            ¿Qué tipo de servicio necesitás?
          </p>
        </motion.div>

        {/* Four main category buttons */}
        <div className="mx-auto grid max-w-2xl grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {[
            { label: "Vehículo", desc: "Lavadero, Taller", icon: Car, bg: "bg-vehicle", fg: "text-vehicle-foreground", route: "/servicios/vehiculo", delay: 0.2 },
            { label: "Hogar", desc: "Plomería, Gas y más", icon: Home, bg: "bg-home-cat", fg: "text-home-cat-foreground", route: "/servicios/hogar", delay: 0.25 },
            { label: "Personal", desc: "Peluquería, Estética", icon: Scissors, bg: "bg-personal-cat", fg: "text-personal-cat-foreground", route: "/servicios/personal", delay: 0.3 },
            { label: "Mascotas", desc: "Paseo, Peluquería", icon: PawPrint, bg: "bg-pet", fg: "text-pet-foreground", route: "/servicios/mascotas", delay: 0.35 },
          ].map((cat) => (
            <motion.button
              key={cat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: cat.delay, duration: 0.5 }}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(cat.route)}
              className="group flex flex-col items-center gap-2 rounded-xl bg-primary-foreground/10 p-4 border border-primary-foreground/15 transition-colors hover:bg-primary-foreground/15 md:gap-3 md:p-6"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${cat.bg} shadow-md md:h-14 md:w-14`}>
                <cat.icon className={`h-6 w-6 ${cat.fg} md:h-7 md:w-7`} />
              </div>
              <span className="font-display text-base font-bold text-primary-foreground md:text-lg">
                {cat.label}
              </span>
              <span className="text-[10px] text-primary-foreground/60 md:text-xs">
                {cat.desc}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
