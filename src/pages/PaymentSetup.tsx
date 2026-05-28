import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CreditCard, ShieldCheck, ArrowLeft, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const PaymentSetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const state = location.state as {
    planId: string;
    planName: string;
    billing: string;
    fullPrice: number;
  } | null;

  const [loading, setLoading] = useState(false);

  if (!state) {
    navigate("/seleccionar-plan");
    return null;
  }

  const handleSubscribe = async () => {
    if (!user) {
      toast.error("Debés iniciar sesión");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("mp-create-subscription", {
        body: { plan_id: state.planId },
      });
      const detail = (data as any)?.error || (data as any)?.detail;
      if (error || !data?.init_point) {
        console.error("MP subscription error:", error, data);
        toast.error(
          detail
            ? `Mercado Pago: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`
            : "No se pudo iniciar la suscripción en Mercado Pago. Probá de nuevo en unos minutos."
        );
        setLoading(false);
        return;
      }
      toast.success("Redirigiendo a Mercado Pago…");
      window.location.href = data.init_point as string;
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ? `Error: ${e.message}` : "Ocurrió un error. Intentá de nuevo.");
      setLoading(false);
    }
  };

  const priceLabel =
    state.billing === "anual"
      ? `$${state.fullPrice.toLocaleString("es-AR")}/año`
      : `$${state.fullPrice.toLocaleString("es-AR")}/mes`;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div
       
       
        className="w-full max-w-md"
      >
        <button
          onClick={() => navigate("/seleccionar-plan")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a planes
        </button>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <CreditCard className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-card-foreground">
                Activar suscripción
              </h1>
              <p className="text-xs text-muted-foreground">
                Plan {state.planName} · {state.billing === "anual" ? "Anual" : "Mensual"} · {priceLabel}
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 mb-6 flex items-start gap-2">
            <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-primary">
                Pago seguro con Mercado Pago
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Te llevamos a Mercado Pago para que actives tu suscripción mensual. Podés pagar con tarjeta de crédito, débito o dinero en cuenta. Cancelás cuando quieras desde tu panel.
              </p>
            </div>
          </div>

          <Button onClick={handleSubscribe} disabled={loading} className="w-full gap-2" size="lg">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4" />
            )}
            {loading ? "Conectando con Mercado Pago…" : "Continuar con Mercado Pago"}
          </Button>

          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            Al continuar aceptás los términos del servicio y autorizás el débito mensual recurrente vía Mercado Pago.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSetup;
