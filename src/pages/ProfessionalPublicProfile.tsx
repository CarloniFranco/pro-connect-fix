import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Star, Zap, Shield, Award, MessageSquare, User } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

interface ScoreData {
  total_score: number;
  velocity: number;
  reliability: number;
  excellence: number;
  review_count: number;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

const ProfessionalPublicProfile = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [score, setScore] = useState<ScoreData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;
      setLoading(true);

      const [profileRes, scoreRes, reviewsRes] = await Promise.all([
        supabase.from("professional_profiles").select("*").eq("user_id", userId).single(),
        supabase.rpc("get_professional_score", { p_professional_id: userId }),
        supabase.from("reviews").select("*").eq("professional_id", userId).order("created_at", { ascending: false }),
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (scoreRes.data) setScore(scoreRes.data as unknown as ScoreData);
      if (reviewsRes.data) setReviews(reviewsRes.data);
      setLoading(false);
    };

    fetchData();
  }, [userId]);

  const renderStars = (value: number) => (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < Math.floor(value) ? "fill-accent text-accent" : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto max-w-2xl px-4 pt-24">
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto max-w-2xl px-4 pt-24 text-center">
          <p className="text-lg text-muted-foreground">Profesional no encontrado.</p>
        </div>
      </div>
    );
  }

  const metrics = [
    { label: "Velocidad de respuesta", value: score?.velocity || 3, icon: Zap, color: "text-accent" },
    { label: "Confiabilidad", value: score?.reliability || 3, icon: Shield, color: "text-primary" },
    { label: "Excelencia", value: score?.excellence || 3, icon: Award, color: "text-secondary" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto max-w-2xl px-4 pt-24 pb-16">
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </motion.button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border-2 border-border bg-card p-6 shadow-md mb-6"
        >
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-border bg-primary/10 flex items-center justify-center flex-shrink-0">
              {profile.photo_url ? (
                <img src={profile.photo_url} alt={profile.full_name} className="h-full w-full object-cover" />
              ) : (
                <User className="h-8 w-8 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-card-foreground">{profile.full_name}</h1>
                {profile.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    <Shield className="h-3 w-3" /> Verificado
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-muted-foreground mb-2">{profile.rubro}</p>
              <div className="flex items-center gap-2">
                {renderStars(score?.total_score || 3)}
                <span className="text-lg font-bold text-foreground">{score?.total_score || "3.0"}</span>
                <span className="text-sm text-muted-foreground">
                  ({score?.review_count || 0} reseñas)
                </span>
              </div>
            </div>
          </div>
          {profile.descripcion && (
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              {profile.descripcion}
            </p>
          )}
        </motion.div>

        {/* Score Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border-2 border-border bg-card p-6 shadow-md mb-6"
        >
          <h2 className="text-lg font-bold text-card-foreground mb-4">Métricas de Ranking</h2>
          <div className="space-y-4">
            {metrics.map((m) => (
              <div key={m.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-card-foreground">
                    <m.icon className={`h-4 w-4 ${m.color}`} />
                    {m.label}
                  </span>
                  <span className="text-sm font-bold text-foreground">{m.value}/5</span>
                </div>
                <Progress value={(m.value / 5) * 100} className="h-2" />
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Puntaje compuesto: cada métrica pondera un 33% del total.
          </p>
        </motion.div>

        {/* Reviews */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border-2 border-border bg-card p-6 shadow-md"
        >
          <h2 className="text-lg font-bold text-card-foreground mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Reseñas ({reviews.length})
          </h2>
          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Este profesional aún no tiene reseñas.
            </p>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    {renderStars(review.rating)}
                    <span className="text-xs text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString("es-AR")}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-card-foreground">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ProfessionalPublicProfile;
