import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Loader2, Save, DollarSign } from "lucide-react";
import { toast } from "sonner";

type PlanKey = "basico" | "premium";

const KEYS: Record<PlanKey, string> = {
  basico: "plan_price_basico",
  premium: "plan_price_premium",
};

const LABELS: Record<PlanKey, string> = {
  basico: "Básico",
  premium: "Premium",
};

const AdminPlanPrices = () => {
  const [basico, setBasico] = useState("");
  const [premium, setPremium] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<PlanKey | null>(null);
  const [dialog, setDialog] = useState<{ plan: PlanKey; price: number; count: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("app_config")
        .select("key, value")
        .in("key", [KEYS.basico, KEYS.premium]);
      if (error) {
        toast.error("No se pudieron cargar los precios");
      } else {
        (data || []).forEach((row: any) => {
          if (row.key === KEYS.basico) setBasico(String(row.value));
          if (row.key === KEYS.premium) setPremium(String(row.value));
        });
      }
      setLoading(false);
    })();
  }, []);

  const requestSave = async (which: PlanKey, raw: string) => {
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Ingresá un monto válido en pesos");
      return;
    }
    setSaving(which);
    try {
      const { data, error } = await supabase.functions.invoke("admin-update-plan-price", {
        body: { action: "count", plan_id: which },
      });
      if (error) throw error;
      setDialog({ plan: which, price: Math.round(amount), count: Number(data?.count ?? 0) });
    } catch (e: any) {
      toast.error("No se pudo verificar suscriptos: " + (e?.message ?? "error"));
    } finally {
      setSaving(null);
    }
  };

  const confirmApply = async () => {
    if (!dialog) return;
    const { plan, price } = dialog;
    setDialog(null);
    setSaving(plan);
    try {
      const { data, error } = await supabase.functions.invoke("admin-update-plan-price", {
        body: { action: "apply", plan_id: plan, new_price: price },
      });
      if (error) throw error;
      const notified = Number((data as any)?.notified ?? 0);
      toast.success(
        notified > 0
          ? `Precio actualizado. Notificamos a ${notified} profesional${notified === 1 ? "" : "es"}.`
          : "Precio actualizado.",
      );
    } catch (e: any) {
      toast.error("No se pudo aplicar el cambio: " + (e?.message ?? "error"));
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const renderCard = (plan: PlanKey, value: string, setValue: (v: string) => void) => (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Plan {LABELS[plan]}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Label htmlFor={plan}>Monto mensual (ARS)</Label>
        <div className="flex gap-2">
          <Input
            id={plan}
            type="number"
            inputMode="numeric"
            min={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <Button
            onClick={() => requestSave(plan, value)}
            disabled={saving === plan}
            className="gap-2"
          >
            {saving === plan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <h2 className="font-display text-2xl font-bold flex items-center gap-2">
        <DollarSign className="h-6 w-6 text-primary" />
        Precios de Suscripción
      </h2>
      <p className="text-sm text-muted-foreground mt-1">
        Cambiá los montos mensuales en ARS. Los nuevos profesionales pagan el nuevo precio desde el momento.
        A los ya suscriptos les avisamos por notificación y email, y el nuevo monto les aplica recién en el próximo ciclo de facturación.
      </p>

      <div className="mt-6 space-y-4">
        {renderCard("basico", basico, setBasico)}
        {renderCard("premium", premium, setPremium)}
      </div>

      <AlertDialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar cambio de precio</AlertDialogTitle>
            <AlertDialogDescription>
              {dialog && (
                <>
                  Este cambio de precio afectará a <strong>{dialog.count}</strong>{" "}
                  profesional{dialog.count === 1 ? "" : "es"} actualmente suscripto{dialog.count === 1 ? "" : "s"} al plan{" "}
                  <strong>{LABELS[dialog.plan]}</strong>. Recibirán una notificación informando que el nuevo precio
                  (${dialog.price.toLocaleString("es-AR")}) se aplicará en su próximo ciclo. ¿Confirmás el cambio?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmApply}>Confirmar cambio</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminPlanPrices;
