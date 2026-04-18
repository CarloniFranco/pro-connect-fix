import { motion } from "framer-motion";
import { ArrowLeft, Droplets, Zap, Flame, TreePine, Waves, Thermometer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";

const services = [
  { icon: Droplets, label: "Plomería", color: "bg-secondary", isActive: false },
  { icon: Zap, label: "Electricidad", color: "bg-accent", isActive: false },
  { icon: Flame, label: "Gas", color: "bg-primary", isActive: false },
  { icon: TreePine, label: "Jardinería", color: "bg-pipe", isActive: false },
  { icon: Waves, label: "Piletero", color: "bg-secondary", isActive: false },
  { icon: Thermometer, label: "Calefacción y Refrigeración", color: "bg-primary", isActive: false },
];

const HomeServices = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto max-w-3xl px-4 pt-24 pb-16">
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate("/")}
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </motion.button>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-2 font-display text-3xl font-bold text-foreground md:text-4xl"
        >
          🏠 Servicios para el Hogar
        </motion.h1>
        <p className="mb-8 text-muted-foreground">Elegí el servicio que necesitás</p>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {services.map((service, i) => (
            <motion.button
              key={service.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={service.isActive ? { scale: 1.05, y: -4 } : {}}
              whileTap={service.isActive ? { scale: 0.95 } : {}}
              onClick={() => service.isActive && navigate(`/profesionales/${encodeURIComponent(service.label)}`)}
              disabled={!service.isActive}
              className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-border bg-card p-5 shadow-md transition-all relative ${
                service.isActive
                  ? "hover:shadow-xl hover:border-primary cursor-pointer"
                  : "opacity-50 cursor-not-allowed"
              }`}
            >
              {!service.isActive && (
                <Badge variant="secondary" className="absolute -top-2 -right-2 text-xs">
                  Próximamente
                </Badge>
              )}
              <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${service.color} shadow-md ${!service.isActive ? "grayscale" : ""}`}>
                <service.icon className="h-7 w-7 text-white" />
              </div>
              <span className={`text-center text-sm font-bold ${service.isActive ? "text-card-foreground" : "text-muted-foreground"}`}>
                {service.label}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomeServices;