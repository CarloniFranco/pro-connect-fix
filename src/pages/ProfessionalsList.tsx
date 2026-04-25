import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Star, Zap, Shield, Award, ChevronRight, User, MapPin, List, Map as MapIcon } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import ProfessionalsMap, { MapPro } from "@/components/ProfessionalsMap";
import { parseGoogleMapsCoords } from "@/lib/parseGoogleMaps";

interface ProfessionalWithScore {
  id: string;
  user_id: string;
  full_name: string;
  rubro: string;
  descripcion: string;
  verified: boolean;
  photo_url: string | null;
  neighborhood: string;
  google_maps_url: string;
  coords: { lat: number; lng: number } | null;
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
  const [neighborhoodFilter, setNeighborhoodFilter] = useState<string>("all");
  const [view, setView] = useState<"list" | "map">("list");

  useEffect(() => {
    const fetchProfessionals = async () => {
      setLoading(true);
      const { data: profiles, error } = await supabase
        .from("professional_profiles")
        .select("id, user_id, full_name, rubro, descripcion, photo_url, verified, neighborhood, google_maps_url")
        .eq("rubro", category || "")
        .eq("available", true)
        .not("rubro", "eq", "");

      if (error || !profiles) {
        setLoading(false);
        return;
      }

      const withScores = await Promise.all(
        profiles.map(async (p: any) => {
          const { data } = await supabase.rpc("get_professional_score", {
            p_professional_id: p.user_id,
          });
          const scoreData = (data as unknown as ProfessionalWithScore["score"]) || { total_score: 3, velocity: 3, reliability: 3, excellence: 3, review_count: 0 };
          return {
            ...p,
            score: scoreData,
            coords: parseGoogleMapsCoords(p.google_maps_url || ""),
          } as ProfessionalWithScore;
        })
      );

      withScores.sort((a, b) => b.score.total_score - a.score.total_score);
      setProfessionals(withScores);
      setLoading(false);
    };

    fetchProfessionals();
  }, [category]);

  const neighborhoods = useMemo(() => {
    const set = new Set<string>();
    professionals.forEach((p) => {
      if (p.neighborhood?.trim()) set.add(p.neighborhood.trim());
    });
    return Array.from(set).sort();
  }, [professionals]);

  const filtered = useMemo(() => {
    if (neighborhoodFilter === "all") return professionals;
    return professionals.filter((p) => p.neighborhood?.trim() === neighborhoodFilter);
  }, [professionals, neighborhoodFilter]);

  const mapPros: MapPro[] = useMemo(
    () =>
      filtered
        .filter((p) => p.coords)
        .map((p) => ({
          user_id: p.user_id,
          full_name: p.full_name,
          neighborhood: p.neighborhood,
          photo_url: p.photo_url,
          score: p.score.total_score,
          lat: p.coords!.lat,
          lng: p.coords!.lng,
        })),
    [filtered]
  );

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
        <p className="mb-6 text-muted-foreground">
          Ordenados por ranking de calidad
        </p>

        {/* Toolbar: filtro + toggle vista */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Select value={neighborhoodFilter} onValueChange={setNeighborhoodFilter}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Filtrar por zona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las zonas</SelectItem>
                {neighborhoods.map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="inline-flex rounded-lg border border-border bg-card p-1 self-start">
            <Button
              type="button"
              size="sm"
              variant={view === "list" ? "default" : "ghost"}
              onClick={() => setView("list")}
              className="gap-1.5 h-8"
            >
              <List className="h-4 w-4" /> Lista
            </Button>
            <Button
              type="button"
              size="sm"
              variant={view === "map" ? "default" : "ghost"}
              onClick={() => setView("map")}
              className="gap-1.5 h-8"
            >
              <MapIcon className="h-4 w-4" /> Mapa
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center">
            <p className="text-lg font-semibold text-muted-foreground">
              {neighborhoodFilter === "all"
                ? "Próximamente más profesionales en esta zona"
                : `No hay profesionales en ${neighborhoodFilter} todavía`}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {neighborhoodFilter === "all"
                ? `Estamos creciendo 🚀 Pronto habrá profesionales de ${category} disponibles.`
                : "Probá con otra zona o quitá el filtro."}
            </p>
          </div>
        ) : view === "map" ? (
          <>
            {mapPros.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center">
                <MapIcon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-base font-semibold text-foreground">
                  Ningún profesional tiene ubicación cargada
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Volvé a la vista lista para verlos.
                </p>
              </div>
            ) : (
              <>
                <ProfessionalsMap pros={mapPros} />
                {mapPros.length < filtered.length && (
                  <p className="mt-3 text-xs text-muted-foreground text-center">
                    {filtered.length - mapPros.length} profesional(es) sin ubicación visible en el mapa
                  </p>
                )}
              </>
            )}
          </>
        ) : (
          <div className="space-y-4">
            {filtered.map((pro, i) => (
              <motion.div
                key={pro.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/profesional/${pro.user_id}`)}
                className="group cursor-pointer rounded-2xl border-2 border-border bg-card p-5 shadow-sm transition-all hover:shadow-lg hover:border-primary"
              >
                <div className="flex items-start justify-between">
                  <div className="flex gap-4 flex-1">
                    <div className="h-12 w-12 overflow-hidden rounded-full border-2 border-border bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {pro.photo_url ? (
                        <img src={pro.photo_url} alt={pro.full_name} className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h3 className="text-lg font-bold text-card-foreground">
                        {pro.full_name}
                      </h3>
                      {pro.verified && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                          <Shield className="h-3 w-3" /> Verificado
                        </span>
                      )}
                    </div>
                    {pro.neighborhood && (
                      <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-bold text-secondary">
                        <MapPin className="h-3 w-3" />
                        {pro.neighborhood}
                      </div>
                    )}

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
