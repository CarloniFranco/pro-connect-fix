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
  StarHalf,
} from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";

type ServiceRequest = {
  id: string;
  service_type: string;
  description: string;
  status: string;
  quoted_amount: number | null;
  quoted_details: string | null;
  scheduled_date: string | null;
  created_at: string;
  professional_id: string;
};

const statusLabels: Record<string, string> = {
  nueva: "Pendiente",
  cotizada: "Cotizada",
  aceptada: "Aceptada",
  en_servicio: "En servicio",
  finalizada: "Finalizado",
};

const statusColors: Record<string, string> = {
  nueva: "bg-muted text-muted-foreground",
  cotizada: "bg-accent/20 text-accent-foreground",
  aceptada: "bg-primary/20 text-primary",
  en_servicio: "bg-secondary/20 text-secondary-foreground",
  finalizada: "bg-secondary text-secondary-foreground",
};

// Interactive star rating (supports half stars: 0.5, 1, 1.5 ... 5)
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
            {/* Left half */}
            <div
              className="absolute inset-0 w-1/2 z-10"
              onMouseEnter={() => setHoverValue(star - 0.5)}
              onClick={() => onChange(star - 0.5)}
            />
            {/* Right half */}
            <div
              className="absolute inset-0 left-1/2 w-1/2 z-10"
              onMouseEnter={() => setHoverValue(star)}
              onClick={() => onChange(star)}
            />
            {filled ? (
              <Star
                size={size}
                className="text-accent fill-accent"
              />
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

// Read-only stars display
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

  // Review form state
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadRequests();
  }, [user]);

  const loadRequests = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("service_requests")
      .select("id, service_type, description, status, quoted_amount, quoted_details, scheduled_date, created_at, professional_id")
      .eq("client_user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading requests:", error);
      setLoading(false);
      return;
    }

    setRequests(data || []);

    // Fetch professional names
    const proIds = [...new Set((data || []).map((r) => r.professional_id))];
    if (proIds.length > 0) {
      const { data: pros } = await supabase
        .from("professional_profiles")
        .select("user_id, full_name")
        .in("user_id", proIds);
      const names: Record<string, string> = {};
      (pros || []).forEach((p) => {
        names[p.user_id] = p.full_name;
      });
      setProNames(names);
    }

    // Fetch existing reviews by this user
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
      console.error("Error submitting review:", error);
      toast.error("No se pudo enviar la reseña. Intentá de nuevo.");
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-AR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Reset review form when dialog opens
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

  return (
    <>
      <Navbar />
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
                  }`}
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
                        {/* Show existing review stars inline */}
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

          {/* Detail Dialog */}
          <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
            <DialogContent className="max-w-md">
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
                      <Badge
                        variant="secondary"
                        className={`text-xs ${statusColors[selectedRequest.status] || ""}`}
                      >
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
                      <p className="text-sm text-foreground bg-muted/50 rounded-lg p-3">
                        {selectedRequest.quoted_details}
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
                            ¿Cómo fue tu experiencia?
                          </p>
                          <p className="text-xs text-muted-foreground mb-3">
                            Tu calificación ayuda a otros clientes y forma parte de la meritocracia del profesional.
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
