import { useState } from "react";
import { ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type OrderStatus = "pendiente" | "en_proceso" | "finalizado";

interface WorkOrder {
  id: string;
  client: string;
  service: string;
  description: string;
  status: OrderStatus;
}

const initialOrders: WorkOrder[] = [
  { id: "OT-001", client: "María López", service: "Plomería", description: "Pérdida en cañería de cocina", status: "en_proceso" },
  { id: "OT-002", client: "Carlos García", service: "Electricidad", description: "Instalación de tablero eléctrico", status: "pendiente" },
  { id: "OT-003", client: "Ana Martínez", service: "Gas", description: "Revisión anual de calefón", status: "pendiente" },
  { id: "OT-004", client: "Laura Sánchez", service: "Plomería", description: "Destapación de desagüe", status: "finalizado" },
];

const statusConfig: Record<OrderStatus, { label: string; variant: "pending" | "inProgress" | "done" }> = {
  pendiente: { label: "Pendiente", variant: "pending" },
  en_proceso: { label: "En Proceso", variant: "inProgress" },
  finalizado: { label: "Finalizado", variant: "done" },
};

const statusOrder: OrderStatus[] = ["pendiente", "en_proceso", "finalizado"];

const WorkOrders = () => {
  const [orders, setOrders] = useState<WorkOrder[]>(initialOrders);
  const [filter, setFilter] = useState<OrderStatus | "todos">("todos");

  const filtered = filter === "todos" ? orders : orders.filter((o) => o.status === filter);

  const cycleStatus = (id: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        const idx = statusOrder.indexOf(o.status);
        return { ...o, status: statusOrder[(idx + 1) % statusOrder.length] };
      })
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <ClipboardList className="h-5 w-5 text-secondary" />
          Órdenes de Trabajo
        </CardTitle>
        <div className="flex flex-wrap gap-2 pt-2">
          {(["todos", ...statusOrder] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                filter === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {s === "todos" ? "Todos" : statusConfig[s].label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {filtered.map((order) => (
          <div
            key={order.id}
            className="rounded-lg border border-border p-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-display text-xs font-bold text-muted-foreground">{order.id}</span>
              <button onClick={() => cycleStatus(order.id)}>
                <Badge variant={statusConfig[order.status].variant}>
                  {statusConfig[order.status].label}
                </Badge>
              </button>
            </div>
            <p className="text-sm font-semibold text-foreground">{order.client}</p>
            <p className="text-xs text-muted-foreground">{order.service} — {order.description}</p>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">No hay órdenes en esta categoría</p>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkOrders;
