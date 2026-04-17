import { motion } from "framer-motion";
import { ArrowLeft, Scissors, Sparkles, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";

const services = [
  { icon: Scissors, label: "Peluquería", color: "bg-primary", isActive: false },
  { icon: Sparkles, label: "Uñas", color: "bg-secondary", isActive: false },
  { icon: User, label: "Estética", color: "bg-accent", isActive: false },
];

const PersonalServices = () => {
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
          ✨ Servicios Personales
        </motion.h1>
        <p className="mb-8 text-muted-foreground">Cuidado y estética personal</p>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {services.map((service, i) => (
            <motion.button
              key={service.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              disabled={!service.isActive}
              className="flex flex-col items-center gap-3 rounded-2xl border-2 border-border bg-card p-5 shadow-md transition-all relative opacity-50 cursor-not-allowed"
            >
              <Badge variant="secondary" className="absolute -top-2 -right-2 text-xs">
                Próximamente
              </Badge>
              <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${service.color} shadow-md grayscale`}>
                <service.icon className="h-7 w-7 text-white" />
              </div>
              <span className="text-center text-sm font-bold text-muted-foreground">
                {service.label}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PersonalServices;