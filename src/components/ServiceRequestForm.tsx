import { useState, useEffect } from "react";
import { CalendarDays, Clock, Send, Loader2, Car, Wrench, DollarSign, ParkingCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ServiceItem {
  name: string;
  prices: Record<string, number>;
}

interface ServiceRequestFormProps {
  professionalId: string;
  professionalName: string;
  rubro: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: string;
  initialTime?: string;
}

interface AvailabilitySlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export default function ServiceRequestForm({
  professionalId,
  professionalName,
  rubro,
  open,
  onOpenChange,
  initialDate,
  initialTime,
}: ServiceRequestFormProps) {
  const { user } = useAuth();
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<{ slot_date: string; slot_time: string; slot_status: string }[]>([]);
  const [workStations, setWorkStations] = useState(1);
  const [proServices, setProServices] = useState<ServiceItem[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [vehicleType, setVehicleType] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [clientProfile, setClientProfile] = useState<{ full_name: string; phone: string; address: string } | null>(null);

  useEffect(() => {
    if (!open) return;

    // Pre-fill date/time when provided
    if (initialDate) setSelectedDate(initialDate);
    if (initialTime) setSelectedTime(initialTime);

    supabase
      .from("professional_availability")
      .select("day_of_week, start_time, end_time")
      .eq("professional_id", professionalId)
      .eq("is_active", true)
      .then(({ data }) => setAvailability(data || []));

    supabase
      .from("professional_profiles")
      .select("work_stations, services, vehicle_types")
      .eq("user_id", professionalId)
      .maybeSingle()
      .then(({ data }) => {
        const d = data as any;
        setWorkStations(d?.work_stations || 1);
        setProServices(Array.isArray(d?.services) ? (d.services as ServiceItem[]) : []);
        setVehicleTypes(d?.vehicle_types || []);
      });

    const today = new Date().toISOString().split("T")[0];
    const future = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
    supabase
      .from("blocked_slots")
      .select("slot_date, slot_time, slot_end_time, slot_status")
      .eq("professional_id", professionalId)
      .gte("slot_date", today)
      .lte("slot_date", future)
      .then(({ data }) => setBlockedSlots((data as any) || []));

    if (user) {
      supabase
        .from("client_profiles")
        .select("full_name, phone, address")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => setClientProfile(data));
    }
  }, [open, professionalId, user, initialDate, initialTime]);

  const availableDates = (() => {
    const dates: { date: string; label: string; dayOfWeek: number }[] = [];
    const availableDays = new Set(availability.map((a) => a.day_of_week));
    for (let i = 0; i <= 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dow = d.getDay();
      if (availableDays.has(dow)) {
        dates.push({
          date: d.toISOString().split("T")[0],
          label: i === 0 ? "Hoy" : `${DAYS[dow]} ${d.getDate()}/${d.getMonth() + 1}`,
          dayOfWeek: dow,
        });
      }
      if (dates.length >= 14) break;
    }
    return dates;
  })();

  const timeSlots = (() => {
    if (!selectedDate) return [] as { time: string; taken: boolean }[];
    const d = new Date(selectedDate + "T00:00:00");
    const dow = d.getDay();
    const dayAvailability = availability.filter((a) => a.day_of_week === dow);

    const occupiedCount = new Map<string, number>();
    blockedSlots
      .filter((b) => b.slot_date === selectedDate && (b.slot_status === "paid" || b.slot_status === "pending" || b.slot_status === "manual_block"))
      .forEach((b) => {
        const key = b.slot_time.slice(0, 5);
        occupiedCount.set(key, (occupiedCount.get(key) || 0) + 1);
      });

    const slots: { time: string; taken: boolean }[] = [];
    dayAvailability.forEach((slot) => {
      const [startH, startM] = slot.start_time.split(":").map(Number);
      const [endH, endM] = slot.end_time.split(":").map(Number);
      let h = startH, m = startM;
      while (h < endH || (h === endH && m < endM)) {
        const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        const taken = (occupiedCount.get(timeStr) || 0) >= workStations;
        slots.push({ time: timeStr, taken });
        m += 60;
        if (m >= 60) { h++; m = 0; }
      }
    });
    return slots;
  })();

  // Pricing
  const selectedService = proServices.find((s) => s.name === serviceName);
  const totalPrice = selectedService && vehicleType ? selectedService.prices[vehicleType] || 0 : 0;
  const depositAmount = Math.round(totalPrice * 0.1);

  const handleSubmit = async () => {
    if (!user) { toast.error("Debés iniciar sesión"); return; }
    if (!selectedDate || !selectedTime) { toast.error("Seleccioná día y hora"); return; }
    if (!vehicleType) { toast.error("Seleccioná el tipo de vehículo"); return; }
    if (!serviceName) { toast.error("Seleccioná un tipo de lavado"); return; }
    if (totalPrice <= 0) { toast.error("Este servicio no tiene precio cargado para ese vehículo"); return; }

    setLoading(true);
    const { data: inserted, error } = await supabase
      .from("service_requests")
      .insert({
        professional_id: professionalId,
        client_user_id: user.id,
        client_name: clientProfile?.full_name || user.email?.split("@")[0] || "Cliente",
        client_phone: clientProfile?.phone || null,
        client_address: clientProfile?.address || null,
        service_type: `${serviceName} (${vehicleType})`,
        description: description.trim(),
        scheduled_date: selectedDate,
        scheduled_time: selectedTime + ":00",
        quoted_amount: totalPrice,
        deposit_amount: depositAmount,
        deposit_paid: true,
        status: "aceptada",
        responded_at: new Date().toISOString(),
      } as any)
      .select("id")
      .single();

    if (error || !inserted) {
      setLoading(false);
      console.error(error);
      toast.error("Error al confirmar la reserva");
      return;
    }

    // Block the slot so nobody else can book it
    const { error: slotError } = await supabase.from("blocked_slots").insert({
      professional_id: professionalId,
      service_request_id: inserted.id,
      slot_date: selectedDate,
      slot_time: selectedTime + ":00",
      slot_status: "paid",
    } as any);
    if (slotError) console.error("blocked_slots error:", slotError);

    setLoading(false);
    toast.success("¡Turno confirmado! La seña quedó registrada.");
    onOpenChange(false);
    setDescription("");
    setSelectedDate("");
    setSelectedTime("");
    setVehicleType("");
    setServiceName("");
  };

  const noServicesConfigured = proServices.length === 0 || vehicleTypes.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5 text-primary" />
            Reservar turno
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{professionalName}</span>
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {noServicesConfigured && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              Este profesional aún no configuró sus servicios y precios.
            </div>
          )}

          {/* Vehicle type */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              <Car className="inline h-3 w-3 mr-1" /> Tipo de vehículo
            </label>
            <Select value={vehicleType} onValueChange={setVehicleType} disabled={vehicleTypes.length === 0}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccioná tu vehículo..." />
              </SelectTrigger>
              <SelectContent>
                {vehicleTypes.map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Service */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              <Wrench className="inline h-3 w-3 mr-1" /> Tipo de lavado
            </label>
            <Select value={serviceName} onValueChange={setServiceName} disabled={proServices.length === 0}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccioná un servicio..." />
              </SelectTrigger>
              <SelectContent>
                {proServices.map((s) => {
                  const p = vehicleType ? s.prices[vehicleType] : null;
                  return (
                    <SelectItem key={s.name} value={s.name}>
                      {s.name}{p ? ` — $${p.toLocaleString("es-AR")}` : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Price summary */}
          {totalPrice > 0 && (
            <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-3 space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Precio total</span>
                <span className="font-bold text-foreground">${totalPrice.toLocaleString("es-AR")}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Seña (10%)</span>
                <span className="font-bold text-primary">${depositAmount.toLocaleString("es-AR")}</span>
              </div>
              <p className="text-[10px] text-muted-foreground pt-1 border-t border-primary/20">
                El resto (${(totalPrice - depositAmount).toLocaleString("es-AR")}) se paga al finalizar el servicio.
              </p>
            </div>
          )}

          {/* Date */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-muted-foreground">
              <CalendarDays className="inline h-3 w-3 mr-1" /> Día
            </label>
            {availableDates.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-lg bg-muted/50 p-3 text-center">
                Sin horarios configurados.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableDates.map((d) => (
                  <button
                    key={d.date}
                    onClick={() => { setSelectedDate(d.date); setSelectedTime(""); }}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                      selectedDate === d.date
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-card-foreground hover:border-primary/50"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Time */}
          {selectedDate && (
            <div>
              <label className="mb-2 block text-xs font-semibold text-muted-foreground">
                <Clock className="inline h-3 w-3 mr-1" /> Horario
              </label>
              {timeSlots.length === 0 ? (
                <p className="text-sm text-muted-foreground rounded-lg bg-muted/50 p-3 text-center">
                  Sin horarios disponibles.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {timeSlots.map(({ time: t, taken }) => (
                    <button
                      key={t}
                      onClick={() => !taken && setSelectedTime(t)}
                      disabled={taken}
                      title={taken ? "Turno reservado por otro cliente" : undefined}
                      className={`relative rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                        taken
                          ? "border-border bg-muted text-muted-foreground line-through cursor-not-allowed opacity-70"
                          : selectedTime === t
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-card-foreground hover:border-primary/50"
                      }`}
                    >
                      {t}
                      {taken && <span className="ml-1 text-[10px] font-bold">· reservado</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Comments */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Comentarios adicionales (opcional)
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Aclaraciones sobre el estado del vehículo, manchas específicas, etc."
              rows={3}
              maxLength={1000}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading || !selectedDate || !selectedTime || !vehicleType || !serviceName || totalPrice <= 0}
            className="w-full gap-2"
            size="lg"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
            Confirmar turno y seña ${depositAmount > 0 ? depositAmount.toLocaleString("es-AR") : ""}
          </Button>

          <p className="text-[10px] text-muted-foreground text-center">
            El turno queda confirmado al instante. El resto se paga al finalizar el servicio. Próximamente: pago online con Mercado Pago.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
