import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Home,
  Droplets,
  Zap,
  Flame,
  Car,
  Wrench,
  TreePine,
  Waves,
  Thermometer,
  Scissors,
  Sparkles,
  User,
} from "lucide-react";

const homeServices = [
  { icon: Droplets, label: "Plomería" },
  { icon: Zap, label: "Electricidad" },
  { icon: Flame, label: "Gas" },
  { icon: Car, label: "Lavadero de Auto" },
  { icon: Wrench, label: "Taller Mecánico" },
  { icon: TreePine, label: "Jardinería" },
  { icon: Waves, label: "Piletero" },
  { icon: Thermometer, label: "Calefacción y Refrigeración" },
];

const personalServices = [
  { icon: Scissors, label: "Peluquería" },
  { icon: Sparkles, label: "Uñas" },
  { icon: User, label: "Estética" },
];

const ServiceCard = ({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.97 }}
    onClick={onClick}
    className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md hover:border-primary"
  >
    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
      <Icon className="h-6 w-6 text-primary" />
    </div>
    <span className="text-center text-xs font-semibold text-card-foreground">
      {label}
    </span>
  </motion.button>
);

const ServiceCategories = () => {
  const navigate = useNavigate();

  const handleCategoryClick = (label: string) => {
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
                {...service}
                onClick={() => handleCategoryClick(service.label)}
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
                {...service}
                onClick={() => handleCategoryClick(service.label)}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ServiceCategories;
