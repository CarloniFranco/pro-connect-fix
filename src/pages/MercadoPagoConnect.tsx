import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, ArrowLeft, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const MercadoPagoConnect = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (user) loadStatus();
  }, [user, authLoading]);

  const loadStatus = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("professional_profiles")
      .select("mp_connected")
      .eq("user_id", user.id)
      .maybeSingle();
    setConnected(!!data?.mp_connected);
    setLoading(false);
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("mp-oauth-start");
      if (error) throw error;
      if (!data?.auth_url) throw new Error("No auth URL");
      window.location.href = data.auth_url;
    } catch (e: any) {
      console.error(e);
      toast.error("Error iniciando conexión con Mercado Pago");
      setConnecting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-lg">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-lg">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#009ee3]">
              <span className="text-2xl font-bold text-white">MP</span>
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Conectá tu Mercado Pago
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Para recibir señas de tus clientes el dinero va <strong>directo a tu cuenta MP</strong>.
              FIX no cobra comisión sobre las señas.
            </p>
          </div>

          {connected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl bg-secondary/10 p-4">
                <CheckCircle2 className="h-6 w-6 text-secondary" />
                <div>
                  <p className="font-medium text-foreground">Cuenta conectada</p>
                  <p className="text-xs text-muted-foreground">
                    Ya podés recibir reservas con seña.
                  </p>
                </div>
              </div>
              <Button onClick={() => navigate("/dashboard")} className="w-full">
                Ir al panel
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2 rounded-xl bg-muted/50 p-4 text-sm">
                <p className="font-medium">¿Qué necesitás?</p>
                <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                  <li>Una cuenta de Mercado Pago (personal o empresa, cualquiera funciona).</li>
                  <li>Si no tenés, creala gratis en mercadopago.com.ar.</li>
                </ul>
              </div>

              <div className="rounded-xl bg-accent/10 p-4 text-sm">
                <p className="font-medium text-foreground">Sin conexión MP</p>
                <p className="text-xs text-muted-foreground">
                  Podés seguir recibiendo pedidos de presupuesto, pero los clientes
                  <strong> no podrán reservar turno con seña</strong>.
                </p>
              </div>

              <Button
                onClick={handleConnect}
                disabled={connecting}
                className="w-full bg-[#009ee3] hover:bg-[#0084c1]"
              >
                {connecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Conectar con Mercado Pago
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MercadoPagoConnect;
