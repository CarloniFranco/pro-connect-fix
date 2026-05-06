import { useNavigate } from "react-router-dom";
import {
  Home,
  Car,
  Droplets,
  Zap,
  Flame,
  TreePine,
  Waves,
  Thermometer,
  Scissors,
  Sparkles,
  User,
  Wrench,
  PawPrint,
  Footprints,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const vehicleServices = [
  { icon: Car, label: "Lavadero de Auto", isActive: true },
  { icon: Wrench, label: "Taller Mecánico", isActive: false },
];

const homeServices = [
  { icon: Droplets, label: "Plomería", isActive: false },
  { icon: Zap, label: "Electricidad", isActive: false },
  { icon: Flame, label: "Gas", isActive: false },
  { icon: TreePine, label: "Jardinería", isActive: false },
  { icon: Waves, label: "Piletero", isActive: false },
  { icon: Thermometer, label: "Calefacción y Refrigeración", isActive: false },
];

const personalServices = [
  { icon: Scissors, label: "Peluquería", isActive: false },
  { icon: Sparkles, label: "Uñas", isActive: false },
  { icon: User, label: "Estética", isActive: false },
];

const petServices = [
  { icon: Footprints, label: "Paseo de Mascotas", isActive: false },
  { icon: PawPrint, label: "Peluquería Canina", isActive: false },
];

const prefetchProfessionalsList = () => {
  import("@/pages/ProfessionalsList");
};

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
  <button
    onClick={onClick}
    onMouseEnter={isActive ? prefetchProfessionalsList : undefined}
    onTouchStart={isActive ? prefetchProfessionalsList : undefined}
    disabled={!isActive}
    style={{ transition: "none" }}
    className={`flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4 shadow-sm relative ${
      isActive
        ? "hover:border-primary cursor-pointer"
        : "opacity-50 cursor-not-allowed"
    }`}
  >
    {!isActive && (
      <Badge variant="destructive" className="absolute -top-2 -right-2 text-[10px] px-1.5 py-0.5">
        Próximamente
      </Badge>
    )}
    <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${isActive ? "bg-primary" : "bg-muted"}`}>
      <Icon className={`h-6 w-6 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`} />
    </div>
    <span className={`text-center text-xs font-semibold ${isActive ? "text-card-foreground" : "text-muted-foreground"}`}>
      {label}
    </span>
  </button>
);


type Section = {
  key: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  iconBg: string;
  services: { icon: React.ElementType; label: string; isActive: boolean }[];
};

const sections: Section[] = [
  {
    key: "vehiculo",
    title: "Vehículo",
    subtitle: "Auto y moto",
    icon: Car,
    iconBg: "bg-primary",
    services: vehicleServices,
  },
  {
    key: "hogar",
    title: "Servicios para el Hogar",
    subtitle: "y otros",
    icon: Home,
    iconBg: "bg-primary",
    services: homeServices,
  },
  {
    key: "personal",
    title: "Servicios Personales",
    subtitle: "Cuidado y estética",
    icon: Scissors,
    iconBg: "bg-secondary",
    services: personalServices,
  },
  {
    key: "mascotas",
    title: "Mascotas",
    subtitle: "Cuidado animal",
    icon: PawPrint,
    iconBg: "bg-accent",
    services: petServices,
  },
];

const ServiceCategories = () => {
  const navigate = useNavigate();

  const handleCategoryClick = (label: string, isActive: boolean) => {
    if (!isActive) return;
    window.scrollTo(0, 0);
    navigate(`/profesionales/${encodeURIComponent(label)}`);
  };

  return (
    <section className="px-4 py-12 md:py-20">
      <div className="container mx-auto max-w-4xl space-y-12">
        {sections.map((section) => (
          <div key={section.key}>
            <div className="mb-6 flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${section.iconBg}`}>
                <section.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
                  {section.title}
                </h2>
                <p className="text-sm text-muted-foreground">{section.subtitle}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-4">
              {section.services.map((service) => (
                <ServiceCard
                  key={service.label}
                  icon={service.icon}
                  label={service.label}
                  isActive={service.isActive}
                  onClick={() => handleCategoryClick(service.label, service.isActive)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ServiceCategories;
