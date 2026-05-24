import { Home, Scissors, Car, PawPrint } from "lucide-react";
import { useNavigate } from "react-router-dom";
import FelixLogo from "@/components/FelixLogo";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden bg-background px-4 pb-16 pt-20 sm:pb-20 sm:pt-24 md:pb-28 md:pt-36">

      <div className="container relative z-10 mx-auto max-w-3xl text-center">
        <div
         
         
         
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 border border-primary/10">
            <span className="text-sm font-medium text-primary">
              Tu problema, <strong className="font-bold">resuelto</strong>.
            </span>
          </div>

          {/* Felix + FIX wordmark */}
          <div className="mb-3 flex items-center justify-center gap-3 sm:gap-4">
            <div
             
             
             
              className="shrink-0"
            >
              <FelixLogo
                className="h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28"
                animate
              />
            </div>
            <h1
             
             
             
              className="font-display text-6xl font-bold tracking-tight text-foreground sm:text-7xl md:text-8xl"
            >
              FIX
            </h1>
          </div>

          <p className="mx-auto mb-8 max-w-md text-base font-medium text-muted-foreground sm:mb-12 sm:text-lg md:text-xl">
            ¿Qué tipo de servicio necesitas?
          </p>
        </div>

        {/* Four main category buttons */}
        <div className="mx-auto grid max-w-2xl grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {[
            { label: "Vehículo", desc: "Lavadero, Taller", icon: Car, bg: "bg-vehicle", fg: "text-vehicle-foreground", route: "/servicios/vehiculo", delay: 0.2, soon: false },
            { label: "Hogar", desc: "Plomería, Gas y más", icon: Home, bg: "bg-home-cat", fg: "text-home-cat-foreground", route: "/servicios/hogar", delay: 0.25, soon: true },
            { label: "Personal", desc: "Peluquería, Estética", icon: Scissors, bg: "bg-personal-cat", fg: "text-personal-cat-foreground", route: "/servicios/personal", delay: 0.3, soon: true },
            { label: "Mascotas", desc: "Paseo, Peluquería", icon: PawPrint, bg: "bg-pet", fg: "text-pet-foreground", route: "/servicios/mascotas", delay: 0.35, soon: true },
          ].map((cat) => (
            <button
              key={cat.label}
             
             
             
             
             
              onClick={() => navigate(cat.route)}
              className="group relative flex flex-col items-center gap-2 rounded-xl bg-card p-4 border border-border shadow-sm transition-all hover:border-primary/30 hover:shadow-md md:gap-3 md:p-6"
            >
              {cat.soon && (
                <span className="absolute -top-2 right-2 rounded-full bg-accent px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent-foreground shadow-sm md:text-[10px]">
                  Próximamente
                </span>
              )}
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${cat.bg} shadow-sm md:h-14 md:w-14`}>
                <cat.icon className={`h-6 w-6 ${cat.fg} md:h-7 md:w-7`} />
              </div>
              <span className="font-display text-base font-bold text-foreground md:text-lg">
                {cat.label}
              </span>
              <span className="text-[10px] text-muted-foreground md:text-xs">
                {cat.desc}
              </span>
            </button>
          ))}

        </div>
      </div>
    </section>
  );
};

export default HeroSection;
