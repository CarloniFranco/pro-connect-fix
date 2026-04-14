import { Clock, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface Appointment {
  id: string;
  time: string;
  client: string;
  service: string;
  address: string;
}

const mockAppointments: Appointment[] = [
  { id: "1", time: "09:00", client: "María López", service: "Plomería", address: "Av. Corrientes 1234" },
  { id: "2", time: "11:30", client: "Carlos García", service: "Electricidad", address: "Calle Florida 567" },
  { id: "3", time: "14:00", client: "Ana Martínez", service: "Gas", address: "Av. Santa Fe 890" },
  { id: "4", time: "16:30", client: "Pedro Ruiz", service: "Plomería", address: "Calle Lavalle 321" },
];

const DayAgenda = () => {
  const today = new Date();
  const dayName = today.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <Clock className="h-5 w-5 text-primary" />
          Agenda del Día
        </CardTitle>
        <p className="text-sm capitalize text-muted-foreground">{dayName}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {mockAppointments.map((apt) => (
          <div
            key={apt.id}
            className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3"
          >
            <div className="flex h-10 w-14 flex-shrink-0 items-center justify-center rounded-md bg-primary font-display text-sm font-bold text-primary-foreground">
              {apt.time}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{apt.client}</p>
              <p className="text-xs text-muted-foreground">{apt.service}</p>
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{apt.address}</span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default DayAgenda;
