import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Filter,
} from "lucide-react";
import Navbar from "@/components/Navbar";

type ServiceRequest = {
  id: string;
  client_name: string;
  client_phone: string | null;
  client_address: string | null;
  service_type: string;
  description: string;
  status: string;
  quoted_amount: number | null;
  quoted_details: string | null;
  scheduled_date: string | null;
  created_at: string;
  completed_at: string | null;
};

const statusLabels: Record<string, string> = {
  nueva: "Nueva",
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

type FilterType = "todos" | "finalizada" | "cotizada" | "aceptada";

const ProWorkHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("todos");
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);

  useEffect(() => {
    if (!user) return;
    loadRequests();
  }, [user]);

  const loadRequests = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("service_requests")
      .select("id, client_name, client_phone, client_address, service_type, description, status, quoted_amount, quoted_details, scheduled_date, created_at, completed_at")
      .eq("professional_id", user.id)
      .order("created_at", { ascending: false });

    if (error) console.error("Error loading work history:", error);
    setRequests(data || []);
    setLoading(false);
  };

  const filtered = filter === "todos"
    ? requests
    : requests.filter((r) => r.status === filter);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });

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

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background pt-14">
        <div className="container mx-auto max-w-2xl px-4 py-8">
          <button
            onClick={() => navigate("/dashboard")}
            className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al panel
          </button>

          <h1 className="font-display text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Historial de Trabajos
          </h1>

          {/* Filters */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            {(["todos", "finalizada", "cotizada", "aceptada"] as FilterType[]).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
                className="shrink-0"
              >
                {f === "todos" ? "Todos" : statusLabels[f]}
              </Button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <ClipboardList className="mb-3 h-12 w-12 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {filter === "todos"
                    ? "Todavía no tenés trabajos registrados."
                    : `No hay trabajos con estado "${statusLabels[filter]}".`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((req) => (
                <Card
                  key={req.id}
                  className="cursor-pointer transition-shadow hover:shadow-md"
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
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <UserIcon className="h-3 w-3" />
                          <span>{req.client_name || "Cliente"}</span>
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
                      </div>
                      <Badge
                        variant="secondary"
                        className={`shrink-0 text-xs ${statusColors[req.status] || ""}`}
                      >
                        {statusLabels[req.status] || req.status}
                      </Badge>
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
                  {selectedRequest?.service_type || "Detalle"}
                </DialogTitle>
              </DialogHeader>
              {selectedRequest && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Cliente</p>
                      <p className="font-medium">{selectedRequest.client_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Teléfono</p>
                      <p className="font-medium">{selectedRequest.client_phone || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Dirección</p>
                      <p className="font-medium">{selectedRequest.client_address || "—"}</p>
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
                    {selectedRequest.completed_at && (
                      <div>
                        <p className="text-xs text-muted-foreground">Finalizado</p>
                        <p className="font-medium">{formatDate(selectedRequest.completed_at)}</p>
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
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  );
};

export default ProWorkHistory;
