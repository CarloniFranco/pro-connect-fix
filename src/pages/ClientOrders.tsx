import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ClipboardList,
  ArrowLeft,
  Loader2,
  Calendar,
  DollarSign,
  User as UserIcon,
  Wrench,
  Star,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";


type ServiceRequest = {
  id: string;
  service_type: string;
  description: string;
  status: string;
  quoted_amount: number | null;
  quoted_details: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  created_at: string;
  professional_id: string;
  deposit_amount: number | null;
  deposit_paid: boolean;
};

const statusLabels: Record<string, string> = {
  nueva: "Solicitado",
  cotizada: "Presupuestado",
  aceptada: "Confirmado",
  en_servicio: "En servicio",
  finalizada: "Finalizado",
  rechazada_profesional: "Declinado",
  rechazada_cliente: "Rechazado por vos",
};

const statusColors: Record<string, string> = {
  nueva: "bg-yellow-500/20 text-yellow-700",
  cotizada: "bg-blue-500/20 text-blue-700",
  aceptada: "bg-green-500/20 text-green-700",
  en_servicio: "bg-secondary/20 text-secondary-foreground",
  finalizada: "bg-secondary text-secondary-foreground",
  rechazada_profesional: "bg-destructive/20 text-destructive",
  rechazada_cliente: "bg-muted text-muted-foreground",
};

// Interactive star rating
const StarRating = ({
  value,
  onChange,
  size = 28,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: number;
}) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const display = hoverValue ?? value;

  return (
    <div className="flex items-center gap-0.5" onMouseLeave={() => setHoverValue(null)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = display >= star;
        const half = !filled && display >= star - 0.5;
        return (
          <div key={star} className="relative cursor-pointer" style={{ width: size, height: size }}>
            <div
              className="absolute inset-0 w-1/2 z-10"
              onMouseEnter={() => setHoverValue(star - 0.5)}
              onClick={() => onChange(star - 0.5)}
            />
            <div
              className="absolute inset-0 left-1/2 w-1/2 z-10"
              onMouseEnter={() => setHoverValue(star)}
              onClick={() => onChange(star)}
            />
            {filled ? (
              <Star size={size} className="text-accent fill-accent" />
            ) : half ? (
              <div className="relative">
                <Star size={size} className="text-muted-foreground/30" />
                <div className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
                  <Star size={size} className="text-accent fill-accent" />
                </div>
              </div>
            ) : (
              <Star size={size} className="text-muted-foreground/30" />
            )}
          </div>
        );
      })}
      <span className="ml-2 text-sm font-semibold text-foreground min-w-[2rem]">
        {display > 0 ? display.toFixed(1) : ""}
      </span>
    </div>
  );
};

const StarsDisplay = ({ rating, size = 16 }: { rating: number; size?: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => {
      const filled = rating >= star;
      const half = !filled && rating >= star - 0.5;
      return filled ? (
        <Star key={star} size={size} className="text-accent fill-accent" />
      ) : half ? (
        <div key={star} className="relative" style={{ width: size, height: size }}>
          <Star size={size} className="text-muted-foreground/30" />
          <div className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
            <Star size={size} className="text-accent fill-accent" />
          </div>
        </div>
      ) : (
        <Star key={star} size={size} className="text-muted-foreground/30" />
      );
    })}
    <span className="ml-1 text-xs font-medium text-muted-foreground">{rating.toFixed(1)}</span>
  </div>
);

const ClientOrders = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [proNames, setProNames] = useState<Record<string, string>>({});
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [existingReviews, setExistingReviews] = useState<Record<string, { rating: number; comment: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  // Review form state
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadRequests();
  }, [user]);

  // Pedido finalizado pendiente de reseña (obligatorio)
  const pendingReviewRequest = requests.find(
    (r) => r.status === "finalizada" && !reviewedIds.has(r.id)
  ) || null;

  // Auto-abrir el diálogo del pedido pendiente de reseña
  useEffect(() => {
    if (pendingReviewRequest && !selectedRequest) {
      setSelectedRequest(pendingReviewRequest);
    }
  }, [pendingReviewRequest, selectedRequest]);

  const loadRequests = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("service_requests")
      .select("id, service_type, description, status, quoted_amount, quoted_details, scheduled_date, scheduled_time, created_at, professional_id, deposit_amount, deposit_paid")
      .eq("client_user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading requests:", error);
      setLoading(false);
      return;
    }

    setRequests(data || []);

    const proIds = [...new Set((data || []).map((r) => r.professional_id))];
    if (proIds.length > 0) {
      const { data: pros } = await supabase
        .from("professional_profiles")
        .select("user_id, full_name")
        .in("user_id", proIds);
      const names: Record<string, string> = {};
      (pros || []).forEach((p) => { names[p.user_id] = p.full_name; });
      setProNames(names);
    }

    const { data: reviews } = await supabase
      .from("reviews")
      .select("service_request_id, rating, comment")
      .eq("client_user_id", user.id);

    const ids = new Set<string>();
    const revMap: Record<string, { rating: number; comment: string | null }> = {};
    (reviews || []).forEach((r) => {
      ids.add(r.service_request_id);
      revMap[r.service_request_id] = { rating: r.rating, comment: r.comment };
    });
    setReviewedIds(ids);
    setExistingReviews(revMap);

    setLoading(false);
  };

  const handleAcceptQuote = async (req: ServiceRequest) => {
    setAcceptingId(req.id);
    const { error } = await supabase
      .from("service_requests")
      .update({ status: "aceptada" as any })
      .eq("id", req.id);

    if (!error) {
      // Confirmar bloqueo del slot (de pending → paid para que cuente en capacidad)
      await supabase
        .from("blocked_slots")
        .update({ slot_status: "paid", expires_at: null })
        .eq("service_request_id", req.id);
    }

    setAcceptingId(null);
    if (error) {
      toast.error("Error al confirmar el turno");
      return;
    }
    toast.success("¡Turno confirmado! Te esperamos.");
    setSelectedRequest(null);
    loadRequests();
  };

  const handleRejectQuote = async (req: ServiceRequest) => {
    setRejectingId(req.id);

    // Liberar slots bloqueados
    await supabase
      .from("blocked_slots")
      .delete()
      .eq("service_request_id", req.id);

    const { error } = await supabase
      .from("service_requests")
      .update({ status: "rechazada_cliente" as any })
      .eq("id", req.id);
    setRejectingId(null);
    if (error) {
      toast.error("Error al rechazar");
      return;
    }
    toast.success("Presupuesto rechazado");
    setSelectedRequest(null);
    loadRequests();
  };

  const handleSubmitReview = async () => {
    if (!user || !selectedRequest || reviewRating < 0.5) {
      toast.error("Seleccioná una puntuación");
      return;
    }
    setSubmittingReview(true);
    const { error } = await supabase.from("reviews").insert({
      service_request_id: selectedRequest.id,
      professional_id: selectedRequest.professional_id,
      client_user_id: user.id,
      rating: reviewRating,
      comment: reviewComment.trim() || null,
    });

    if (error) {
      toast.error("No se pudo enviar la reseña.");
    } else {
      toast.success("¡Gracias por tu reseña!");
      setReviewedIds((prev) => new Set(prev).add(selectedRequest.id));
      setExistingReviews((prev) => ({
        ...prev,
        [selectedRequest.id]: { rating: reviewRating, comment: reviewComment.trim() || null },
      }));
      setReviewRating(0);
      setReviewComment("");
    }
    setSubmittingReview(false);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });

  useEffect(() => {
    if (selectedRequest) {
      setReviewRating(0);
      setReviewComment("");
    }
  }, [selectedRequest]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex min-h-screen items-center justify-center pt-14">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  const needsReview = (req: ServiceRequest) =>
    req.status === "finalizada" && !reviewedIds.has(req.id);

  const needsDecision = (req: ServiceRequest) =>
    req.status === "cotizada" && req.quoted_amount;

  // Status progress badges
  const getProgressBadges = (status: string) => {
    const steps = [
      { key: "nueva", label: "Solicitado" },
      { key: "cotizada", label: "Presupuestado" },
      { key: "aceptada", label: "Confirmado" },
    ];
    const statusOrder = ["nueva", "cotizada", "aceptada", "en_servicio", "finalizada"];
    const currentIdx = statusOrder.indexOf(status);

    return steps.map((step) => {
      const stepIdx = statusOrder.indexOf(step.key);
      const isActive = stepIdx <= currentIdx;
      return (
        <span
          key={step.key}
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          {step.label}
        </span>
      );
    });
  };

  return (
    <>
      <Navbar />
      <PaymentTestModeBanner />
      <div className="min-h-screen bg-background pt-14">
        <div className="container mx-auto max-w-2xl px-4 py-8">
          <button
            onClick={() => navigate("/")}
            className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </button>

          <h1 className="font-display text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Mis Pedidos
          </h1>

          {requests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <ClipboardList className="mb-3 h-12 w-12 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Todavía no tenés pedidos. Cuando solicites un servicio, aparecerá acá.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <Card
                  key={req.id}
                  className={`cursor-pointer transition-shadow hover:shadow-md ${
                    needsReview(req) ? "border-accent/50 ring-1 ring-accent/20" : ""
                  } ${needsDecision(req) ? "border-primary/50 ring-1 ring-primary/20" : ""}`}
                  onClick={() => setSelectedRequest(req)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Wrench className="h-4 w-4 text-primary shrink-0" />
                          <p className="text-sm font-semibold text-foreground truncate">
                            {req.service_type || "Servicio"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                          <UserIcon className="h-3 w-3" />
                          <span>{proNames[req.professional_id] || "Profesional"}</span>
                          <span>·</span>
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(req.created_at)}</span>
                        </div>
                        {req.quoted_amount != null && (
                          <div className="flex items-center gap-1 text-xs text-accent-foreground font-medium">
                            <DollarSign className="h-3 w-3" />
                            ${req.quoted_amount.toLocaleString("es-AR")}
                          </div>
                        )}
                        {/* Progress badges */}
                        {!["rechazada_profesional", "rechazada_cliente"].includes(req.status) && (
                          <div className="flex gap-1 mt-2">
                            {getProgressBadges(req.status)}
                          </div>
                        )}
                        {existingReviews[req.id] && (
                          <div className="mt-1">
                            <StarsDisplay rating={existingReviews[req.id].rating} />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge
                          variant="secondary"
                          className={`shrink-0 text-xs ${statusColors[req.status] || ""}`}
                        >
                          {statusLabels[req.status] || req.status}
                        </Badge>
                        {needsDecision(req) && (
                          <span className="text-xs font-medium text-primary animate-pulse">
                            ✋ Aceptar / Rechazar
                          </span>
                        )}
                        {needsReview(req) && (
                          <span className="text-xs font-medium text-accent animate-pulse">
                            ⭐ Dejá tu reseña
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Banner de reseña obligatoria */}
          {pendingReviewRequest && (
            <div className="mb-4 rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm text-foreground">
              <p className="font-semibold text-accent-foreground mb-1">⭐ Tenés una reseña pendiente</p>
              <p className="text-xs text-muted-foreground">
                Para seguir usando la plataforma, calificá tu último servicio finalizado.
              </p>
            </div>
          )}

          {/* Detail Dialog */}
          <Dialog
            open={!!selectedRequest}
            onOpenChange={(open) => {
              if (!open) {
                // Bloquear cierre si hay reseña pendiente sobre este pedido
                if (
                  selectedRequest &&
                  selectedRequest.status === "finalizada" &&
                  !reviewedIds.has(selectedRequest.id)
                ) {
                  toast.error("Por favor dejá tu reseña antes de cerrar.");
                  return;
                }
                setSelectedRequest(null);
              }
            }}
          >
            <DialogContent
              className="max-w-md max-h-[90vh] overflow-y-auto"
              onPointerDownOutside={(e) => {
                if (
                  selectedRequest &&
                  selectedRequest.status === "finalizada" &&
                  !reviewedIds.has(selectedRequest.id)
                ) {
                  e.preventDefault();
                }
              }}
              onEscapeKeyDown={(e) => {
                if (
                  selectedRequest &&
                  selectedRequest.status === "finalizada" &&
                  !reviewedIds.has(selectedRequest.id)
                ) {
                  e.preventDefault();
                }
              }}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-primary" />
                  {selectedRequest?.service_type || "Detalle del pedido"}
                </DialogTitle>
              </DialogHeader>
              {selectedRequest && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Profesional</p>
                      <p className="font-medium">{proNames[selectedRequest.professional_id] || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Fecha</p>
                      <p className="font-medium">{formatDate(selectedRequest.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Estado</p>
                      <Badge variant="secondary" className={`text-xs ${statusColors[selectedRequest.status] || ""}`}>
                        {statusLabels[selectedRequest.status] || selectedRequest.status}
                      </Badge>
                    </div>
                    {selectedRequest.quoted_amount != null && (
                      <div>
                        <p className="text-xs text-muted-foreground">Presupuesto</p>
                        <p className="font-semibold text-accent-foreground">
                          ${selectedRequest.quoted_amount.toLocaleString("es-AR")}
                        </p>
                      </div>
                    )}
                    {selectedRequest.scheduled_date && (
                      <div>
                        <p className="text-xs text-muted-foreground">Fecha agendada</p>
                        <p className="font-medium">{formatDate(selectedRequest.scheduled_date)}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Descripción</p>
                    <p className="text-sm text-foreground">{selectedRequest.description || "Sin descripción"}</p>
                  </div>

                  {selectedRequest.quoted_details && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Detalle del presupuesto</p>
                      <p className="text-sm text-foreground bg-muted/50 rounded-lg p-3 whitespace-pre-wrap">
                        {selectedRequest.quoted_details}
                      </p>
                    </div>
                  )}

                  {/* Accept / Reject quote */}
                  {needsDecision(selectedRequest) && (
                    <div className="border-t border-border pt-4 space-y-3">
                      <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-center">
                        <p className="text-sm font-semibold text-foreground mb-1">
                          ¿Aceptás el presupuesto?
                        </p>
                        <p className="text-xs text-muted-foreground mb-3">
                          Si lo aceptás, el turno queda confirmado automáticamente. No se requiere pago anticipado.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => handleRejectQuote(selectedRequest)}
                            disabled={rejectingId === selectedRequest.id || acceptingId === selectedRequest.id}
                            className="flex-1 gap-1 text-destructive"
                          >
                            <XCircle className="h-4 w-4" />
                            Rechazar
                          </Button>
                          <Button
                            onClick={() => handleAcceptQuote(selectedRequest)}
                            disabled={acceptingId === selectedRequest.id || rejectingId === selectedRequest.id}
                            className="flex-1 gap-2"
                          >
                            {acceptingId === selectedRequest.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                            Aceptar y confirmar
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Status messages */}
                  {selectedRequest.status === "nueva" && (
                    <div className="rounded-lg bg-yellow-500/10 p-3 text-center">
                      <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">
                        ⏳ Esperando respuesta del profesional
                      </p>
                    </div>
                  )}

                  {selectedRequest.status === "aceptada" && (
                    <div className="rounded-lg bg-green-500/10 p-3 text-center">
                      <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                        ✅ Turno confirmado — Te esperamos
                      </p>
                    </div>
                  )}

                  {selectedRequest.status === "en_servicio" && (
                    <div className="rounded-lg bg-primary/10 p-3 text-center">
                      <p className="text-sm font-semibold text-primary">
                        🔧 El profesional está trabajando en tu servicio
                      </p>
                    </div>
                  )}

                  {selectedRequest.status === "rechazada_profesional" && (
                    <div className="rounded-lg bg-destructive/10 p-3 text-center">
                      <p className="text-sm font-semibold text-destructive">
                        El profesional declinó esta solicitud
                      </p>
                    </div>
                  )}

                  {selectedRequest.status === "rechazada_cliente" && (
                    <div className="rounded-lg bg-muted p-3 text-center">
                      <p className="text-sm font-semibold text-muted-foreground">
                        Rechazaste este presupuesto
                      </p>
                    </div>
                  )}

                  {/* Review section */}
                  {selectedRequest.status === "finalizada" && (
                    <div className="border-t border-border pt-4">
                      {reviewedIds.has(selectedRequest.id) ? (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-2">Tu reseña</p>
                          <StarsDisplay rating={existingReviews[selectedRequest.id]?.rating || 0} size={20} />
                          {existingReviews[selectedRequest.id]?.comment && (
                            <p className="mt-2 text-sm text-foreground bg-muted/50 rounded-lg p-3">
                              {existingReviews[selectedRequest.id].comment}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-semibold text-foreground mb-1">
                            ¿Cómo fue tu experiencia? <span className="text-destructive">*</span>
                          </p>
                          <p className="text-xs text-muted-foreground mb-3">
                            Tu calificación es <strong>obligatoria</strong> y ayuda a otros clientes. Forma parte de la meritocracia del profesional.
                          </p>
                          <StarRating value={reviewRating} onChange={setReviewRating} />
                          <Textarea
                            className="mt-3"
                            placeholder="Contanos cómo fue el servicio (opcional)"
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                            maxLength={500}
                            rows={3}
                          />
                          <Button
                            className="mt-3 w-full gap-2"
                            onClick={handleSubmitReview}
                            disabled={submittingReview || reviewRating < 0.5}
                          >
                            {submittingReview ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Star className="h-4 w-4" />
                            )}
                            Enviar reseña
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  );
};

export default ClientOrders;
