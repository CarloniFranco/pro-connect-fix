import { useEffect, useState } from "react";
import { ClipboardList, Loader2, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import RequestDetail from "./RequestDetail";

type OrderStatus = "nueva" | "cotizada" | "aceptada" | "en_servicio" | "finalizada";

export interface ServiceRequest {
  id: string;
  professional_id: string;
  client_name: string;
  client_phone: string;
  client_address: string;
  client_user_id: string | null;
  service_type: string;
  description: string;
  status: OrderStatus;
  quoted_amount: number | null;
  quoted_details: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  estimated_duration: number | null;
  created_at: string;
}

const statusConfig: Record<OrderStatus, { label: string; variant: "pending" | "inProgress" | "done" | "default" | "secondary" }> = {
  nueva: { label: "Nueva", variant: "secondary" },
  cotizada: { label: "Cotizada", variant: "pending" },
  aceptada: { label: "Aceptada", variant: "inProgress" },
  en_servicio: { label: "En Servicio", variant: "default" },
  finalizada: { label: "Finalizada", variant: "done" },
};

const filterOptions: { value: OrderStatus | "todos"; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "nueva", label: "Nuevas" },
  { value: "cotizada", label: "Cotizadas" },
  { value: "aceptada", label: "Aceptadas" },
  { value: "en_servicio", label: "En Servicio" },
  { value: "finalizada", label: "Finalizadas" },
];

const WorkOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | "todos">("todos");
  const [selectedOrder, setSelectedOrder] = useState<ServiceRequest | null>(null);

  const fetchOrders = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("service_requests")
      .select("*")
      .eq("professional_id", user.id)
      .order("created_at", { ascending: false });
    setOrders((data as ServiceRequest[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    fetchOrders();

    const channel = supabase
      .channel("orders-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "service_requests", filter: `professional_id=eq.${user.id}` }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const filtered = filter === "todos" ? orders : orders.filter((o) => o.status === filter);

  if (selectedOrder) {
    return (
      <RequestDetail
        request={selectedOrder}
        onBack={() => { setSelectedOrder(null); fetchOrders(); }}
      />
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <ClipboardList className="h-5 w-5 text-secondary" />
          Órdenes de Trabajo
        </CardTitle>
        <div className="flex flex-wrap gap-2 pt-2">
          {filterOptions.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                filter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No hay órdenes en esta categoría</p>
        ) : (
          filtered.map((order) => (
            <button
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              className="w-full rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/30"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-display text-xs font-bold text-muted-foreground">
                  {new Date(order.created_at).toLocaleDateString("es-AR")}
                </span>
                <Badge variant={statusConfig[order.status].variant}>
                  {statusConfig[order.status].label}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{order.client_name}</p>
                  <p className="text-xs text-muted-foreground">{order.service_type} — {order.description.slice(0, 50)}{order.description.length > 50 ? "…" : ""}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default WorkOrders;
