import { motion } from "framer-motion";
import { Wrench } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden bg-primary px-4 pb-16 pt-24 md:pb-24 md:pt-32">
      {/* Decorative blocks - Mario inspired */}
      <div className="absolute left-4 top-20 h-8 w-8 rounded-sm bg-accent/30 md:h-12 md:w-12" />
      <div className="absolute right-8 top-32 h-6 w-6 rounded-sm bg-secondary/30 md:h-10 md:w-10" />
      <div className="absolute bottom-10 left-1/4 h-6 w-6 rounded-sm bg-accent/20" />

      <div className="container relative z-10 mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2 backdrop-blur-sm">
            <Wrench className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-primary-foreground/90">
              Tu solución a un click
            </span>
          </div>

          <h1 className="mb-4 font-display text-5xl font-bold tracking-tight text-primary-foreground md:text-7xl">
            FIX
          </h1>
          <p className="mx-auto mb-2 max-w-lg text-lg font-medium text-primary-foreground/80 md:text-xl">
            Encontrá al profesional que necesitás.
          </p>
          <p className="mx-auto max-w-md text-sm text-primary-foreground/60">
            Servicios para tu hogar y servicios personales, todo en un solo lugar.
          </p>
        </motion.div>

        {/* Pipe decoration */}
        <div className="mx-auto mt-12 flex justify-center gap-3">
          <div className="h-3 w-10 rounded-full bg-pipe/40" />
          <div className="h-3 w-3 rounded-full bg-accent/50" />
          <div className="h-3 w-10 rounded-full bg-secondary/40" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
