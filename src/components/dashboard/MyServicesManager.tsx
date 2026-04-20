import { useEffect, useState } from "react";
import { Plus, Trash2, Wrench, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function MyServicesManager() {
  const { user } = useAuth();
  const [services, setServices] = useState<string[]>([]);
  const [newService, setNewService] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("professional_profiles")
      .select("services")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setServices(((data as any)?.services as string[]) || []);
        setLoading(false);
      });
  }, [user]);

  const persist = async (next: string[]) => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("professional_profiles")
      .update({ services: next } as any)
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Error al guardar servicios");
      return false;
    }
    return true;
  };

  const handleAdd = async () => {
    const trimmed = newService.trim();
    if (!trimmed) return;
    if (services.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Ese servicio ya existe");
      return;
    }
    const next = [...services, trimmed];
    setServices(next);
    setNewService("");
    const ok = await persist(next);
    if (ok) toast.success("Servicio agregado");
  };

  const handleDelete = async (idx: number) => {
    const next = services.filter((_, i) => i !== idx);
    setServices(next);
    const ok = await persist(next);
    if (ok) toast.success("Servicio eliminado");
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Wrench className="h-5 w-5 text-primary" />
        <h2 className="font-display text-lg font-bold text-foreground">Mis Servicios</h2>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Definí los servicios que ofrecés. Los clientes los verán al solicitar un turno.
      </p>

      <div className="flex gap-2">
        <Input
          value={newService}
          onChange={(e) => setNewService(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="Ej: Lavado Completo"
          maxLength={60}
        />
        <Button onClick={handleAdd} disabled={saving || !newService.trim()} className="gap-1">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Agregar
        </Button>
      </div>

      <div className="mt-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : services.length === 0 ? (
          <p className="rounded-lg bg-muted/50 p-3 text-center text-sm text-muted-foreground">
            Todavía no agregaste servicios.
          </p>
        ) : (
          services.map((s, i) => (
            <div
              key={`${s}-${i}`}
              className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2"
            >
              <span className="text-sm font-medium text-foreground">{s}</span>
              <button
                onClick={() => handleDelete(i)}
                disabled={saving}
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                aria-label="Eliminar servicio"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
