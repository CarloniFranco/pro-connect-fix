import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, DollarSign } from "lucide-react";
import { toast } from "sonner";

const KEYS = {
  basico: "plan_price_basico",
  premium: "plan_price_premium",
} as const;

const AdminPlanPrices = () => {
  const [basico, setBasico] = useState("");
  const [premium, setPremium] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"basico" | "premium" | null>(null);

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

  const save = async (which: "basico" | "premium", raw: string) => {
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Ingresá un monto válido en pesos");
      return;
    }
    setSaving(which);
    const { error } = await supabase
      .from("app_config")
      .upsert({ key: KEYS[which], value: String(Math.round(amount)) }, { onConflict: "key" });
    setSaving(null);
    if (error) {
      toast.error("No se pudo guardar: " + error.message);
    } else {
      toast.success(`Precio del plan ${which === "basico" ? "Básico" : "Premium"} actualizado`);
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <h2 className="font-display text-2xl font-bold flex items-center gap-2">
        <DollarSign className="h-6 w-6 text-primary" />
        Precios de Suscripción
      </h2>
      <p className="text-sm text-muted-foreground mt-1">
        Cambiá los montos mensuales en ARS. Los nuevos profesionales que se suscriban verán y pagarán este precio en Mercado Pago.
        Las suscripciones ya activas mantienen el monto con el que fueron creadas.
      </p>

      <div className="mt-6 space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Plan Básico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label htmlFor="basico">Monto mensual (ARS)</Label>
            <div className="flex gap-2">
              <Input
                id="basico"
                type="number"
                inputMode="numeric"
                min={1}
                value={basico}
                onChange={(e) => setBasico(e.target.value)}
              />
              <Button onClick={() => save("basico", basico)} disabled={saving === "basico"} className="gap-2">
                {saving === "basico" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Plan Premium</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label htmlFor="premium">Monto mensual (ARS)</Label>
            <div className="flex gap-2">
              <Input
                id="premium"
                type="number"
                inputMode="numeric"
                min={1}
                value={premium}
                onChange={(e) => setPremium(e.target.value)}
              />
              <Button onClick={() => save("premium", premium)} disabled={saving === "premium"} className="gap-2">
                {saving === "premium" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPlanPrices;
