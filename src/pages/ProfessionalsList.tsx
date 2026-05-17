import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Star,
  Zap,
  Shield,
  Award,
  ChevronRight,
  User,
  MapPin,
  List,
  Map as MapIcon,
  CalendarIcon,
  X,
  Search,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ProfessionalsMap, { MapPro } from "@/components/ProfessionalsMap";
import { parseGoogleMapsCoords } from "@/lib/parseGoogleMaps";
import { cn } from "@/lib/utils";
import { getLocalityCoords } from "@/lib/localityCoords";
import { Clock } from "lucide-react";

interface ProfessionalWithScore {
  id: string;
  user_id: string;
  full_name: string;
  rubro: string;
  descripcion: string;
  verified: boolean;
  photo_url: string | null;
  province: string;
  locality: string;
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
  // Filtros pendientes (lo que el usuario va eligiendo)
  const [pendingProvince, setPendingProvince] = useState<string>("all");
  const [pendingLocality, setPendingLocality] = useState<string>("all");
  const [pendingDate, setPendingDate] = useState<Date | undefined>(undefined);
  // Filtros aplicados (sólo cambian al tocar "Buscar")
  const [provinceFilter, setProvinceFilter] = useState<string>("all");
  const [localityFilter, setLocalityFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [availableUserIds, setAvailableUserIds] = useState<Set<string> | null>(null);
  const [view, setView] = useState<"list" | "map">("list");

  useEffect(() => {
    const fetchProfessionals = async () => {
      setLoading(true);
      const { data: profiles, error } = await supabase
        .from("professional_profiles")
        .select(
          "id, user_id, full_name, rubro, descripcion, photo_url, verified, province, locality, neighborhood, google_maps_url, lat, lng",
        )
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
          const scoreData =
            (data as unknown as ProfessionalWithScore["score"]) || {
              total_score: 3,
              velocity: 3,
              reliability: 3,
              excellence: 3,
              review_count: 0,
            };
          const dbCoords =
            p.lat != null && p.lng != null
              ? { lat: Number(p.lat), lng: Number(p.lng) }
              : null;
          return {
            ...p,
            score: scoreData,
            coords: dbCoords ?? parseGoogleMapsCoords(p.google_maps_url || ""),
          } as ProfessionalWithScore;
        }),
      );

      withScores.sort((a, b) => b.score.total_score - a.score.total_score);
      setProfessionals(withScores);
      setLoading(false);
    };

    fetchProfessionals();
  }, [category]);

  // Computar pros disponibles cuando hay filtro de fecha
  useEffect(() => {
    if (!dateFilter || professionals.length === 0) {
      setAvailableUserIds(null);
      return;
    }

    const compute = async () => {
      const dayOfWeek = dateFilter.getDay(); // 0 dom .. 6 sáb
      const dateStr = format(dateFilter, "yyyy-MM-dd");
      const userIds = professionals.map((p) => p.user_id);

      // 1) Quién trabaja ese día (horario activo)
      const { data: avail } = await supabase
        .from("professional_availability")
        .select("professional_id, start_time, end_time")
        .in("professional_id", userIds)
        .eq("day_of_week", dayOfWeek)
        .eq("is_active", true);

      const worksToday = new Map<string, { start: string; end: string }>();
      (avail || []).forEach((a: any) => {
        worksToday.set(a.professional_id, { start: a.start_time, end: a.end_time });
      });

      console.log("[Availability]", {
        dateStr,
        dayOfWeek,
        totalPros: userIds.length,
        prosWorkingToday: worksToday.size,
      });

      if (worksToday.size === 0) {
        // Nadie trabaja ese día: todos quedan marcados como "no disponibles"
        // (Set vacío != null), pero NO se excluyen del listado.
        setAvailableUserIds(new Set());
        return;
      }

      // 2) Slots ya bloqueados ese día (confirmed o pending no expirado)
      const { data: blocked } = await supabase
        .from("blocked_slots")
        .select("professional_id, slot_time, slot_status, expires_at")
        .in("professional_id", Array.from(worksToday.keys()))
        .eq("slot_date", dateStr);

      const now = Date.now();
      const blockedByPro = new Map<string, Set<string>>();
      (blocked || []).forEach((b: any) => {
        const isPendingExpired =
          b.slot_status === "pending" &&
          b.expires_at &&
          new Date(b.expires_at).getTime() < now;
        if (isPendingExpired) return;
        if (!blockedByPro.has(b.professional_id)) {
          blockedByPro.set(b.professional_id, new Set());
        }
        blockedByPro.get(b.professional_id)!.add(b.slot_time.slice(0, 5));
      });

      // 3) Para cada pro, generar slots de 1hr entre start/end y verificar si queda alguno libre
      const result = new Set<string>();
      worksToday.forEach((window, proId) => {
        const startH = parseInt(window.start.slice(0, 2), 10);
        const endH = parseInt(window.end.slice(0, 2), 10);
        const blocks = blockedByPro.get(proId) || new Set();
        for (let h = startH; h < endH; h++) {
          const slot = `${String(h).padStart(2, "0")}:00`;
          if (!blocks.has(slot)) {
            result.add(proId);
            break;
          }
        }
      });

      console.log("[Availability] result:", {
        availableCount: result.size,
        availableIds: Array.from(result),
      });
      setAvailableUserIds(result);
    };

    compute();
  }, [dateFilter, professionals]);

  // Provincias del catálogo. Mendoza primero (mercado principal).
  const provinces = useMemo(() => {
    return [...PROVINCES].sort((a, b) => {
      if (a === "Mendoza") return -1;
      if (b === "Mendoza") return 1;
      return a.localeCompare(b);
    });
  }, []);

  // Todas las localidades del catálogo según provincia pendiente.
  const localities = useMemo(() => {
    if (pendingProvince === "all") return [];
    return getLocalities(pendingProvince).filter((l) => l !== "Otra");
  }, [pendingProvince]);

  const filtered = useMemo(() => {
    const provNorm = provinceFilter.trim().toLowerCase();
    const locNorm = localityFilter.trim().toLowerCase();
    const base = professionals.filter((p) => {
      if (provinceFilter !== "all" && (p.province || "").trim().toLowerCase() !== provNorm)
        return false;
      if (localityFilter !== "all" && (p.locality || "").trim().toLowerCase() !== locNorm)
        return false;
      return true;
    });
    // Si hay filtro de fecha: no excluir, sólo mover los no disponibles al final
    if (availableUserIds) {
      return [...base].sort((a, b) => {
        const aAv = availableUserIds.has(a.user_id) ? 0 : 1;
        const bAv = availableUserIds.has(b.user_id) ? 0 : 1;
        if (aAv !== bAv) return aAv - bAv;
        return b.score.total_score - a.score.total_score;
      });
    }
    return base;
  }, [professionals, provinceFilter, localityFilter, availableUserIds]);

  const mapPros: MapPro[] = useMemo(() => {
    // 1) Resolver coords: reales del pro o centroide de su localidad/provincia
    const resolved = filtered
      .map((p) => {
        const coords =
          p.coords ?? getLocalityCoords(p.province || "", p.locality || "");
        if (!coords) return null;
        return {
          user_id: p.user_id,
          full_name: p.full_name,
          neighborhood: p.locality || p.neighborhood,
          photo_url: p.photo_url,
          score: p.score.total_score,
          baseLat: Array.isArray(coords) ? coords[0] : coords.lat,
          baseLng: Array.isArray(coords) ? coords[1] : coords.lng,
          hasRealCoords: !!p.coords,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    // 2) Agrupar por punto base (mismo centroide) y dispersar en círculo
    //    para que múltiples pros en la misma localidad no se superpongan.
    const groups = new Map<string, typeof resolved>();
    resolved.forEach((r) => {
      // Si tiene coords reales, no agrupar (usar tal cual)
      if (r.hasRealCoords) {
        groups.set(`${r.user_id}-real`, [r]);
        return;
      }
      const key = `${r.baseLat.toFixed(4)},${r.baseLng.toFixed(4)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    });

    const result: MapPro[] = [];
    groups.forEach((group) => {
      if (group.length === 1) {
        const r = group[0];
        result.push({
          user_id: r.user_id,
          full_name: r.full_name,
          neighborhood: r.neighborhood,
          photo_url: r.photo_url,
          score: r.score,
          lat: r.baseLat,
          lng: r.baseLng,
        });
        return;
      }
      // Dispersar en círculo (~150-300m) alrededor del centroide
      const radius = 0.0025; // ≈ 250m
      group.forEach((r, i) => {
        const angle = (2 * Math.PI * i) / group.length;
        result.push({
          user_id: r.user_id,
          full_name: r.full_name,
          neighborhood: r.neighborhood,
          photo_url: r.photo_url,
          score: r.score,
          lat: r.baseLat + radius * Math.cos(angle),
          lng: r.baseLng + radius * Math.sin(angle),
        });
      });
    });

    return result;
  }, [filtered]);

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

  const applyFilters = () => {
    setProvinceFilter(pendingProvince);
    setLocalityFilter(pendingLocality);
    setDateFilter(pendingDate);
  };

  const clearFilters = () => {
    setPendingProvince("all");
    setPendingLocality("all");
    setPendingDate(undefined);
    setProvinceFilter("all");
    setLocalityFilter("all");
    setDateFilter(undefined);
  };

  const hasActiveFilters =
    provinceFilter !== "all" || localityFilter !== "all" || !!dateFilter;
  const hasPendingChanges =
    pendingProvince !== provinceFilter ||
    pendingLocality !== localityFilter ||
    (pendingDate?.getTime() || 0) !== (dateFilter?.getTime() || 0);

  const goToPro = (userId: string) => {
    const params = new URLSearchParams();
    if (dateFilter) params.set("date", format(dateFilter, "yyyy-MM-dd"));
    const qs = params.toString();
    navigate(`/profesional/${userId}${qs ? `?${qs}` : ""}`);
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
        <p className="mb-6 text-muted-foreground">Ordenados por ranking de calidad</p>

        {/* Toolbar: filtros + toggle vista */}
        <div className="mb-6 space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {/* Provincia */}
            <Select
              value={pendingProvince}
              onValueChange={(v) => {
                setPendingProvince(v);
                setPendingLocality("all");
              }}
            >
              <SelectTrigger>
                <div className="flex items-center gap-2 truncate">
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <SelectValue placeholder="Provincia" />
                </div>
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">Todas las provincias</SelectItem>
                {provinces.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Localidad */}
            <Select
              value={pendingLocality}
              onValueChange={setPendingLocality}
              disabled={pendingProvince === "all" || localities.length === 0}
            >
              <SelectTrigger>
                <div className="flex items-center gap-2 truncate">
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <SelectValue
                    placeholder={
                      pendingProvince === "all" ? "Elegí provincia" : "Localidad"
                    }
                  />
                </div>
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">Todas las localidades</SelectItem>
                {localities.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Fecha */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start font-normal",
                    !pendingDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {pendingDate ? format(pendingDate, "d 'de' MMMM", { locale: es }) : "Día"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={pendingDate}
                  onSelect={setPendingDate}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  locale={es}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Botón Buscar */}
          <Button
            onClick={applyFilters}
            disabled={!hasPendingChanges}
            className="w-full gap-2"
            size="lg"
          >
            <Search className="h-4 w-4" />
            Buscar profesionales
          </Button>

          <div className="flex flex-wrap items-center gap-2 justify-between">
            {hasActiveFilters ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground gap-1 h-8"
              >
                <X className="h-3.5 w-3.5" /> Limpiar filtros
              </Button>
            ) : (
              <span />
            )}

            <div className="inline-flex rounded-lg border border-border bg-card p-1">
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
              {hasActiveFilters
                ? "No hay profesionales que cumplan los filtros"
                : "Próximamente más profesionales en esta zona"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {hasActiveFilters
                ? "Probá quitar algún filtro o elegir otro día."
                : `Estamos creciendo 🚀 Pronto habrá profesionales de ${category} disponibles.`}
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
                    {filtered.length - mapPros.length} profesional(es) sin ubicación visible
                    en el mapa
                  </p>
                )}
              </>
            )}
          </>
        ) : (
          <div className="space-y-4">
            {filtered.map((pro, i) => {
              const isUnavailable =
                !!availableUserIds && !availableUserIds.has(pro.user_id);
              return (
              <motion.div
                key={pro.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => goToPro(pro.user_id)}
                className={`group cursor-pointer rounded-2xl border-2 border-border bg-card p-5 shadow-sm transition-all hover:shadow-lg hover:border-primary ${
                  isUnavailable ? "opacity-70" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex gap-4 flex-1">
                    <div className="h-12 w-12 overflow-hidden rounded-full border-2 border-border bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {pro.photo_url ? (
                        <img
                          src={pro.photo_url}
                          alt={pro.full_name}
                          className="h-full w-full object-cover"
                        />
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
                      {(pro.locality || pro.neighborhood) && (
                        <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-bold text-secondary">
                          <MapPin className="h-3 w-3" />
                          {[pro.locality, pro.province].filter(Boolean).join(", ") ||
                            pro.neighborhood}
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
                          Tiempo de respuesta: {pro.score.velocity}/5
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Shield className="h-3 w-3 text-primary" />
                          Puntualidad y Compromiso: {pro.score.reliability}/5
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Award className="h-3 w-3 text-secondary" />
                          Satisfacción del cliente: {pro.score.excellence}/5
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors mt-2" />
                </div>
                {isUnavailable && (
                  <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
                    No disponible en la fecha seleccionada
                  </div>
                )}
              </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfessionalsList;
