import { CalendarCheck, Cpu, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  {
    icon: CalendarCheck,
    title: "Solicitá y Agendá",
    text: "Elegí al profesional, seleccioná el día y horario que te convenga y contanos tu problema.",
  },
  {
    icon: Cpu,
    title: "Presupuesto por IA",
    text: "Recibí un presupuesto técnico detallado en minutos, generado con asistencia de Inteligencia Artificial.",
  },
  {
    icon: ShieldCheck,
    title: "Seña y Confirmación",
    text: "Aceptá el presupuesto pagando una seña del 10% por Mercado Pago para congelar tu turno. ¡Listo!",
  },
];

const HowItWorks = () => {
  return (
    <section className="px-4 py-16">
      <div className="mx-auto max-w-4xl">
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="mb-2 text-center font-display text-2xl font-bold text-foreground sm:text-3xl"
        >
          ¿Cómo funciona?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-10 text-center text-sm text-muted-foreground"
        >
          Tres pasos simples para solucionar tu problema
        </motion.p>

        <div className="grid gap-6 sm:grid-cols-3">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.15 * i }}
              className="group rounded-2xl border border-border bg-muted/40 p-6 text-center transition-shadow hover:shadow-lg"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 transition-transform duration-200 group-hover:scale-110">
                <step.icon className="h-7 w-7 text-primary" />
              </div>
              <span className="mb-1 inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                Paso {i + 1}
              </span>
              <h3 className="mt-2 font-display text-lg font-bold text-foreground">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.text}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
