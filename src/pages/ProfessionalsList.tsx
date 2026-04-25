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
import { PROVINCES, getLocalities } from "@/lib/argentinaLocations";

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

      if (worksToday.size === 0) {
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

  // Todas las localidades del catálogo según provincia (sin filtrar "Otra" para que el pro
  // que la cargó libre también matchee si el cliente la elige).
  const localities = useMemo(() => {
    if (provinceFilter === "all") return [];
    return getLocalities(provinceFilter).filter((l) => l !== "Otra");
  }, [provinceFilter]);

  const filtered = useMemo(() => {
    const provNorm = provinceFilter.trim().toLowerCase();
    const locNorm = localityFilter.trim().toLowerCase();
    return professionals.filter((p) => {
      if (provinceFilter !== "all" && (p.province || "").trim().toLowerCase() !== provNorm)
        return false;
      if (localityFilter !== "all" && (p.locality || "").trim().toLowerCase() !== locNorm)
        return false;
      if (availableUserIds && !availableUserIds.has(p.user_id)) return false;
      return true;
    });
  }, [professionals, provinceFilter, localityFilter, availableUserIds]);

  const mapPros: MapPro[] = useMemo(
    () =>
      filtered
        .filter((p) => p.coords)
        .map((p) => ({
          user_id: p.user_id,
          full_name: p.full_name,
          neighborhood: p.locality || p.neighborhood,
          photo_url: p.photo_url,
          score: p.score.total_score,
          lat: p.coords!.lat,
          lng: p.coords!.lng,
        })),
    [filtered],
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

  const clearFilters = () => {
    setProvinceFilter("all");
    setLocalityFilter("all");
    setDateFilter(undefined);
  };

  const hasActiveFilters =
    provinceFilter !== "all" || localityFilter !== "all" || !!dateFilter;

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
              value={provinceFilter}
              onValueChange={(v) => {
                setProvinceFilter(v);
                setLocalityFilter("all");
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
              value={localityFilter}
              onValueChange={setLocalityFilter}
              disabled={provinceFilter === "all" || localities.length === 0}
            >
              <SelectTrigger>
                <div className="flex items-center gap-2 truncate">
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <SelectValue
                    placeholder={
                      provinceFilter === "all" ? "Elegí provincia" : "Localidad"
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
                    !dateFilter && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFilter ? format(dateFilter, "d 'de' MMMM", { locale: es }) : "Día"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFilter}
                  onSelect={setDateFilter}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  locale={es}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

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
