import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Heart, MapPin, Star, Shield, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { FavoriteButton } from "@/components/FavoriteButton";

interface FavoritePro {
  id: string;
  user_id: string;
  full_name: string;
  rubro: string;
  photo_url: string | null;
  verified: boolean;
  neighborhood: string;
  locality: string;
  province: string;
  score: number;
  reviews: number;
}

const ClientFavorites = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [pros, setPros] = useState<FavoritePro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login");
      return;
    }

    (async () => {
      setLoading(true);
      const { data: favs } = await supabase
        .from("favorites")
        .select("professional_id, created_at")
        .eq("client_user_id", user.id)
        .order("created_at", { ascending: false });

      const ids = (favs || []).map((f) => f.professional_id);
      if (ids.length === 0) {
        setPros([]);
        setLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from("professional_profiles")
        .select(
          "id, user_id, full_name, rubro, photo_url, verified, neighborhood, locality, province"
        )
        .in("user_id", ids);

      const withScores = await Promise.all(
        (profiles || []).map(async (p) => {
          const { data } = await supabase.rpc("get_professional_score", {
            p_professional_id: p.user_id,
          });
          const s = (data as { total_score?: number; review_count?: number } | null) ?? {};
          return {
            ...p,
            score: s.total_score ?? 3,
            reviews: s.review_count ?? 0,
          } as FavoritePro;
        })
      );

      // Preservar orden de favoritos (más recientes primero)
      const byId = new Map(withScores.map((p) => [p.user_id, p]));
      const ordered = ids.map((id) => byId.get(id)).filter(Boolean) as FavoritePro[];
      setPros(ordered);
      setLoading(false);
    })();
  }, [user, authLoading, navigate]);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-5xl px-3 py-6 md:px-6 md:py-8">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Volver
          </button>

          <div className="mb-6 flex items-center gap-3">
            <Heart className="h-6 w-6 fill-destructive text-destructive" />
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">
              Mis favoritos
            </h1>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
              ))}
            </div>
          ) : pros.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-border bg-card p-10 text-center">
              <Heart className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
              <h2 className="mb-2 text-lg font-bold text-foreground">
                Todavía no guardaste favoritos
              </h2>
              <p className="mb-5 text-sm text-muted-foreground">
                Tocá el corazón en cualquier profesional para tenerlo a mano la próxima vez.
              </p>
              <Button onClick={() => navigate("/")}>Explorar profesionales</Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
              {pros.map((pro, i) => {
                const locationLabel =
                  [pro.locality, pro.province].filter(Boolean).join(", ") || pro.neighborhood;
                return (
                  <motion.div
                    key={pro.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.4) }}
                    onClick={() => navigate(`/profesional/${pro.user_id}`)}
                    className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-lg"
                  >
                    <div className="relative aspect-square w-full overflow-hidden bg-primary/10">
                      {pro.photo_url ? (
                        <img
                          src={pro.photo_url}
                          alt={pro.full_name}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <User className="h-16 w-16 text-primary/60" />
                        </div>
                      )}
                      <div className="absolute right-2 top-2 flex items-center gap-1.5">
                        <div className="inline-flex items-center gap-1 rounded-full bg-card/95 px-2 py-1 text-xs font-bold text-foreground shadow-md">
                          <Star className="h-3 w-3 fill-accent text-accent" />
                          {pro.score}
                          <span className="text-[10px] font-medium text-muted-foreground">
                            ({pro.reviews})
                          </span>
                        </div>
                        <FavoriteButton professionalId={pro.user_id} size="sm" />
                      </div>
                      {pro.verified && (
                        <div
                          className="absolute left-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md"
                          title="Verificado"
                        >
                          <Shield className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-1 p-3 md:p-4">
                      <h3 className="line-clamp-1 text-sm font-bold text-card-foreground md:text-base">
                        {pro.full_name}
                      </h3>
                      <p className="line-clamp-1 text-xs font-semibold text-secondary">
                        {pro.rubro}
                      </p>
                      {locationLabel && (
                        <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 flex-shrink-0 text-secondary" />
                          <span className="line-clamp-1">{locationLabel}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ClientFavorites;
