import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Star, Shield, Sparkles, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
  pros: number;
  finishedJobs: number;
  avgRating: number | null;
  totalReviews: number;
}

const SocialProof = () => {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => {
      const [prosRes, jobsRes, reviewsRes] = await Promise.all([
        supabase
          .from("professional_profiles")
          .select("id", { count: "exact", head: true })
          .eq("available", true)
          .neq("rubro", ""),
        supabase
          .from("service_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "finalizada"),
        supabase.from("reviews").select("rating"),
      ]);

      const ratings = (reviewsRes.data || []).map((r) => r.rating);
      const avg = ratings.length
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : null;

      setStats({
        pros: prosRes.count ?? 0,
        finishedJobs: jobsRes.count ?? 0,
        avgRating: avg,
        totalReviews: ratings.length,
      });
    })();
  }, []);

  if (!stats) return null;

  // Si los números son muy chicos, mostramos lenguaje cualitativo
  const showNumbers = stats.pros >= 20 && stats.finishedJobs >= 50;

  const items = showNumbers
    ? [
        {
          icon: Shield,
          value: `+${stats.pros}`,
          label: "Profesionales verificados",
        },
        {
          icon: CheckCircle2,
          value: `+${stats.finishedJobs}`,
          label: "Servicios completados",
        },
        {
          icon: Star,
          value: stats.avgRating ? stats.avgRating.toFixed(1) : "—",
          label: `Calificación promedio (${stats.totalReviews})`,
        },
        {
          icon: Sparkles,
          value: "100%",
          label: "Pago seguro con seña",
        },
      ]
    : [
        {
          icon: Shield,
          value: "Verificados",
          label: "Matrícula y DNI validados",
        },
        {
          icon: CheckCircle2,
          value: "Sin sorpresas",
          label: "Precio y horario claros antes de reservar",
        },
        {
          icon: Star,
          value: "Meritocracia",
          label: "Los mejores aparecen primero",
        },
        {
          icon: Sparkles,
          value: "Seña segura",
          label: "Tu plata queda protegida hasta el servicio",
        },
      ];

  return (
    <section className="bg-card/40 px-4 py-12 md:py-16">
      <div className="container mx-auto max-w-5xl">
        <h2 className="mb-2 text-center font-display text-2xl font-bold text-foreground md:text-3xl">
          Por qué elegir FIX
        </h2>
        <p className="mb-8 text-center text-sm text-muted-foreground md:text-base">
          Reservá con tranquilidad, la confianza es nuestro estándar.
        </p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
          {items.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="flex flex-col items-center rounded-2xl border border-border bg-card p-4 text-center shadow-sm transition-shadow hover:shadow-md md:p-6"
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary md:h-12 md:w-12">
                <item.icon className="h-5 w-5 md:h-6 md:w-6" />
              </div>
              <div className="font-display text-lg font-bold text-foreground md:text-xl">
                {item.value}
              </div>
              <div className="mt-1 text-xs text-muted-foreground md:text-sm">
                {item.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProof;
