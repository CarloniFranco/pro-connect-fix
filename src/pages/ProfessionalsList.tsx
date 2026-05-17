import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Star,
  Shield,
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
  const [pendingLocation, setPendingLocation] = useState<string>("all"); // "Provincia|Localidad"
  const [pendingDate, setPendingDate] = useState<Date | undefined>(undefined);
  const [pendingTime, setPendingTime] = useState<string>("all"); // "HH:00"
  // Filtros aplicados (sólo cambian al tocar "Buscar")
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [timeFilter, setTimeFilter] = useState<string>("all");
  const [availableUserIds, setAvailableUserIds] = useState<Set<string> | null>(null);
  const [freeSlotsByPro, setFreeSlotsByPro] = useState<Map<string, string[]>>(new Map());
  const [view, setView] = useState<"list" | "map">("list");

  // Fecha efectiva para calcular chips de horarios: la del filtro, o hoy
  const effectiveDate = useMemo(() => {
    if (dateFilter) return dateFilter;
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, [dateFilter]);

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

  // Computar slots libres por pro para la fecha efectiva (filtro o hoy)
  useEffect(() => {
    if (professionals.length === 0) {
      setAvailableUserIds(null);
      setFreeSlotsByPro(new Map());
      return;
    }

    const compute = async () => {
      const dayOfWeek = effectiveDate.getDay();
      const dateStr = format(effectiveDate, "yyyy-MM-dd");
      const userIds = professionals.map((p) => p.user_id);
      const isToday =
        effectiveDate.toDateString() === new Date().toDateString();
      const currentHour = new Date().getHours();

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

      const slotsMap = new Map<string, string[]>();
      worksToday.forEach((window, proId) => {
        const startH = parseInt(window.start.slice(0, 2), 10);
        const endH = parseInt(window.end.slice(0, 2), 10);
        const blocks = blockedByPro.get(proId) || new Set();
        const free: string[] = [];
        for (let h = startH; h < endH; h++) {
          if (isToday && h <= currentHour) continue;
          const slot = `${String(h).padStart(2, "0")}:00`;
          if (!blocks.has(slot)) free.push(slot);
        }
        if (free.length > 0) slotsMap.set(proId, free);
      });

      setFreeSlotsByPro(slotsMap);

      if (!dateFilter) {
        setAvailableUserIds(null);
        return;
      }
      const result = new Set<string>();
      slotsMap.forEach((slots, proId) => {
        if (timeFilter !== "all") {
          if (slots.includes(timeFilter)) result.add(proId);
        } else {
          result.add(proId);
        }
      });
      setAvailableUserIds(result);
    };

    compute();
  }, [effectiveDate, dateFilter, timeFilter, professionals]);

  // Opciones de ubicación combinadas (Provincia, Localidad) derivadas de los pros existentes.
  // Mendoza primero, después orden alfabético.
  const locationOptions = useMemo(() => {
    const set = new Set<string>();
    professionals.forEach((p) => {
      const prov = (p.province || "").trim();
      const loc = (p.locality || "").trim();
      if (prov && loc) set.add(`${prov}|${loc}`);
    });
    return Array.from(set).sort((a, b) => {
      const [pa] = a.split("|");
      const [pb] = b.split("|");
      if (pa === "Mendoza" && pb !== "Mendoza") return -1;
      if (pb === "Mendoza" && pa !== "Mendoza") return 1;
      return a.localeCompare(b);
    });
  }, [professionals]);

  // Horas disponibles según día seleccionado (rango amplio 07-21).
  const timeOptions = useMemo(() => {
    const arr: string[] = [];
    for (let h = 7; h <= 21; h++) arr.push(`${String(h).padStart(2, "0")}:00`);
    return arr;
  }, []);

  const filtered = useMemo(() => {
    const base = professionals.filter((p) => {
      if (locationFilter !== "all") {
        const key = `${(p.province || "").trim()}|${(p.locality || "").trim()}`;
        if (key !== locationFilter) return false;
      }
      return true;
    });
    // Si hay filtro de fecha/hora: no excluir, sólo mover los no disponibles al final
    if (availableUserIds) {
      return [...base].sort((a, b) => {
        const aAv = availableUserIds.has(a.user_id) ? 0 : 1;
        const bAv = availableUserIds.has(b.user_id) ? 0 : 1;
        if (aAv !== bAv) return aAv - bAv;
        return b.score.total_score - a.score.total_score;
      });
    }
    return base;
  }, [professionals, locationFilter, availableUserIds]);

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

  const applyFilters = () => {
    setLocationFilter(pendingLocation);
    setDateFilter(pendingDate);
    setTimeFilter(pendingDate ? pendingTime : "all");
  };

  const clearFilters = () => {
    setPendingLocation("all");
    setPendingDate(undefined);
    setPendingTime("all");
    setLocationFilter("all");
    setDateFilter(undefined);
    setTimeFilter("all");
  };

  const hasActiveFilters =
    locationFilter !== "all" || !!dateFilter || timeFilter !== "all";
  const hasPendingChanges =
    pendingLocation !== locationFilter ||
    (pendingDate?.getTime() || 0) !== (dateFilter?.getTime() || 0) ||
    (pendingDate ? pendingTime : "all") !== timeFilter;

  const goToPro = (userId: string) => {
    const params = new URLSearchParams();
    if (dateFilter) params.set("date", format(dateFilter, "yyyy-MM-dd"));
    if (timeFilter !== "all") params.set("time", timeFilter);
    const qs = params.toString();
    navigate(`/profesional/${userId}${qs ? `?${qs}` : ""}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto max-w-7xl px-4 pt-24 pb-16">
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
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {/* Ubicación (Provincia, Localidad) */}
            <Select value={pendingLocation} onValueChange={setPendingLocation}>
              <SelectTrigger>
                <div className="flex items-center gap-2 truncate">
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <SelectValue placeholder="Ubicación" />
                </div>
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">Todas las ubicaciones</SelectItem>
                {locationOptions.map((opt) => {
                  const [prov, loc] = opt.split("|");
                  return (
                    <SelectItem key={opt} value={opt}>
                      {prov}, {loc}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Fecha + Hora */}
            <div className="grid grid-cols-2 gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start font-normal",
                      !pendingDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">
                      {pendingDate ? format(pendingDate, "d MMM", { locale: es }) : "Día"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={pendingDate}
                    onSelect={(d) => {
                      setPendingDate(d);
                      if (!d) setPendingTime("all");
                    }}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    locale={es}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>

              <Select
                value={pendingTime}
                onValueChange={setPendingTime}
                disabled={!pendingDate}
              >
                <SelectTrigger>
                  <div className="flex items-center gap-2 truncate">
                    <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <SelectValue placeholder={pendingDate ? "Hora" : "Elegí día"} />
                  </div>
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="all">Cualquier hora</SelectItem>
                  {timeOptions.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t} hs
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-5">
            {filtered.map((pro, i) => {
              const isUnavailable =
                !!availableUserIds && !availableUserIds.has(pro.user_id);
              const slots = freeSlotsByPro.get(pro.user_id) || [];
              // Si hay hora elegida, ponerla primero
              const orderedSlots =
                timeFilter !== "all" && slots.includes(timeFilter)
                  ? [timeFilter, ...slots.filter((s) => s !== timeFilter)]
                  : slots;
              const visibleSlots = orderedSlots.slice(0, 4);
              const locationLabel =
                [pro.locality, pro.province].filter(Boolean).join(", ") ||
                pro.neighborhood;

              const handleSlotClick = (e: React.MouseEvent, slot: string) => {
                e.stopPropagation();
                const params = new URLSearchParams();
                params.set("date", format(effectiveDate, "yyyy-MM-dd"));
                params.set("time", slot);
                navigate(`/profesional/${pro.user_id}?${params.toString()}`);
              };

              return (
                <motion.div
                  key={pro.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.4) }}
                  onClick={() => goToPro(pro.user_id)}
                  className={`group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-lg ${
                    isUnavailable ? "opacity-70" : ""
                  }`}
                >
                  {/* Foto destacada */}
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
                    {/* Score badge + favorito esquina superior derecha */}
                    <div className="absolute right-2 top-2 flex items-center gap-1.5">
                      <div className="inline-flex items-center gap-1 rounded-full bg-card/95 px-2 py-1 text-xs font-bold text-foreground shadow-md">
                        <Star className="h-3 w-3 fill-accent text-accent" />
                        {pro.score.total_score}
                        <span className="text-[10px] font-medium text-muted-foreground">
                          ({pro.score.review_count})
                        </span>
                      </div>
                      <FavoriteButton professionalId={pro.user_id} size="sm" />
                    </div>
                    {/* Verificado esquina superior izquierda */}
                    {pro.verified && (
                      <div
                        className="absolute left-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md"
                        title="Verificado"
                      >
                        <Shield className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>

                  {/* Contenido */}
                  <div className="flex flex-1 flex-col gap-2 p-3 md:p-4">
                    <h3 className="line-clamp-1 text-sm font-bold text-card-foreground md:text-base">
                      {pro.full_name}
                    </h3>
                    {locationLabel && (
                      <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 flex-shrink-0 text-secondary" />
                        <span className="line-clamp-1">{locationLabel}</span>
                      </div>
                    )}

                    {/* Chips de horarios */}
                    {visibleSlots.length > 0 ? (
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {!dateFilter && (
                          <span className="w-full text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Hoy disponible
                          </span>
                        )}
                        {visibleSlots.map((slot) => (
                          <button
                            key={slot}
                            onClick={(e) => handleSlotClick(e, slot)}
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold transition-colors ${
                              timeFilter === slot
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-primary/30 bg-primary/5 text-primary hover:bg-primary hover:text-primary-foreground"
                            }`}
                          >
                            <Clock className="h-3 w-3" />
                            {slot}
                          </button>
                        ))}
                      </div>
                    ) : isUnavailable ? (
                      <div className="mt-1 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-[11px] font-semibold text-destructive">
                        No disponible
                      </div>
                    ) : (
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        Sin horarios libres {dateFilter ? "ese día" : "hoy"}
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
  );
};

export default ProfessionalsList;
