import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ShieldCheck, ShieldAlert, ShieldQuestion, Loader2, Upload, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type Status = "pendiente" | "en_revision" | "verificado" | "rechazado";

const STATUS_META: Record<Status, { label: string; tone: string; icon: typeof ShieldCheck; description: string }> = {
  pendiente: {
    label: "Sin verificar",
    tone: "bg-amber-50 text-amber-900 border-amber-200",
    icon: ShieldAlert,
    description: "Subí una foto de tu DNI (frente y dorso) para que validemos tu identidad. Es obligatorio para operar.",
  },
  en_revision: {
    label: "En revisión",
    tone: "bg-blue-50 text-blue-900 border-blue-200",
    icon: ShieldQuestion,
    description: "Recibimos tus fotos. Nuestro equipo está revisando tu identidad — suele demorar menos de 24hs.",
  },
  verificado: {
    label: "Identidad verificada",
    tone: "bg-green-50 text-green-900 border-green-200",
    icon: CheckCircle2,
    description: "Tu identidad fue validada. Los clientes ven el sello de profesional verificado en tu perfil.",
  },
  rechazado: {
    label: "Verificación rechazada",
    tone: "bg-red-50 text-red-900 border-red-200",
    icon: ShieldAlert,
    description: "Tus fotos no pudieron validarse. Volvé a subirlas asegurándote de que se vean nítidas y completas.",
  },
};

const MAX_SIZE = 5 * 1024 * 1024;

const DniVerificationCard = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>("pendiente");
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [hasFront, setHasFront] = useState(false);
  const [hasBack, setHasBack] = useState(false);
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("professional_profiles")
      .select("dni_verification_status, dni_rejection_reason, dni_front_url, dni_back_url")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setStatus(((data as any).dni_verification_status as Status) || "pendiente");
          setRejectionReason((data as any).dni_rejection_reason || null);
          setHasFront(Boolean((data as any).dni_front_url));
          setHasBack(Boolean((data as any).dni_back_url));
        }
        setLoading(false);
      });
  }, [user]);

  const pickFile = (setter: (f: File | null) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Solo se aceptan imágenes (JPG/PNG)");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("La imagen no puede superar los 5MB");
      return;
    }
    setter(file);
  };

  const uploadOne = async (file: File, side: "front" | "back") => {
    if (!user) throw new Error("No user");
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/dni-${side}.${ext}`;
    const { error } = await supabase.storage
      .from("dni-verifications")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    return path;
  };

  const submit = async () => {
    if (!user) return;
    if (!front && !hasFront) return toast.error("Subí la foto del frente del DNI");
    if (!back && !hasBack) return toast.error("Subí la foto del dorso del DNI");
    setSaving(true);
    try {
      const updates: Record<string, any> = {
        dni_verification_status: "en_revision",
        dni_submitted_at: new Date().toISOString(),
        dni_rejection_reason: null,
      };
      if (front) updates.dni_front_url = await uploadOne(front, "front");
      if (back) updates.dni_back_url = await uploadOne(back, "back");

      const { error } = await supabase
        .from("professional_profiles")
        .update(updates as any)
        .eq("user_id", user.id);
      if (error) throw error;

      setStatus("en_revision");
      setRejectionReason(null);
      setHasFront(true);
      setHasBack(true);
      setFront(null);
      setBack(null);
      toast.success("¡Listo! Enviamos tu DNI a revisión.");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "No pudimos subir tu DNI");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  const meta = STATUS_META[status];
  const Icon = meta.icon;
  const canEdit = status !== "verificado";
  const needsResubmit = status === "rechazado" || status === "pendiente";

  return (
    <div className={`rounded-2xl border p-4 sm:p-5 ${meta.tone}`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">Verificación de identidad</p>
            <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium">{meta.label}</span>
          </div>
          <p className="mt-1 text-sm opacity-90">{meta.description}</p>
          {status === "rechazado" && rejectionReason && (
            <p className="mt-2 text-sm font-medium">Motivo: {rejectionReason}</p>
          )}
        </div>
      </div>

      {canEdit && (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="dni-front" className="text-xs font-medium">
                Frente del DNI {hasFront && !front && <span className="text-green-700">(cargado)</span>}
              </Label>
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-current/30 bg-white/60 p-2">
                <Upload className="h-4 w-4 opacity-60" />
                <input
                  id="dni-front"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={pickFile(setFront)}
                  className="w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-2 file:py-1 file:text-xs file:font-medium file:text-primary-foreground"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dni-back" className="text-xs font-medium">
                Dorso del DNI {hasBack && !back && <span className="text-green-700">(cargado)</span>}
              </Label>
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-current/30 bg-white/60 p-2">
                <Upload className="h-4 w-4 opacity-60" />
                <input
                  id="dni-back"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={pickFile(setBack)}
                  className="w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-2 file:py-1 file:text-xs file:font-medium file:text-primary-foreground"
                />
              </div>
            </div>
          </div>
          <Button
            onClick={submit}
            disabled={saving || (!front && !back && !needsResubmit)}
            size="sm"
            className="w-full sm:w-auto"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                Enviar a verificación
              </>
            )}
          </Button>
          <p className="text-xs opacity-75">
            Tus fotos son privadas — solo nuestro equipo de verificación las puede ver.
          </p>
        </div>
      )}
    </div>
  );
};

export default DniVerificationCard;
