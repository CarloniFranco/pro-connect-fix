import { useState } from "react";
import { ArrowLeft, User, Phone, MapPin, FileText, Send, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sendNotification } from "@/lib/notifications";
import type { ServiceRequest } from "./WorkOrders";

const VISITA_TECNICA_RUBROS = ["gas", "electricidad", "plomería", "plomeria", "calefacción", "calefaccion", "refrigeración", "refrigeracion"];

interface Props {
  request: ServiceRequest;
  rubro?: string;
  onBack: () => void;
}

const DURATION_OPTIONS = [
  { value: 0.5, label: "30 min" },
  { value: 1, label: "1 hora" },
  { value: 1.5, label: "1.5 horas" },
  { value: 2, label: "2 horas" },
  { value: 2.5, label: "2.5 horas" },
  { value: 3, label: "3 horas" },
  { value: 4, label: "4 horas" },
  { value: 5, label: "5 horas" },
  { value: 6, label: "6 horas" },
  { value: 8, label: "8 horas" },
];

const statusActions: Record<string, { next: string; label: string; nextLabel: string }> = {
  nueva: { next: "cotizada", label: "Enviar Cotización", nextLabel: "Cotizada" },
  cotizada: { next: "cotizada", label: "Esperando respuesta del cliente", nextLabel: "" },
  aceptada: { next: "en_servicio", label: "Iniciar Servicio", nextLabel: "En Servicio" },
  en_servicio: { next: "finalizada", label: "Marcar como Finalizado", nextLabel: "Finalizada" },
};

/** Generate blocked slot rows based on start time + duration */
function generateBlockedSlots(
  professionalId: string,
  serviceRequestId: string,
  date: string,
  startTime: string,
  durationHours: number
) {
  const slots: {
    professional_id: string;
    service_request_id: string;
    slot_date: string;
    slot_time: string;
    slot_end_time: string;
    slot_status: string;
    expires_at: string;
  }[] = [];

  const [h, m] = startTime.split(":").map(Number);
  const startMinutes = h * 60 + m;
  const totalMinutes = durationHours * 60;
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // Create one slot per hour block
  for (let offset = 0; offset < totalMinutes; offset += 60) {
    const slotStart = startMinutes + offset;
    const slotEnd = Math.min(startMinutes + totalMinutes, slotStart + 60);
    const sh = Math.floor(slotStart / 60);
    const sm = slotStart % 60;
    const eh = Math.floor(slotEnd / 60);
    const em = slotEnd % 60;

    slots.push({
      professional_id: professionalId,
      service_request_id: serviceRequestId,
      slot_date: date,
      slot_time: `${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}:00`,
      slot_end_time: `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}:00`,
      slot_status: "pending",
      expires_at: expires,
    });
  }
  return slots;
}

const RequestDetail = ({ request, rubro, onBack }: Props) => {
  const isVisitaTecnica = rubro
    ? VISITA_TECNICA_RUBROS.includes(rubro.toLowerCase())
    : false;

  const [quoteAmount, setQuoteAmount] = useState(request.quoted_amount?.toString() || "");
  const [quoteDetails, setQuoteDetails] = useState(
    request.quoted_details || (isVisitaTecnica ? "Relevamiento técnico y determinación de falla." : "")
  );
  const [scheduledDate, setScheduledDate] = useState(request.scheduled_date || "");
  const [scheduledTime, setScheduledTime] = useState(request.scheduled_time?.slice(0, 5) || "");
  const [estimatedDuration, setEstimatedDuration] = useState<number>(
    (request as any).estimated_duration || (isVisitaTecnica ? 1 : 1)
  );
  const [saving, setSaving] = useState(false);

  const action = statusActions[request.status];

  const handleSendQuote = async () => {
    if (!quoteAmount || !quoteDetails) {
      toast.error("Completá el monto y detalle de la cotización");
      return;
    }
    if (!estimatedDuration) {
      toast.error("Seleccioná la duración estimada del trabajo");
      return;
    }

    const finalDate = scheduledDate || request.scheduled_date;
    const finalTime = scheduledTime || request.scheduled_time?.slice(0, 5);

    if (!finalDate || !finalTime) {
      toast.error("Se necesita fecha y hora para bloquear el calendario");
      return;
    }

    setSaving(true);

    const finalDetails = isVisitaTecnica
      ? `${quoteDetails}\n\n⚠️ Este monto corresponde únicamente a la visita técnica y diagnóstico. El presupuesto de reparación final se entregará tras el relevamiento en el domicilio.`
      : quoteDetails;

    // 1. Update service request with quote + duration + mode
    const { error } = await supabase
      .from("service_requests")
      .update({
        status: "cotizada" as any,
        quoted_amount: Number(quoteAmount),
        quoted_details: finalDetails,
        scheduled_date: finalDate,
        scheduled_time: finalTime + ":00",
        estimated_duration: isVisitaTecnica ? 1 : estimatedDuration,
        responded_at: new Date().toISOString(),
        request_mode: isVisitaTecnica ? "visita_tecnica" : "servicio_directo",
      } as any)
      .eq("id", request.id);

    if (error) {
      setSaving(false);
      toast.error("Error al enviar cotización");
      return;
    }

    // 2. Auto-block calendar slots
    const blockedSlots = generateBlockedSlots(
      request.professional_id,
      request.id,
      finalDate,
      finalTime,
      isVisitaTecnica ? 1 : estimatedDuration
    );

    const { error: blockError } = await supabase
      .from("blocked_slots")
      .insert(blockedSlots as any);

    setSaving(false);

    if (blockError) {
      console.error("Error blocking slots:", blockError);
toast.warning("Presupuesto enviado, pero hubo un error al bloquear el calendario.");
    } else {
      toast.success("Presupuesto enviado. Notificación enviada al cliente dentro de la plataforma.");
    }

    // Notify client about the quote
    if (request.client_user_id) {
      const notifTitle = isVisitaTecnica ? "¡Visita técnica programada!" : "¡Presupuesto recibido!";
      const notifMsg = isVisitaTecnica
        ? `Te han enviado un costo de visita técnica por $${Number(quoteAmount).toLocaleString("es-AR")}. Confirmá tu turno pagando la seña.`
        : `Te han enviado un presupuesto por $${Number(quoteAmount).toLocaleString("es-AR")}. Entrá para revisarlo y confirmar tu turno.`;
      sendNotification({
        userId: request.client_user_id,
        type: "presupuesto_recibido",
        title: notifTitle,
        message: notifMsg,
        link: "/mis-pedidos",
        serviceRequestId: request.id,
      });
    }

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
              <FileText className="h-4 w-4 text-accent" />
              {isVisitaTecnica ? "Visita Técnica de Diagnóstico" : "Cotización"}
            </p>

            {isVisitaTecnica && (
              <div className="rounded-lg bg-accent/10 border border-accent/30 p-3">
                <p className="flex items-center gap-2 text-xs font-semibold text-accent-foreground">
                  <AlertTriangle className="h-3.5 w-3.5" /> Rubro técnico detectado
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Para {rubro}, se envía un costo de visita técnica y diagnóstico. El presupuesto final se entrega tras el relevamiento en domicilio.
                </p>
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                {isVisitaTecnica ? "Costo de visita y diagnóstico ($)" : "Monto total ($)"}
              </label>
              <input
                type="number"
                value={quoteAmount}
                onChange={(e) => setQuoteAmount(e.target.value)}
                placeholder={isVisitaTecnica ? "15000" : "25000"}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                {isVisitaTecnica ? "Concepto" : "Detalle"}
              </label>
              <textarea
                value={quoteDetails}
                onChange={(e) => setQuoteDetails(e.target.value)}
                placeholder={isVisitaTecnica ? "Relevamiento técnico y determinación de falla." : "Materiales, mano de obra, tiempo estimado..."}
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Duration selector - hidden for visits (fixed 1h) */}
            {isVisitaTecnica ? (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Duración: 1 hora (visita técnica)
                </p>
              </div>
            ) : (
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                  <Clock className="h-3 w-3" /> Duración estimada *
                </label>
                <div className="flex flex-wrap gap-2">
                  {DURATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setEstimatedDuration(opt.value)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        estimatedDuration === opt.value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-card-foreground hover:border-primary/50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

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

            {isVisitaTecnica && (
              <p className="text-[10px] text-muted-foreground leading-tight">
                ⚠️ Este monto corresponde únicamente a la visita técnica y diagnóstico. El presupuesto de reparación final se entregará tras el relevamiento en el domicilio.
              </p>
            )}

            <Button onClick={handleSendQuote} disabled={saving} className="w-full gap-2">
              <Send className="h-4 w-4" />
              {saving ? "Enviando..." : isVisitaTecnica ? "Enviar Visita Técnica" : "Enviar Cotización"}
            </Button>
          </div>
        )}

        {request.quoted_amount && request.status !== "nueva" && (
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Cotización enviada</p>
            <p className="text-lg font-display font-bold text-foreground">${Number(request.quoted_amount).toLocaleString("es-AR")}</p>
            {request.quoted_details && <p className="text-xs text-muted-foreground mt-1">{request.quoted_details}</p>}
            {(request as any).estimated_duration && (
              <p className="text-xs text-muted-foreground mt-1">
                ⏱️ Duración estimada: {(request as any).estimated_duration}h
              </p>
            )}
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
