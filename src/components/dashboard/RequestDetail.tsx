import { useState } from "react";
import { ArrowLeft, User, Phone, MapPin, FileText, Send, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ServiceRequest } from "./WorkOrders";

interface Props {
  request: ServiceRequest;
  onBack: () => void;
}

const statusActions: Record<string, { next: string; label: string; nextLabel: string }> = {
  nueva: { next: "cotizada", label: "Enviar Cotización", nextLabel: "Cotizada" },
  cotizada: { next: "cotizada", label: "Esperando respuesta del cliente", nextLabel: "" },
  aceptada: { next: "en_servicio", label: "Iniciar Servicio", nextLabel: "En Servicio" },
  en_servicio: { next: "finalizada", label: "Marcar como Finalizado", nextLabel: "Finalizada" },
};

const RequestDetail = ({ request, onBack }: Props) => {
  const [quoteAmount, setQuoteAmount] = useState(request.quoted_amount?.toString() || "");
  const [quoteDetails, setQuoteDetails] = useState(request.quoted_details || "");
  const [scheduledDate, setScheduledDate] = useState(request.scheduled_date || "");
  const [scheduledTime, setScheduledTime] = useState(request.scheduled_time?.slice(0, 5) || "");
  const [saving, setSaving] = useState(false);

  const action = statusActions[request.status];

  const handleSendQuote = async () => {
    if (!quoteAmount || !quoteDetails) {
      toast.error("Completá el monto y detalle de la cotización");
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
      })
      .eq("id", request.id);
    setSaving(false);
    if (error) { toast.error("Error al enviar cotización"); return; }
    toast.success("Cotización enviada");
    onBack();
  };

  const handleAdvanceStatus = async () => {
    if (!action || !action.next || request.status === "cotizada") return;
    setSaving(true);
    const updates: any = { status: action.next };
    if (action.next === "finalizada") updates.completed_at = new Date().toISOString();
    const { error } = await supabase
      .from("service_requests")
      .update(updates)
      .eq("id", request.id);
    setSaving(false);
    if (error) { toast.error("Error al actualizar estado"); return; }
    toast.success(`Estado actualizado a: ${action.nextLabel}`);
    onBack();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <button onClick={onBack} className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Volver a órdenes
        </button>
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-lg">Solicitud</CardTitle>
          <Badge variant={request.status === "finalizada" ? "done" : request.status === "nueva" ? "secondary" : "inProgress"}>
            {request.status.replace("_", " ").replace(/^\w/, c => c.toUpperCase())}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-muted/40 p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <User className="h-4 w-4 text-primary" /> {request.client_name}
          </div>
          {request.client_phone && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" /> {request.client_phone}
            </div>
          )}
          {request.client_address && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" /> {request.client_address}
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1">Servicio</p>
          <p className="text-sm text-foreground">{request.service_type}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1">Descripción del problema</p>
          <p className="text-sm text-foreground">{request.description}</p>
        </div>

        {request.status === "nueva" && (
          <div className="space-y-3 rounded-lg border border-border p-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <FileText className="h-4 w-4 text-accent" /> Cotización
            </p>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Monto total ($)</label>
              <input
                type="number"
                value={quoteAmount}
                onChange={(e) => setQuoteAmount(e.target.value)}
                placeholder="25000"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Detalle</label>
              <textarea
                value={quoteDetails}
                onChange={(e) => setQuoteDetails(e.target.value)}
                placeholder="Materiales, mano de obra, tiempo estimado..."
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Fecha propuesta</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Hora propuesta</label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <Button onClick={handleSendQuote} disabled={saving} className="w-full gap-2">
              <Send className="h-4 w-4" /> {saving ? "Enviando..." : "Enviar Cotización"}
            </Button>
          </div>
        )}

        {request.quoted_amount && request.status !== "nueva" && (
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Cotización enviada</p>
            <p className="text-lg font-display font-bold text-foreground">${Number(request.quoted_amount).toLocaleString("es-AR")}</p>
            {request.quoted_details && <p className="text-xs text-muted-foreground mt-1">{request.quoted_details}</p>}
            {request.scheduled_date && (
              <p className="text-xs text-muted-foreground mt-1">
                📅 {new Date(request.scheduled_date + "T00:00:00").toLocaleDateString("es-AR")} {request.scheduled_time?.slice(0, 5) && `a las ${request.scheduled_time.slice(0, 5)}`}
              </p>
            )}
          </div>
        )}

        {request.status === "cotizada" && (
          <div className="rounded-lg bg-accent/10 p-3 text-center">
            <p className="text-sm font-semibold text-accent-foreground">⏳ Esperando confirmación del cliente</p>
          </div>
        )}

        {(request.status === "aceptada" || request.status === "en_servicio") && action && (
          <Button onClick={handleAdvanceStatus} disabled={saving} className="w-full gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {saving ? "Actualizando..." : action.label}
          </Button>
        )}

        {request.status === "finalizada" && (
          <div className="rounded-lg bg-[hsl(var(--pipe-green))]/10 p-3 text-center">
            <p className="text-sm font-semibold text-foreground">✅ Trabajo finalizado</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RequestDetail;
