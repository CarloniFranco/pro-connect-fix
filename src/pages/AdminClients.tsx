import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";

interface Client {
  user_id: string;
  full_name: string;
  phone: string;
  address: string;
  gender: string;
  age: number | null;
  created_at: string;
}

const AdminClients = () => {
  const [list, setList] = useState<Client[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("client_profiles")
      .select("user_id, full_name, phone, address, gender, age, created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setList((data as Client[]) || []);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const t = q.toLowerCase().trim();
    if (!t) return list;
    return list.filter((c) => c.full_name?.toLowerCase().includes(t) || c.phone?.includes(t) || c.address?.toLowerCase().includes(t));
  }, [list, q]);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">Clientes</h2>
          <p className="text-sm text-muted-foreground">{filtered.length} de {list.length}</p>
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nombre, teléfono o dirección" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3">Dirección</th>
                <th className="px-4 py-3">Edad</th>
                <th className="px-4 py-3">Alta</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.user_id} className="border-t">
                  <td className="px-4 py-3 font-medium">{c.full_name || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.phone || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.address || "—"}</td>
                  <td className="px-4 py-3">{c.age ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("es-AR")}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="py-12 text-center text-sm text-muted-foreground">No hay resultados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminClients;
