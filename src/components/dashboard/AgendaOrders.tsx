import { useEffect, useState } from "react";
import { ClipboardList, Loader2, ChevronRight, Phone, MapPin, CheckCircle2, XCircle, Clock, Send, FileText, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type OrderStatus = "nueva" | "cotizada" | "aceptada" | "en_servicio" | "finalizada";

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
}

type TabKey = "pendientes" | "espera" | "confirmados" | "finalizados";

const tabs: { key: TabKey; label: string; color: string }[] = [
  { key: "pendientes", label: "Pendientes", color: "bg-yellow-500" },
  { key: "espera", label: "Espera Seña", color: "bg-blue-500" },
  { key: "confirmados", label: "Confirmados", color: "bg-green-500" },
  { key: "finalizados", label: "Finalizados", color: "bg-muted-foreground" },
];

const statusToTab: Record<OrderStatus, TabKey> = {
  nueva: "pendientes",
  cotizada: "espera",
  aceptada: "confirmados",
  en_servicio: "confirmados",
  finalizada: "finalizados",
};

const AgendaOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("pendientes");
  const [selectedOrder, setSelectedOrder] = useState<ServiceRequest | null>(null);

  // Quote form state
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteDetails, setQuoteDetails] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchOrders = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("service_requests")
      .select("id, client_name, client_phone, client_address, client_user_id, service_type, description, status, quoted_amount, quoted_details, scheduled_date, scheduled_time, created_at")
      .eq("professional_id", user.id)
      .order("created_at", { ascending: false });
    setOrders((data as ServiceRequest[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    fetchOrders();
    const channel = supabase
      .channel("agenda-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "service_requests", filter: `professional_id=eq.${user.id}` }, () => fetchOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const filtered = orders.filter((o) => statusToTab[o.status] === activeTab);

  const handleReject = async (order: ServiceRequest) => {
    setSaving(true);
    // We don't have a "rechazada" status in enum, so we'll just delete the request
    // Actually let's just mark as finalizada with a note
    const { error } = await supabase
      .from("service_requests")
      .update({ status: "finalizada" as any, completed_at: new Date().toISOString(), quoted_details: "Rechazado por el profesional" } as any)
      .eq("id", order.id);
    setSaving(false);
    if (error) { toast.error("Error al rechazar"); return; }
    toast.success("Pedido rechazado");
    setSelectedOrder(null);
    fetchOrders();
  };

  const handleSendQuote = async (order: ServiceRequest) => {
    if (!quoteAmount || !quoteDetails) {
      toast.error("Completá monto y detalle");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("service_requests")
      .update({
        status: "cotizada" as any,
        quoted_amount: Number(quoteAmount),
        quoted_details: quoteDetails,
        scheduled_date: scheduledDate || null,
        scheduled_time: scheduledTime ? scheduledTime + ":00" : null,
        responded_at: new Date().toISOString(),
      })
      .eq("id", order.id);
    setSaving(false);
    if (error) { toast.error("Error al cotizar"); return; }
    toast.success("Cotización enviada al cliente");
    setSelectedOrder(null);
    setQuoteAmount(""); setQuoteDetails(""); setScheduledDate(""); setScheduledTime("");
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
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <FileText className="h-4 w-4 text-accent" /> Cotización
              </p>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Monto ($)</label>
                <input type="number" value={quoteAmount} onChange={(e) => setQuoteAmount(e.target.value)} placeholder="25000"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Detalle</label>
                <textarea value={quoteDetails} onChange={(e) => setQuoteDetails(e.target.value)} placeholder="Materiales, mano de obra..." rows={3}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
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
                <Button onClick={() => handleReject(o)} disabled={saving} variant="outline" className="flex-1 gap-1 text-destructive border-destructive/30 hover:bg-destructive/10">
                  <XCircle className="h-4 w-4" /> Rechazar
                </Button>
                <Button onClick={() => handleSendQuote(o)} disabled={saving} className="flex-1 gap-1">
                  <Send className="h-4 w-4" /> {saving ? "Enviando..." : "Cotizar"}
                </Button>
              </div>
            </div>
          )}

          {/* Cotizada: waiting */}
          {o.status === "cotizada" && o.quoted_amount && (
            <div className="space-y-2">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Tu cotización</p>
                <p className="text-lg font-display font-bold text-foreground">${Number(o.quoted_amount).toLocaleString("es-AR")}</p>
                {o.quoted_details && <p className="text-xs text-muted-foreground mt-1">{o.quoted_details}</p>}
              </div>
              <div className="rounded-lg bg-blue-500/10 p-3 text-center">
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">⏳ Esperando seña del cliente</p>
              </div>
            </div>
          )}

          {/* Aceptada: start service */}
          {o.status === "aceptada" && (
            <Button onClick={() => handleStartService(o)} disabled={saving} className="w-full gap-2">
              <CheckCircle2 className="h-4 w-4" /> Iniciar Servicio
            </Button>
          )}

          {/* En servicio: finalize */}
          {o.status === "en_servicio" && (
            <Button onClick={() => handleFinalize(o)} disabled={saving} className="w-full gap-2 bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="h-4 w-4" /> Finalizar Trabajo
            </Button>
          )}

          {/* Finalizada */}
          {o.status === "finalizada" && (
            <div className="rounded-lg bg-green-500/10 p-3 text-center">
              <p className="text-sm font-semibold text-green-700 dark:text-green-300">✅ Trabajo finalizado</p>
            </div>
          )}
        </CardContent>
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
        {/* Status tabs with colored dots */}
        <div className="flex gap-2 pt-2 overflow-x-auto">
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
        ) : (
          filtered.map((order) => (
            <button
              key={order.id}
              onClick={() => {
                setSelectedOrder(order);
                setQuoteAmount(order.quoted_amount?.toString() || "");
                setQuoteDetails(order.quoted_details || "");
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
    cotizada: { label: "Espera Seña", className: "bg-blue-500/20 text-blue-700 dark:text-blue-300" },
    aceptada: { label: "Confirmado", className: "bg-green-500/20 text-green-700 dark:text-green-300" },
    en_servicio: { label: "En Servicio", className: "bg-green-600/20 text-green-800 dark:text-green-200" },
    finalizada: { label: "Finalizado", className: "bg-muted text-muted-foreground" },
  };
  const c = config[status];
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.className}`}>{c.label}</span>;
};

export default AgendaOrders;
