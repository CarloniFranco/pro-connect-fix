import { motion } from "framer-motion";
import { Briefcase, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ProCTA = () => {
  const navigate = useNavigate();
  return (
    <section className="px-4 pb-16 pt-8 md:pb-24 md:pt-12">
      <div className="container mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl border-4 border-accent bg-primary p-6 text-center shadow-xl md:p-10"
        >

          <div className="relative z-10">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-white/20">
              <Briefcase className="h-7 w-7 text-accent" />
            </div>
            <h3 className="mb-2 font-display text-xl font-bold text-primary-foreground md:text-2xl">
              ¿Sos Profesional?
            </h3>
            <p className="mb-6 text-sm text-primary-foreground/70 md:text-base">
              Digitalizá tu negocio y llegá a más clientes 🚀
            </p>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/auth")}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 font-display text-sm font-bold text-accent-foreground shadow-lg transition-colors hover:bg-accent/90 md:px-8 md:py-4 md:text-base"
            >
              Quiero Digitalizar mi Negocio
              <ArrowRight className="h-4 w-4" />
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ProCTA;
