import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, ShieldCheck, ShieldX, ArrowLeft, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type Status = "pendiente" | "en_revision" | "verificado" | "rechazado";

interface Row {
  user_id: string;
  full_name: string;
  rubro: string;
  dni_front_url: string | null;
  dni_back_url: string | null;
  dni_verification_status: Status;
  dni_rejection_reason: string | null;
  dni_submitted_at: string | null;
}

const signedFor = async (path: string | null) => {
  if (!path) return null;
  const { data } = await supabase.storage
    .from("dni-verifications")
    .createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
};

const STATUS_LABEL: Record<Status, string> = {
  pendiente: "Pendiente",
  en_revision: "En revisión",
  verificado: "Verificadas",
  rechazado: "Rechazadas",
};

const AdminDniVerifications = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const [tab, setTab] = useState<Status>("en_revision");
  const [rows, setRows] = useState<Row[]>([]);
  const [previews, setPreviews] = useState<Record<string, { front: string | null; back: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [reasonByUser, setReasonByUser] = useState<Record<string, string>>({});
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    if (!roleLoading && !isAdmin) navigate("/dashboard");
  }, [isAdmin, roleLoading, navigate]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("professional_profiles")
      .select("user_id, full_name, rubro, dni_front_url, dni_back_url, dni_verification_status, dni_rejection_reason, dni_submitted_at")
      .eq("dni_verification_status", tab)
      .order("dni_submitted_at", { ascending: false, nullsFirst: false });
    if (error) {
      toast.error("Error al cargar verificaciones");
      setLoading(false);
      return;
    }
    const list = (data || []) as Row[];
    setRows(list);

    const previewEntries = await Promise.all(
      list.map(async (r) => {
        const [front, back] = await Promise.all([signedFor(r.dni_front_url), signedFor(r.dni_back_url)]);
        return [r.user_id, { front, back }] as const;
      })
    );
    setPreviews(Object.fromEntries(previewEntries));
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, tab]);

  const verify = async (row: Row) => {
    setActingId(row.user_id);
    const { error } = await supabase
      .from("professional_profiles")
      .update({
        dni_verification_status: "verificado",
        dni_rejection_reason: null,
        verified: true,
      } as any)
      .eq("user_id", row.user_id);
    setActingId(null);
    if (error) return toast.error("No se pudo verificar");
    toast.success(`${row.full_name} verificado`);
    load();
  };

  const reject = async (row: Row) => {
    const reason = (reasonByUser[row.user_id] || "").trim();
    if (!reason) return toast.error("Indicá un motivo para el rechazo");
    setActingId(row.user_id);
    const { error } = await supabase
      .from("professional_profiles")
      .update({
        dni_verification_status: "rechazado",
        dni_rejection_reason: reason,
        verified: false,
      } as any)
      .eq("user_id", row.user_id);
    setActingId(null);
    if (error) return toast.error("No se pudo rechazar");
    toast.success(`${row.full_name} rechazado`);
    setReasonByUser((s) => ({ ...s, [row.user_id]: "" }));
    load();
  };

  if (roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <h1 className="font-semibold">Verificaciones de identidad</h1>
          <Button variant="ghost" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-4 py-6">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Status)}>
          <TabsList className="grid w-full grid-cols-4">
            {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
              <TabsTrigger key={s} value={s}>{STATUS_LABEL[s]}</TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={tab} className="mt-6 space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : rows.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No hay profesionales en esta categoría.
              </p>
            ) : (
              rows.map((row) => {
                const p = previews[row.user_id] || { front: null, back: null };
                const acting = actingId === row.user_id;
                return (
                  <div key={row.user_id} className="rounded-2xl border bg-card p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{row.full_name || "Sin nombre"}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.rubro || "Sin rubro"} · enviado{" "}
                          {row.dni_submitted_at
                            ? new Date(row.dni_submitted_at).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" })
                            : "—"}
                        </p>
                      </div>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                        {STATUS_LABEL[row.dni_verification_status]}
                      </span>
                    </div>

                    {row.dni_rejection_reason && (
                      <p className="mt-2 text-xs text-destructive">Motivo previo: {row.dni_rejection_reason}</p>
                    )}

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {(["front", "back"] as const).map((side) => (
                        <div key={side}>
                          <p className="mb-1 text-xs font-medium text-muted-foreground">
                            {side === "front" ? "Frente" : "Dorso"}
                          </p>
                          {p[side] ? (
                            <a href={p[side]!} target="_blank" rel="noreferrer" className="block">
                              <img
                                src={p[side]!}
                                alt={`DNI ${side}`}
                                className="h-40 w-full rounded-lg border object-cover transition hover:opacity-90"
                              />
                            </a>
                          ) : (
                            <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
                              Sin foto
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {tab !== "verificado" && (
                      <div className="mt-4 space-y-2">
                        <Textarea
                          placeholder="Motivo del rechazo (obligatorio para rechazar)"
                          value={reasonByUser[row.user_id] || ""}
                          onChange={(e) => setReasonByUser((s) => ({ ...s, [row.user_id]: e.target.value }))}
                          rows={2}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button onClick={() => verify(row)} disabled={acting} size="sm">
                            {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                            Verificar
                          </Button>
                          <Button onClick={() => reject(row)} disabled={acting} size="sm" variant="destructive">
                            {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldX className="h-4 w-4" />}
                            Rechazar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDniVerifications;
