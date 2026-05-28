import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DniVerificationCard from "@/components/DniVerificationCard";

const IdentityVerification = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<string>("pendiente");
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("professional_verification")
      .select("dni_verification_status")
      .eq("user_id", user.id)
      .maybeSingle();
    setStatus((data?.dni_verification_status as string) || "pendiente");
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }
    if (user) refresh();
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const submitted = status === "en_revision" || status === "verificado";

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
        <button
          onClick={() => navigate("/perfil-profesional")}
          className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>

        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <ShieldCheck className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Verificá tu identidad
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Subí tu DNI para que el equipo de FIX habilite tu cuenta profesional.
          </p>
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-lg sm:p-6">
          <DniVerificationCard />

          {submitted && (
            <Button onClick={() => navigate("/seleccionar-plan")} className="w-full" size="lg">
              Continuar a elegir plan
            </Button>
          )}
          {!submitted && (
            <p className="text-center text-xs text-muted-foreground">
              Cuando subas tu DNI y lo envíes a revisión vas a poder seguir al siguiente paso.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default IdentityVerification;
