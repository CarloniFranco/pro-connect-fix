import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Star, Zap, Shield, Award, ChevronRight, User } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Skeleton } from "@/components/ui/skeleton";

interface ProfessionalWithScore {
  id: string;
  user_id: string;
  full_name: string;
  rubro: string;
  descripcion: string;
  verified: boolean;
  score: {
    total_score: number;
    velocity: number;
    reliability: number;
    excellence: number;
    review_count: number;
  };
}

const ProfessionalsList = () => {
  const navigate = useNavigate();
  const { category } = useParams<{ category: string }>();
  const [professionals, setProfessionals] = useState<ProfessionalWithScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfessionals = async () => {
      setLoading(true);
      const { data: profiles, error } = await supabase
        .from("professional_profiles")
        .select("*")
        .eq("rubro", category || "");

      if (error || !profiles) {
        setLoading(false);
        return;
      }

      const withScores = await Promise.all(
        profiles.map(async (p) => {
          const { data } = await supabase.rpc("get_professional_score", {
            p_professional_id: p.user_id,
          });
          const scoreData = (data as unknown as ProfessionalWithScore["score"]) || { total_score: 3, velocity: 3, reliability: 3, excellence: 3, review_count: 0 };
          return { ...p, score: scoreData } as ProfessionalWithScore;
        })
      );

      withScores.sort((a, b) => b.score.total_score - a.score.total_score);
      setProfessionals(withScores);
      setLoading(false);
    };

    fetchProfessionals();
  }, [category]);

  const renderStars = (score: number) => {
    const full = Math.floor(score);
    const half = score - full >= 0.5;
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < full
                ? "fill-accent text-accent"
                : i === full && half
                ? "fill-accent/50 text-accent"
                : "text-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto max-w-3xl px-4 pt-24 pb-16">
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </motion.button>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-2 font-display text-2xl font-bold text-foreground md:text-3xl"
        >
          Profesionales de {category}
        </motion.h1>
        <p className="mb-8 text-muted-foreground">
          Ordenados por ranking de calidad
        </p>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
        ) : professionals.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center">
            <p className="text-lg font-semibold text-muted-foreground">
              No hay profesionales disponibles en esta categoría aún.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {professionals.map((pro, i) => (
              <motion.div
                key={pro.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/profesional/${pro.user_id}`)}
                className="group cursor-pointer rounded-2xl border-2 border-border bg-card p-5 shadow-sm transition-all hover:shadow-lg hover:border-primary"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-card-foreground">
                        {pro.full_name}
                      </h3>
                      {pro.verified && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                          <Shield className="h-3 w-3" /> Verificado
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      {renderStars(pro.score.total_score)}
                      <span className="text-sm font-semibold text-foreground">
                        {pro.score.total_score}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({pro.score.review_count} reseñas)
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Zap className="h-3 w-3 text-accent" />
                        Velocidad: {pro.score.velocity}/5
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Shield className="h-3 w-3 text-primary" />
                        Confiabilidad: {pro.score.reliability}/5
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Award className="h-3 w-3 text-secondary" />
                        Excelencia: {pro.score.excellence}/5
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors mt-2" />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfessionalsList;
