import { useEffect, useState } from "react";
import { ClipboardList, Loader2, ChevronRight, Phone, MapPin, CheckCircle2, XCircle, Clock, Send, FileText, ArrowLeft, Brain, Sparkles, AlertTriangle, Ban } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";


type OrderStatus = "nueva" | "cotizada" | "aceptada" | "en_servicio" | "finalizada" | "rechazada_profesional" | "rechazada_cliente";

interface ServiceRequest {
  id: string;
  client_name: string;
  client_phone: string | null;
  client_address: string | null;
  client_user_id: string | null;
  service_type: string;
  description: string;
  status: OrderStatus;
  quoted_amount: number | null;
  quoted_details: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  created_at: string;
  deposit_amount: number | null;
  deposit_paid: boolean;
  dropoff_mode?: boolean;
  dropoff_time?: string | null;
  pickup_time?: string | null;
}

type TabKey = "pendientes" | "espera" | "confirmados" | "finalizados";

const allTabs: { key: TabKey; label: string; color: string }[] = [
  { key: "pendientes", label: "Pendientes", color: "bg-yellow-500" },
  { key: "espera", label: "Espera Seña", color: "bg-blue-500" },
  { key: "confirmados", label: "Confirmados", color: "bg-green-500" },
  { key: "finalizados", label: "Finalizados", color: "bg-muted-foreground" },
];

const isLavadero = (rubro?: string) => (rubro || "").toLowerCase().includes("lavadero");

const statusToTab: Record<OrderStatus, TabKey> = {
  nueva: "pendientes",
  cotizada: "espera",
  aceptada: "confirmados",
  en_servicio: "confirmados",
  finalizada: "finalizados",
  rechazada_profesional: "finalizados",
  rechazada_cliente: "finalizados",
};

const AgendaOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("pendientes");
  const [selectedOrder, setSelectedOrder] = useState<ServiceRequest | null>(null);
  const [proProfile, setProProfile] = useState<{ full_name: string; rubro: string; work_stations: number } | null>(null);
  const lavadero = isLavadero(proProfile?.rubro);
  const tabs = lavadero ? allTabs.filter((t) => t.key !== "pendientes" && t.key !== "espera") : allTabs;

  // Si es lavadero y el tab actual no aplica, saltar a confirmados
  useEffect(() => {
    if (lavadero && (activeTab === "pendientes" || activeTab === "espera")) {
      setActiveTab("confirmados");
    }
  }, [lavadero, activeTab]);

  // Quote form state
  const [aiDescription, setAiDescription] = useState("");
  const [materials, setMaterials] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [generatingBudget, setGeneratingBudget] = useState(false);

  // Cancel-confirmed-turn modal state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const handleCancelConfirmed = async () => {
    if (!selectedOrder) return;
    if (!cancelReason.trim() || cancelReason.trim().length < 10) {
      toast.error("Por favor, contanos brevemente el motivo (mínimo 10 caracteres)");
      return;
    }
    setCancelling(true);
    const { error } = await supabase
      .from("service_requests")
      .update({
        status: "rechazada_profesional" as any,
        cancellation_reason: cancelReason.trim(),
        cancelled_by: "professional",
      } as any)
      .eq("id", selectedOrder.id);
    setCancelling(false);
    if (error) {
      toast.error("Error al cancelar el turno");
      return;
    }
    toast.success("Turno cancelado. El cliente fue notificado.");
    setCancelDialogOpen(false);
    setCancelReason("");
    setSelectedOrder(null);
    fetchOrders();
  };

  const fetchOrders = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("service_requests")
      .select("id, client_name, client_phone, client_address, client_user_id, service_type, description, status, quoted_amount, quoted_details, scheduled_date, scheduled_time, created_at, deposit_amount, deposit_paid, dropoff_mode, dropoff_time, pickup_time")
      .eq("professional_id", user.id)
      .order("created_at", { ascending: false });
    setOrders((data as ServiceRequest[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    fetchOrders();
    // Fetch pro profile for AI budget
    supabase.from("professional_profiles").select("full_name, rubro, work_stations").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setProProfile(data as any));
    const channel = supabase
      .channel("agenda-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "service_requests", filter: `professional_id=eq.${user.id}` }, () => fetchOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const filtered = orders.filter((o) => statusToTab[o.status] === activeTab);

  const handleDecline = async (order: ServiceRequest) => {
    setSaving(true);
    const { error } = await supabase
      .from("service_requests")
      .update({ status: "rechazada_profesional" as any, responded_at: new Date().toISOString() })
      .eq("id", order.id);
    setSaving(false);
    if (error) { toast.error("Error al rechazar"); return; }
    // Notification is handled automatically by DB trigger

    toast.success("Solicitud declinada. Esto afecta tu ranking de confiabilidad.");
    setSelectedOrder(null);
    fetchOrders();
  };

  const handleGenerateBudget = async (order: ServiceRequest) => {
    setGeneratingBudget(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-budget", {
        body: {
          serviceType: order.service_type,
          description: order.description,
          professionalName: proProfile?.full_name || "",
          rubro: proProfile?.rubro || "",
        },
      });
      if (error) throw error;
      if (data?.description) {
        setAiDescription(data.description);
        toast.success("Descripción generada por IA");
      }
    } catch (e: any) {
      toast.error(e.message || "Error al generar descripción");
    }
    setGeneratingBudget(false);
  };

  const handleSendQuote = async (order: ServiceRequest) => {
    if (!aiDescription.trim()) {
      toast.error("Generá primero la descripción con IA");
      return;
    }
    if (!materials.trim() || !estimatedTime.trim() || !quoteAmount) {
      toast.error("Completá materiales, tiempo y monto total");
      return;
    }
    const amount = Number(quoteAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Ingresá un monto total válido");
      return;
    }
    const depositAmount = Math.round(amount * 0.1);

    const combinedDetails = `${aiDescription.trim()}\n\nMateriales a utilizar: ${materials.trim()}\nTiempo estimado de trabajo: ${estimatedTime.trim()}\nMonto Total: $${amount.toLocaleString("es-AR")}`;

    setSaving(true);
    const { error } = await supabase
      .from("service_requests")
      .update({
        status: "cotizada" as any,
        quoted_amount: amount,
        quoted_details: combinedDetails,
        deposit_amount: depositAmount,
        scheduled_date: scheduledDate || order.scheduled_date || null,
        scheduled_time: scheduledTime ? scheduledTime + ":00" : order.scheduled_time || null,
        responded_at: new Date().toISOString(),
      })
      .eq("id", order.id);
    setSaving(false);
    if (error) { toast.error("Error al cotizar"); return; }
    toast.success("Presupuesto enviado al cliente");
    setSelectedOrder(null);
    setAiDescription(""); setMaterials(""); setEstimatedTime(""); setQuoteAmount("");
    setScheduledDate(""); setScheduledTime("");
    fetchOrders();
  };

  const handleFinalize = async (order: ServiceRequest) => {
    setSaving(true);
    const { error } = await supabase
      .from("service_requests")
      .update({
        status: "finalizada" as any,
        completed_at: new Date().toISOString(),
        schedule_met: true,
      })
      .eq("id", order.id);
    setSaving(false);
    if (error) { toast.error("Error al finalizar"); return; }
    toast.success("Trabajo finalizado. Se solicitó reseña al cliente.");
    setSelectedOrder(null);
    fetchOrders();
  };

  const handleStartService = async (order: ServiceRequest) => {
    setSaving(true);
    const { error } = await supabase
      .from("service_requests")
      .update({ status: "en_servicio" as any })
      .eq("id", order.id);
    setSaving(false);
    if (error) { toast.error("Error al iniciar servicio"); return; }
    toast.success("Servicio iniciado");
    setSelectedOrder(null);
    fetchOrders();
  };

  // Detail view
  if (selectedOrder) {
    const o = selectedOrder;
    return (
      <Card>
        <CardHeader className="pb-3">
          <button onClick={() => setSelectedOrder(null)} className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Volver
          </button>
          <div className="flex items-center justify-between">
            <CardTitle className="font-display text-lg">Detalle del Pedido</CardTitle>
            <StatusBadge status={o.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Client info */}
          <div className="rounded-lg bg-muted/40 p-3 space-y-2">
            <p className="text-sm font-semibold text-foreground">{o.client_name}</p>
            {(o.status === "aceptada" || o.status === "en_servicio") && (
              <>
                {o.client_phone && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <a href={`tel:${o.client_phone}`} className="text-primary underline">{o.client_phone}</a>
                  </div>
                )}
                {o.client_address && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {o.client_address}
                  </div>
                )}
              </>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">Servicio</p>
            <p className="text-sm text-foreground">{o.service_type}</p>
          </div>
          {o.dropoff_mode && (
            <div className="rounded-lg border-2 border-secondary/40 bg-secondary/10 px-3 py-2">
              <p className="text-xs font-bold text-secondary flex items-center gap-1">
                🅿️ Dejá y retirá
              </p>
              <p className="text-xs text-foreground mt-0.5">
                Entrega <strong>{o.dropoff_time?.slice(0, 5) || "—"}</strong> · Retiro <strong>{o.pickup_time?.slice(0, 5) || "—"}</strong>
              </p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">Descripción</p>
            <p className="text-sm text-foreground">{o.description}</p>
          </div>
          {o.scheduled_date && (
            <div className="text-xs text-muted-foreground">
              📅 {new Date(o.scheduled_date + "T00:00:00").toLocaleDateString("es-AR")} {o.scheduled_time?.slice(0, 5) && `a las ${o.scheduled_time.slice(0, 5)}`}
            </div>
          )}

          {/* Nueva: Quote form + reject */}
          {o.status === "nueva" && (
            <div className="space-y-3 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <FileText className="h-4 w-4 text-accent" /> Armar Presupuesto
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerateBudget(o)}
                  disabled={generatingBudget}
                  className="gap-1 text-xs"
                >
                  {generatingBudget ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  {generatingBudget ? "Generando..." : aiDescription ? "Regenerar IA" : "Generar Descripción IA"}
                </Button>
              </div>

              {/* AI-generated read-only description */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Descripción profesional del trabajo (IA)
                </label>
                {aiDescription ? (
                  <div className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-foreground whitespace-pre-wrap">
                    {aiDescription}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
                    Tocá "Generar Descripción IA" para que la IA redacte el resumen del trabajo.
                  </div>
                )}
              </div>

              {/* Manual inputs */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Materiales a utilizar <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={materials}
                  onChange={(e) => setMaterials(e.target.value)}
                  placeholder="Ej: Shampoo neutro, cera líquida, microfibras..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Tiempo estimado de trabajo <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={estimatedTime}
                  onChange={(e) => setEstimatedTime(e.target.value)}
                  placeholder="Ej: 2 horas, 45 minutos..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Monto Total ($) <span className="text-destructive">*</span>
                </label>
                <input
                  type="number"
                  value={quoteAmount}
                  onChange={(e) => setQuoteAmount(e.target.value)}
                  placeholder="25000"
                  min="0"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {quoteAmount && Number(quoteAmount) > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Seña (10%): <span className="font-semibold text-primary">${Math.round(Number(quoteAmount) * 0.1).toLocaleString("es-AR")}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">Fecha</label>
                  <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">Hora</label>
                  <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => handleDecline(o)} disabled={saving} variant="outline" className="flex-1 gap-1 text-destructive border-destructive/30 hover:bg-destructive/10">
                  <XCircle className="h-4 w-4" /> Declinar
                </Button>
                <Button onClick={() => handleSendQuote(o)} disabled={saving} className="flex-1 gap-1">
                  <Send className="h-4 w-4" /> {saving ? "Enviando..." : "Enviar Presupuesto"}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                ⚠️ Declinar solicitudes reduce tu ranking de confiabilidad
              </p>
            </div>
          )}

          {/* Cotizada: waiting for deposit */}
          {o.status === "cotizada" && o.quoted_amount && (
            <div className="space-y-2">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Tu cotización</p>
                <p className="text-lg font-display font-bold text-foreground">${Number(o.quoted_amount).toLocaleString("es-AR")}</p>
                {o.quoted_details && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{o.quoted_details}</p>}
              </div>
              <div className="rounded-lg bg-blue-500/10 p-3 text-center">
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                  ⏳ Esperando seña del 10% (${Math.round(Number(o.quoted_amount) * 0.1).toLocaleString("es-AR")})
                </p>
              </div>
            </div>
          )}

          {/* Aceptada: start service */}
          {o.status === "aceptada" && (
            <div className="space-y-2">
              <div className="rounded-lg bg-green-500/10 p-3 text-center">
                <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                  ✅ Seña pagada — Turno Confirmado
                </p>
              </div>
              <Button onClick={() => handleStartService(o)} disabled={saving} className="w-full gap-2">
                <CheckCircle2 className="h-4 w-4" /> Iniciar Servicio
              </Button>
              <Button
                onClick={() => { setCancelReason(""); setCancelDialogOpen(true); }}
                variant="outline"
                className="w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                <Ban className="h-4 w-4" /> Cancelar turno
              </Button>
            </div>
          )}

          {/* En servicio: finalize */}
          {o.status === "en_servicio" && (
            <div className="space-y-2">
              <Button onClick={() => handleFinalize(o)} disabled={saving} className="w-full gap-2 bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="h-4 w-4" /> Finalizar Trabajo
              </Button>
              <Button
                onClick={() => { setCancelReason(""); setCancelDialogOpen(true); }}
                variant="outline"
                className="w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                <Ban className="h-4 w-4" /> Cancelar turno
              </Button>
            </div>
          )}

          {/* Finalizada */}
          {o.status === "finalizada" && (
            <div className="rounded-lg bg-green-500/10 p-3 text-center">
              <p className="text-sm font-semibold text-green-700 dark:text-green-300">✅ Trabajo finalizado</p>
            </div>
          )}

          {/* Rechazada profesional */}
          {o.status === "rechazada_profesional" && (
            <div className="rounded-lg bg-destructive/10 p-3 text-center">
              <p className="text-sm font-semibold text-destructive">❌ Declinada por vos</p>
            </div>
          )}

          {/* Rechazada cliente */}
          {o.status === "rechazada_cliente" && (
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-sm font-semibold text-muted-foreground">Rechazada por el cliente</p>
            </div>
          )}
        </CardContent>

        {/* Cancel-confirmed-turn Dialog */}
        <Dialog open={cancelDialogOpen} onOpenChange={(v) => { if (!cancelling) setCancelDialogOpen(v); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-display">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Cancelar turno confirmado
              </DialogTitle>
              <DialogDescription className="text-left space-y-2 pt-2">
                <span className="block">
                  Vas a cancelar el turno de <strong>{o.client_name}</strong>{o.scheduled_date && (
                    <> el <strong>{new Date(o.scheduled_date + "T00:00:00").toLocaleDateString("es-AR")}</strong>{o.scheduled_time && <> a las <strong>{o.scheduled_time.slice(0,5)}</strong></>}</>
                  )}.
                </span>
                <span className="block rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                  ⚠️ <strong>Importante:</strong> cancelar un turno ya confirmado afecta tu <strong>ranking de confiabilidad</strong> y baja tu puntuación. Al cliente se le notificará la cancelación con un pedido de disculpas y se le reintegrará la seña.
                </span>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">
                Motivo de la cancelación <span className="text-destructive">*</span>
              </label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ej: Tuve un imprevisto familiar, problema de salud, falla técnica del equipo, etc."
                rows={4}
                maxLength={300}
                disabled={cancelling}
              />
              <p className="text-[10px] text-muted-foreground text-right">
                {cancelReason.length}/300 — el cliente verá este motivo
              </p>
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                variant="outline"
                onClick={() => setCancelDialogOpen(false)}
                disabled={cancelling}
              >
                Volver
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelConfirmed}
                disabled={cancelling || cancelReason.trim().length < 10}
                className="gap-2"
              >
                {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                {cancelling ? "Cancelando..." : "Confirmar cancelación"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <ClipboardList className="h-5 w-5 text-secondary" />
          Agenda de Pedidos
        </CardTitle>
        <div className="no-scrollbar flex gap-2 pt-2 overflow-x-auto -mx-1 px-1">
          {tabs.map((t) => {
            const count = orders.filter((o) => statusToTab[o.status] === t.key).length;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeTab === t.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${t.color}`} />
                {t.label}
                {count > 0 && (
                  <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                    activeTab === t.key ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted-foreground/20"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Clock className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No hay pedidos en esta categoría</p>
          </div>
        ) : activeTab === "confirmados" && (proProfile?.work_stations || 1) > 1 ? (
          // Grouped view by time slot for multi-station professionals
          (() => {
            const groups = new Map<string, ServiceRequest[]>();
            filtered.forEach((o) => {
              const key = o.scheduled_date && o.scheduled_time
                ? `${o.scheduled_date}T${o.scheduled_time.slice(0, 5)}`
                : "sin-horario";
              if (!groups.has(key)) groups.set(key, []);
              groups.get(key)!.push(o);
            });
            const sortedKeys = Array.from(groups.keys()).sort();
            return sortedKeys.map((key) => {
              const items = groups.get(key)!;
              const stations = proProfile!.work_stations;
              const [datePart, timePart] = key.split("T");
              const isScheduled = key !== "sin-horario";
              return (
                <div key={key} className="rounded-lg border-2 border-primary/20 bg-primary/5 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-bold text-primary">
                      {isScheduled ? `📅 ${new Date(datePart + "T00:00:00").toLocaleDateString("es-AR")} • ⏰ ${timePart}` : "Sin horario asignado"}
                    </p>
                    <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                      {items.length}/{stations} {items.length === 1 ? "estación" : "estaciones"}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {items.map((order) => (
                      <button
                        key={order.id}
                        onClick={() => {
                          setSelectedOrder(order);
                          setQuoteAmount(order.quoted_amount?.toString() || "");
                          setAiDescription("");
                          setMaterials("");
                          setEstimatedTime("");
                          setScheduledDate(order.scheduled_date || "");
                          setScheduledTime(order.scheduled_time?.slice(0, 5) || "");
                        }}
                        className="w-full rounded-md border border-border bg-card p-2 text-left transition-colors hover:bg-muted/30"
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground">{order.client_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{order.service_type}</p>
                          </div>
                          <StatusBadge status={order.status} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            });
          })()
        ) : (
          filtered.map((order) => (
            <button
              key={order.id}
              onClick={() => {
                setSelectedOrder(order);
                setQuoteAmount(order.quoted_amount?.toString() || "");
                setAiDescription("");
                setMaterials("");
                setEstimatedTime("");
                setScheduledDate(order.scheduled_date || "");
                setScheduledTime(order.scheduled_time?.slice(0, 5) || "");
              }}
              className="w-full rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/30"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-display text-xs font-bold text-muted-foreground">
                  {new Date(order.created_at).toLocaleDateString("es-AR")}
                </span>
                <StatusBadge status={order.status} />
              </div>
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{order.client_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{order.service_type} — {order.description.slice(0, 50)}{order.description.length > 50 ? "…" : ""}</p>
                  {order.scheduled_date && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      📅 {new Date(order.scheduled_date + "T00:00:00").toLocaleDateString("es-AR")} {order.scheduled_time?.slice(0, 5) && `${order.scheduled_time.slice(0, 5)}`}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              </div>
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
};

const StatusBadge = ({ status }: { status: OrderStatus }) => {
  const config: Record<OrderStatus, { label: string; className: string }> = {
    nueva: { label: "Pendiente", className: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300" },
    cotizada: { label: "Presupuestado", className: "bg-blue-500/20 text-blue-700 dark:text-blue-300" },
    aceptada: { label: "Señado ✓", className: "bg-green-500/20 text-green-700 dark:text-green-300" },
    en_servicio: { label: "En Servicio", className: "bg-green-600/20 text-green-800 dark:text-green-200" },
    finalizada: { label: "Finalizado", className: "bg-muted text-muted-foreground" },
    rechazada_profesional: { label: "Declinada", className: "bg-destructive/20 text-destructive" },
    rechazada_cliente: { label: "Rechazada", className: "bg-muted text-muted-foreground" },
  };
  const c = config[status] || { label: status, className: "bg-muted text-muted-foreground" };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.className}`}>{c.label}</span>;
};

export default AgendaOrders;
