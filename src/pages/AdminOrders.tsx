import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search } from "lucide-react";

interface Order {
  id: string;
  client_name: string;
  service_type: string;
  status: string;
  quoted_amount: number | null;
  deposit_paid: boolean | null;
  deposit_status: string;
  scheduled_date: string | null;
  created_at: string;
  professional_id: string;
}

const STATUSES = ["all", "nueva", "cotizada", "aceptada", "en_servicio", "finalizada", "rechazada_cliente", "rechazada_profesional"];

const AdminOrders = () => {
  const [list, setList] = useState<Order[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("service_requests")
      .select("id, client_name, service_type, status, quoted_amount, deposit_paid, deposit_status, scheduled_date, created_at, professional_id")
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data }) => {
        setList((data as Order[]) || []);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const t = q.toLowerCase().trim();
    return list.filter((o) => {
      if (status !== "all" && o.status !== status) return false;
      if (!t) return true;
      return o.client_name?.toLowerCase().includes(t) || o.service_type?.toLowerCase().includes(t);
    });
  }, [list, q, status]);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <h2 className="font-display text-2xl font-bold">Pedidos</h2>
      <p className="text-sm text-muted-foreground">{filtered.length} de {list.length} (últimos 500)</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por cliente o servicio" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s === "all" ? "Todos los estados" : s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Servicio</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Monto</th>
                <th className="px-4 py-3">Seña</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Creado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{o.client_name || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{o.service_type || "—"}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-muted px-2 py-0.5 text-xs">{o.status}</span></td>
                  <td className="px-4 py-3">{o.quoted_amount ? `$${Number(o.quoted_amount).toLocaleString("es-AR")}` : "—"}</td>
                  <td className="px-4 py-3 text-xs">{o.deposit_paid ? `✓ ${o.deposit_status}` : "—"}</td>
                  <td className="px-4 py-3 text-xs">{o.scheduled_date ? new Date(o.scheduled_date).toLocaleDateString("es-AR") : "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("es-AR")}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">Sin resultados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
