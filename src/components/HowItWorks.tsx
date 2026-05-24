import { Wrench, HeartHandshake, Star, BellRing, Zap, Coins } from "lucide-react";
import { useState } from "react";

const clientSteps = [
  {
    icon: Wrench,
    title: "Elegí servicio y profesional",
    text: "Buscá el rubro que necesitás, elegí al profesional que más te convenza y seleccioná un día y horario disponible.",
  },
  {
    icon: HeartHandshake,
    title: "Pagá la seña y reservá",
    text: "Abonás una seña del 10% por Mercado Pago y tu turno queda confirmado al instante. Rápido, seguro y sin vueltas.",
  },
  {
    icon: Star,
    title: "Recibí el servicio y reseñá",
    text: "El profesional realiza el trabajo en el día acordado. Después contás tu experiencia con una reseña para ayudar a la comunidad.",
  },
];

const proSteps = [
  {
    icon: BellRing,
    title: "Ganá un cliente",
    text: "Te notificamos cada vez que un cliente de tu zona necesite tus servicios. Vos manejás tu agenda y decidís qué trabajos aceptar.",
  },
  {
    icon: Zap,
    title: "Analizá tu negocio con IA",
    text: "Recibí reportes inteligentes sobre tu performance, clientes y áreas de mejora para tomar mejores decisiones y hacer crecer tu negocio.",
  },
  {
    icon: Coins,
    title: "Trabajá con respaldo",
    text: "Una vez que el cliente abona la seña, el turno queda confirmado. Trabajá con la tranquilidad de que tu tiempo está asegurado.",
  },
];

type Tab = "client" | "pro";

const HowItWorks = () => {
  const [tab, setTab] = useState<Tab>("client");
  const steps = tab === "client" ? clientSteps : proSteps;
  const accentClass = tab === "client" ? "bg-blue-50 dark:bg-blue-950/30" : "bg-orange-50 dark:bg-orange-950/30";
  const iconBg = tab === "client" ? "bg-blue-100 dark:bg-blue-900/40" : "bg-orange-100 dark:bg-orange-900/40";
  const iconColor = tab === "client" ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400";
  const badgeBg = tab === "client" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" : "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300";

  return (
    <section className="px-4 py-16">
      <div className="mx-auto max-w-4xl">
        <h2
         
         
         
         
          className="mb-2 text-center font-display text-2xl font-bold text-foreground sm:text-3xl"
        >
          ¿Cómo funciona?
        </h2>
        <p
         
         
         
         
          className="mb-8 text-center text-sm text-muted-foreground"
        >
          Tres pasos simples, según lo que necesites
        </p>

        {/* Tab selector */}
        <div className="mx-auto mb-10 flex max-w-md overflow-hidden rounded-2xl border border-border bg-muted/60 p-1.5">
          <button
            onClick={() => setTab("client")}
            className={`flex-1 rounded-xl px-4 py-3 text-center text-sm font-bold transition-all duration-200 ${
              tab === "client"
                ? "bg-blue-100 text-blue-700 shadow-sm dark:bg-blue-900/50 dark:text-blue-300"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Busco una mano
          </button>
          <button
            onClick={() => setTab("pro")}
            className={`flex-1 rounded-xl px-4 py-3 text-center text-sm font-bold transition-all duration-200 ${
              tab === "pro"
                ? "bg-orange-100 text-orange-700 shadow-sm dark:bg-orange-900/50 dark:text-orange-300"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Ofrezco mi oficio
          </button>
        </div>

        {/* Steps */}
        
          <div
            key={tab}
           
           
           
           
            className="grid gap-6 sm:grid-cols-3"
          >
            {steps.map((step, i) => (
              <div
                key={step.title}
               
               
               
                className={`group rounded-3xl border border-border/60 p-6 text-center transition-shadow hover:shadow-lg ${accentClass}`}
              >
                <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-110 ${iconBg}`}>
                  <step.icon className={`h-7 w-7 ${iconColor}`} />
                </div>
                <span className={`mb-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${badgeBg}`}>
                  Paso {i + 1}
                </span>
                <h3 className="mt-2 font-display text-lg font-bold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        
      </div>
    </section>
  );
};

export default HowItWorks;
