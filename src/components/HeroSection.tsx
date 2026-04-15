import { motion } from "framer-motion";
import { Home, Scissors, Star, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-24 md:pb-32 md:pt-36"
      style={{ background: "linear-gradient(180deg, hsl(200 80% 65%) 0%, hsl(200 85% 75%) 100%)" }}
    >
      {/* Floating clouds */}
      <motion.div
        animate={{ x: [0, 30, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-[10%] top-20 h-8 w-20 rounded-full bg-white/60 shadow-sm"
      />
      <motion.div
        animate={{ x: [0, -20, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute right-[15%] top-28 h-6 w-14 rounded-full bg-white/50 shadow-sm"
      />
      <motion.div
        animate={{ x: [0, 15, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-[50%] top-16 h-5 w-12 rounded-full bg-white/40"
      />

      {/* Floating coins */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute left-[8%] top-[55%] flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground shadow-lg md:h-10 md:w-10"
      >
        <Star className="h-4 w-4" />
      </motion.div>
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
        className="absolute right-[10%] top-[45%] flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground shadow-lg md:h-9 md:w-9"
      >
        <Star className="h-3 w-3" />
      </motion.div>

      {/* Decorative brick blocks */}
      <div className="absolute left-4 bottom-8 flex gap-1">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-6 w-6 rounded-sm border border-orange-700/30 md:h-8 md:w-8"
            style={{ background: "hsl(20 55% 50%)" }} />
        ))}
      </div>
      <div className="absolute right-4 bottom-8 flex gap-1">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-6 w-6 rounded-sm border border-orange-700/30 md:h-8 md:w-8"
            style={{ background: "hsl(20 55% 50%)" }} />
        ))}
      </div>

      {/* Green pipes */}
      <div className="absolute left-[5%] bottom-0 hidden md:block">
        <div className="mx-auto h-4 w-14 rounded-t-md" style={{ background: "hsl(120 65% 35%)" }} />
        <div className="mx-1 h-12 w-12" style={{ background: "hsl(120 65% 40%)" }} />
      </div>
      <div className="absolute right-[7%] bottom-0 hidden md:block">
        <div className="mx-auto h-4 w-14 rounded-t-md" style={{ background: "hsl(120 65% 35%)" }} />
        <div className="mx-1 h-8 w-12" style={{ background: "hsl(120 65% 40%)" }} />
      </div>

      <div className="container relative z-10 mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 backdrop-blur-sm">
            <Wrench className="h-4 w-4 text-accent" />
            <span className="text-sm font-bold text-white">
              Tu solución a un click ⭐
            </span>
          </div>

          <h1 className="mb-3 font-display text-6xl font-bold tracking-tight text-white drop-shadow-lg md:text-8xl">
            FIX
          </h1>
          <p className="mx-auto mb-10 max-w-md text-lg font-semibold text-white/90 md:text-xl">
            ¿Qué tipo de servicio necesitás?
          </p>
        </motion.div>

        {/* Two main category buttons */}
        <div className="mx-auto flex max-w-lg flex-col gap-4 sm:flex-row sm:gap-6">
          <motion.button
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, type: "spring" }}
            whileHover={{ scale: 1.05, y: -4 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/servicios/hogar")}
            className="group flex flex-1 flex-col items-center gap-3 rounded-2xl border-4 border-white/30 bg-primary p-6 shadow-xl transition-all hover:border-accent hover:shadow-2xl md:p-8"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/20 transition-colors group-hover:bg-accent md:h-20 md:w-20">
              <Home className="h-8 w-8 text-primary-foreground transition-colors group-hover:text-accent-foreground md:h-10 md:w-10" />
            </div>
            <span className="font-display text-xl font-bold text-primary-foreground md:text-2xl">
              Hogar
            </span>
            <span className="text-xs text-primary-foreground/70 md:text-sm">
              Plomería, Electricidad, Gas, Jardinería y más
            </span>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, type: "spring" }}
            whileHover={{ scale: 1.05, y: -4 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/servicios/personal")}
            className="group flex flex-1 flex-col items-center gap-3 rounded-2xl border-4 border-white/30 bg-secondary p-6 shadow-xl transition-all hover:border-accent hover:shadow-2xl md:p-8"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/20 transition-colors group-hover:bg-accent md:h-20 md:w-20">
              <Scissors className="h-8 w-8 text-secondary-foreground transition-colors group-hover:text-accent-foreground md:h-10 md:w-10" />
            </div>
            <span className="font-display text-xl font-bold text-secondary-foreground md:text-2xl">
              Personal
            </span>
            <span className="text-xs text-secondary-foreground/70 md:text-sm">
              Peluquería, Uñas, Estética
            </span>
          </motion.button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
