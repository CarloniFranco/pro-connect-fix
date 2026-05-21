import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface Sub {
  id: string;
  user_id: string;
  provider: string;
  product_id: string | null;
  status: string;
  environment: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  created_at: string;
}

const AdminSubscriptions = () => {
  const [list, setList] = useState<(Sub & { pro_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("id, user_id, provider, product_id, status, environment, current_period_end, cancel_at_period_end, created_at")
        .order("created_at", { ascending: false });
      const ids = (subs || []).map((s) => s.user_id);
      const { data: pros } = ids.length
        ? await supabase.from("professional_profiles").select("user_id, full_name").in("user_id", ids)
        : { data: [] as any[] };
      const nameMap = new Map<string, string>((pros || []).map((p: any) => [p.user_id, p.full_name]));
      setList((subs || []).map((s) => ({ ...s, pro_name: nameMap.get(s.user_id) })) as any);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <h2 className="font-display text-2xl font-bold">Suscripciones</h2>
      <p className="text-sm text-muted-foreground">{list.length} total</p>

      {loading ? (
        <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Profesional</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Proveedor</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Entorno</th>
                <th className="px-4 py-3">Renueva</th>
                <th className="px-4 py-3">Alta</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{s.pro_name || s.user_id.slice(0, 8)}</td>
                  <td className="px-4 py-3">{s.product_id || "—"}</td>
                  <td className="px-4 py-3 text-xs">{s.provider}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${s.status === "active" || s.status === "authorized" ? "bg-emerald-100 text-emerald-700" : "bg-muted"}`}>
                      {s.status}{s.cancel_at_period_end ? " (cancela)" : ""}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">{s.environment}</td>
                  <td className="px-4 py-3 text-xs">{s.current_period_end ? new Date(s.current_period_end).toLocaleDateString("es-AR") : "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString("es-AR")}</td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">Sin suscripciones</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminSubscriptions;
