import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Star, Zap, Shield, Award, MessageSquare, User, MapPin, Clock, CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { format, addDays, isSameDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import ServiceRequestForm from "@/components/ServiceRequestForm";

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

interface AvailabilitySlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface BlockedSlot {
  slot_date: string;
  slot_time: string;
  slot_status: string;
}

const ProfessionalPublicProfile = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [score, setScore] = useState<ScoreData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestOpen, setRequestOpen] = useState(false);
  const [preselectedTime, setPreselectedTime] = useState<string>("");

  const todayISO = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;
      setLoading(true);

      const [profileRes, scoreRes, reviewsRes, availRes, blockedRes] = await Promise.all([
        supabase.from("professional_profiles").select("id, user_id, full_name, rubro, descripcion, photo_url, verified, plan, address, neighborhood, google_maps_url, work_stations").eq("user_id", userId).maybeSingle(),
        supabase.rpc("get_professional_score", { p_professional_id: userId }),
        supabase.from("reviews").select("*").eq("professional_id", userId).order("created_at", { ascending: false }),
        supabase.from("professional_availability").select("day_of_week, start_time, end_time").eq("professional_id", userId).eq("is_active", true),
        supabase.from("blocked_slots").select("slot_date, slot_time, slot_status").eq("professional_id", userId).eq("slot_date", todayISO),
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (scoreRes.data) setScore(scoreRes.data as unknown as ScoreData);
      if (reviewsRes.data) setReviews(reviewsRes.data);
      if (availRes.data) setAvailability(availRes.data);
      if (blockedRes.data) setBlockedSlots(blockedRes.data as any);
      setLoading(false);
    };

    fetchData();

    // Realtime: blocked_slots for today (so capacity updates live)
    if (!userId) return;
    const channel = supabase
      .channel(`profile-blocked-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blocked_slots", filter: `professional_id=eq.${userId}` },
        () => {
          supabase
            .from("blocked_slots")
            .select("slot_date, slot_time, slot_status")
            .eq("professional_id", userId)
            .eq("slot_date", todayISO)
            .then(({ data }) => setBlockedSlots((data as any) || []));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, todayISO]);

  const renderStars = (value: number) => (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < Math.floor(value) ? "fill-accent text-accent" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );

  // Today's slots grid
  const todaySlots = (() => {
    if (!profile) return [] as { time: string; status: "free" | "full" }[];
    const dow = new Date().getDay();
    const dayAvail = availability.filter((a) => a.day_of_week === dow);
    if (dayAvail.length === 0) return [];

    const occupied = new Map<string, number>();
    blockedSlots
      .filter((b) => b.slot_status === "paid")
      .forEach((b) => {
        const k = b.slot_time.slice(0, 5);
        occupied.set(k, (occupied.get(k) || 0) + 1);
      });

    const stations = profile.work_stations || 1;
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    const out: { time: string; status: "free" | "full" }[] = [];

    dayAvail.forEach((slot) => {
      const [sH, sM] = slot.start_time.split(":").map(Number);
      const [eH, eM] = slot.end_time.split(":").map(Number);
      let h = sH, m = sM;
      while (h < eH || (h === eH && m < eM)) {
        const totalMin = h * 60 + m;
        if (totalMin > nowMin) {
          const t = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
          const isFull = (occupied.get(t) || 0) >= stations;
          out.push({ time: t, status: isFull ? "full" : "free" });
        }
        m += 60;
        if (m >= 60) { h++; m = 0; }
      }
    });
    return out;
  })();

  const handleSlotClick = (time: string) => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (user.id === userId) return;
    setPreselectedTime(time);
    setRequestOpen(true);
  };

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
    { label: "Velocidad", value: score?.velocity || 3, icon: Zap, color: "text-accent" },
    { label: "Confiabilidad", value: score?.reliability || 3, icon: Shield, color: "text-primary" },
    { label: "Excelencia", value: score?.excellence || 3, icon: Award, color: "text-secondary" },
  ];

  const canRequest = user && user.id !== userId;
  const mapsQuery = encodeURIComponent(profile.address || profile.neighborhood || profile.full_name);
  const mapEmbedUrl = `https://www.google.com/maps?q=${mapsQuery}&output=embed`;
  const mapsLink = profile.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

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
          className="rounded-2xl border-2 border-border bg-card p-6 shadow-md mb-4"
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
                <span className="text-sm text-muted-foreground">({score?.review_count || 0} reseñas)</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* LOCATION + MAP */}
        {(profile.address || profile.neighborhood) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border-2 border-border bg-card overflow-hidden shadow-md mb-4"
          >
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 flex-1">
                  <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    {profile.neighborhood && (
                      <p className="text-sm font-bold text-foreground">{profile.neighborhood}</p>
                    )}
                    {profile.address && (
                      <p className="text-sm text-muted-foreground">{profile.address}</p>
                    )}
                  </div>
                </div>
                <a
                  href={mapsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-primary hover:underline whitespace-nowrap"
                >
                  Cómo llegar →
                </a>
              </div>
            </div>
            <div className="aspect-video w-full border-t border-border">
              <iframe
                title="Mapa"
                src={mapEmbedUrl}
                className="w-full h-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </motion.div>
        )}

        {/* Description */}
        {profile.descripcion && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="rounded-2xl border-2 border-border bg-card p-4 shadow-md mb-4"
          >
            <p className="text-sm text-muted-foreground leading-relaxed">{profile.descripcion}</p>
          </motion.div>
        )}

        {/* TODAY'S AVAILABILITY GRID */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border-2 border-border bg-card p-4 shadow-md mb-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-card-foreground">Disponibilidad hoy</h2>
          </div>
          {todaySlots.length === 0 ? (
            <p className="text-sm text-muted-foreground rounded-lg bg-muted/50 p-3 text-center">
              No hay horarios disponibles hoy. Tocá "Solicitar Servicio" para ver otros días.
            </p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {todaySlots.map((s) => (
                <button
                  key={s.time}
                  onClick={() => s.status === "free" && handleSlotClick(s.time)}
                  disabled={s.status === "full" || !canRequest}
                  className={`rounded-lg border-2 px-2 py-2 text-sm font-bold transition-all ${
                    s.status === "full"
                      ? "border-border bg-muted text-muted-foreground/50 line-through cursor-not-allowed"
                      : "border-primary/30 bg-primary/5 text-primary hover:border-primary hover:bg-primary hover:text-primary-foreground"
                  } ${!canRequest && s.status === "free" ? "opacity-60" : ""}`}
                  title={s.status === "full" ? "Completo" : "Reservar"}
                >
                  {s.time}
                </button>
              ))}
            </div>
          )}
          {canRequest ? (
            <Button onClick={() => { setPreselectedTime(""); setRequestOpen(true); }} variant="outline" className="w-full mt-3" size="sm">
              Ver otros días
            </Button>
          ) : !user ? (
            <Button onClick={() => navigate("/login")} variant="outline" className="w-full mt-3" size="sm">
              Iniciá sesión para reservar
            </Button>
          ) : null}
        </motion.div>

        {/* Score Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border-2 border-border bg-card p-6 shadow-md mb-4"
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

      {/* Service Request Modal */}
      {userId && profile && (
        <ServiceRequestForm
          professionalId={userId}
          professionalName={profile.full_name}
          rubro={profile.rubro}
          open={requestOpen}
          onOpenChange={setRequestOpen}
          initialDate={preselectedTime ? todayISO : undefined}
          initialTime={preselectedTime || undefined}
        />
      )}
    </div>
  );
};

export default ProfessionalPublicProfile;
