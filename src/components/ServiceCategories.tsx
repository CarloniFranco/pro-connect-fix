import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Home,
  Car,
  Droplets,
  Zap,
  Flame,
  Wrench,
  TreePine,
  Waves,
  Thermometer,
  Scissors,
  Sparkles,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const homeServices = [
  { icon: Car, label: "Lavadero de Auto", isActive: true },
  { icon: Droplets, label: "Plomería", isActive: false },
  { icon: Zap, label: "Electricidad", isActive: false },
  { icon: Flame, label: "Gas", isActive: false },
  { icon: Wrench, label: "Taller Mecánico", isActive: false },
  { icon: TreePine, label: "Jardinería", isActive: false },
  { icon: Waves, label: "Piletero", isActive: false },
  { icon: Thermometer, label: "Calefacción y Refrigeración", isActive: false },
];

const personalServices = [
  { icon: Scissors, label: "Peluquería", isActive: false },
  { icon: Sparkles, label: "Uñas", isActive: false },
  { icon: User, label: "Estética", isActive: false },
];

const ServiceCard = ({
  icon: Icon,
  label,
  isActive,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) => (
  <motion.button
    whileHover={isActive ? { scale: 1.05 } : {}}
    whileTap={isActive ? { scale: 0.97 } : {}}
    onClick={onClick}
    disabled={!isActive}
    className={`flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4 shadow-sm transition-all relative ${
      isActive
        ? "hover:shadow-md hover:border-primary cursor-pointer"
        : "opacity-50 cursor-not-allowed"
    }`}
  >
    {!isActive && (
      <Badge variant="secondary" className="absolute -top-2 -right-2 text-[10px] px-1.5 py-0.5">
        Próximamente
      </Badge>
    )}
    <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${isActive ? "bg-primary" : "bg-muted"}`}>
      <Icon className={`h-6 w-6 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`} />
    </div>
    <span className={`text-center text-xs font-semibold ${isActive ? "text-card-foreground" : "text-muted-foreground"}`}>
      {label}
    </span>
  </motion.button>
);

const ServiceCategories = () => {
  const navigate = useNavigate();

  const handleCategoryClick = (label: string, isActive: boolean) => {
    if (!isActive) return;
    navigate(`/profesionales/${encodeURIComponent(label)}`);
  };

  return (
    <section className="px-4 py-12 md:py-20">
      <div className="container mx-auto max-w-4xl">
        {/* Home Services */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Home className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
                Servicios para el Hogar
              </h2>
              <p className="text-sm text-muted-foreground">y otros</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-4">
            {homeServices.map((service) => (
              <ServiceCard
                key={service.label}
                icon={service.icon}
                label={service.label}
                isActive={service.isActive}
                onClick={() => handleCategoryClick(service.label, service.isActive)}
              />
            ))}
          </div>
        </motion.div>

        {/* Personal Services */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
              <Scissors className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
                Servicios Personales
              </h2>
              <p className="text-sm text-muted-foreground">Cuidado y estética</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:grid-cols-3 md:grid-cols-3">
            {personalServices.map((service) => (
              <ServiceCard
                key={service.label}
                icon={service.icon}
                label={service.label}
                isActive={service.isActive}
                onClick={() => handleCategoryClick(service.label, service.isActive)}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ServiceCategories;