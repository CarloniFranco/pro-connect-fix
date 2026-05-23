import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const MercadoPagoCallback = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [params] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    if (ran.current) return;
    ran.current = true;

    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");

    if (error) {
      setStatus("error");
      setErrorMsg(params.get("error_description") || error);
      return;
    }

    if (!code || !state) {
      setStatus("error");
      setErrorMsg("Faltan parámetros del callback");
      return;
    }

    (async () => {
      const { data, error: fnErr } = await supabase.functions.invoke("mp-oauth-callback", {
        body: { code, state },
      });
      if (fnErr || data?.error) {
        setStatus("error");
        setErrorMsg(fnErr?.message || data?.error || "Error desconocido");
        return;
      }
      setStatus("ok");
      setTimeout(() => navigate("/conectar-mercadopago"), 1500);
    })();
  }, [authLoading, user, params, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
        {status === "loading" && (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">Conectando tu cuenta...</p>
          </>
        )}
        {status === "ok" && (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-secondary" />
            <h2 className="mt-4 font-display text-xl font-bold">¡Conectado!</h2>
            <p className="mt-1 text-sm text-muted-foreground">Tu cuenta MP quedó vinculada.</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="mx-auto h-12 w-12 text-destructive" />
            <h2 className="mt-4 font-display text-xl font-bold">No pudimos conectar</h2>
            <p className="mt-1 text-sm text-muted-foreground">{errorMsg}</p>
            <Button onClick={() => navigate("/conectar-mercadopago")} className="mt-4 w-full">
              Volver e intentar de nuevo
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default MercadoPagoCallback;
