import { motion } from "framer-motion";
import { Home, Scissors, Car, PawPrint } from "lucide-react";
import { useNavigate } from "react-router-dom";
import FelixLogo from "@/components/FelixLogo";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden bg-background px-4 pb-16 pt-20 sm:pb-20 sm:pt-24 md:pb-28 md:pt-36">

      <div className="container relative z-10 mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 border border-primary/10">
            <span className="text-sm font-medium text-primary">
              Tu problema, resuelto.
            </span>
          </div>

          {/* Felix + FIX wordmark */}
          <div className="mb-3 flex items-center justify-center gap-3 sm:gap-4">
            <motion.div
              initial={{ scale: 0.6, rotate: -20, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.2 }}
              className="shrink-0"
            >
              <FelixLogo
                className="h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28"
                wink
              />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="font-display text-6xl font-bold tracking-tight text-foreground sm:text-7xl md:text-8xl"
            >
              FIX
            </motion.h1>
          </div>

          <p className="mx-auto mb-8 max-w-md text-base font-medium text-muted-foreground sm:mb-12 sm:text-lg md:text-xl">
            ¿Qué tipo de servicio necesitas?
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
              className="group flex flex-col items-center gap-2 rounded-xl bg-card p-4 border border-border shadow-sm transition-all hover:border-primary/30 hover:shadow-md md:gap-3 md:p-6"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${cat.bg} shadow-sm md:h-14 md:w-14`}>
                <cat.icon className={`h-6 w-6 ${cat.fg} md:h-7 md:w-7`} />
              </div>
              <span className="font-display text-base font-bold text-foreground md:text-lg">
                {cat.label}
              </span>
              <span className="text-[10px] text-muted-foreground md:text-xs">
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
