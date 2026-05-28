import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Search, CheckCircle2, XCircle, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Pro {
  user_id: string;
  full_name: string;
  rubro: string;
  locality: string;
  province: string;
  verified: boolean;
  available: boolean;
  dni_verification_status: string;
  plan: string;
  created_at: string;
}

const AdminProfessionals = () => {
  const [list, setList] = useState<Pro[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Pro | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from("professional_profiles")
      .select("user_id, full_name, rubro, locality, province, verified, available, plan, created_at")
      .order("created_at", { ascending: false });
    const ids = (profiles || []).map((p: any) => p.user_id);
    const { data: verifs } = ids.length
      ? await supabase.from("professional_verification").select("user_id, dni_verification_status").in("user_id", ids)
      : { data: [] as any[] };
    const vMap = new Map<string, string>((verifs || []).map((v: any) => [v.user_id, v.dni_verification_status]));
    setList(((profiles as any[]) || []).map((p) => ({ ...p, dni_verification_status: vMap.get(p.user_id) || "pendiente" })) as Pro[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const t = q.toLowerCase().trim();
    if (!t) return list;
    return list.filter(
      (p) =>
        p.full_name?.toLowerCase().includes(t) ||
        p.rubro?.toLowerCase().includes(t) ||
        p.locality?.toLowerCase().includes(t) ||
        p.province?.toLowerCase().includes(t)
    );
  }, [list, q]);

  const toggleAvailable = async (p: Pro) => {
    setActing(p.user_id);
    const { error } = await supabase
      .from("professional_profiles")
      .update({ available: !p.available })
      .eq("user_id", p.user_id);
    setActing(null);
    if (error) return toast.error("No se pudo actualizar");
    toast.success(p.available ? "Profesional suspendido" : "Profesional reactivado");
    load();
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    const { data, error } = await supabase.functions.invoke("admin-delete-user", {
      body: { target_user_id: toDelete.user_id },
    });
    setDeleting(false);
    if (error || (data as any)?.error) {
      console.error("delete error", error, data);
      toast.error((data as any)?.error || "No se pudo eliminar la cuenta");
      return;
    }
    toast.success("Cuenta eliminada");
    setToDelete(null);
    load();
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">Profesionales</h2>
          <p className="text-sm text-muted-foreground">{filtered.length} de {list.length}</p>
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nombre, rubro o ciudad" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Rubro</th>
                <th className="px-4 py-3">Ubicación</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">DNI</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.user_id} className="border-t">
                  <td className="px-4 py-3 font-medium">{p.full_name || "Sin nombre"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.rubro || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{[p.locality, p.province].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-muted px-2 py-0.5 text-xs">{p.plan}</span></td>
                  <td className="px-4 py-3 text-xs">{p.dni_verification_status}</td>
                  <td className="px-4 py-3">
                    {p.available ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> Activo</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-destructive"><XCircle className="h-3.5 w-3.5" /> Suspendido</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <a href={`/profesional/${p.user_id}`} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline"><ExternalLink className="h-3.5 w-3.5" /></Button>
                      </a>
                      <Button size="sm" variant={p.available ? "destructive" : "default"} disabled={acting === p.user_id} onClick={() => toggleAvailable(p)}>
                        {acting === p.user_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : p.available ? "Suspender" : "Reactivar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setToDelete(p)}
                        title="Eliminar cuenta permanentemente"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">No hay resultados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta cuenta?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a borrar permanentemente la cuenta de{" "}
              <strong>{toDelete?.full_name || "este profesional"}</strong> y todos sus datos
              (perfil, suscripciones, pedidos, reseñas, credenciales). Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando…
                </>
              ) : (
                "Eliminar cuenta"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminProfessionals;
