import { useEffect, useState } from "react";
import { Sparkles, Calendar, ArrowRightLeft, AlertTriangle, Loader2, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const PLAN_PRICES: Record<string, number> = {
  basico: 6999,
  premium: 14000,
};

const SubscriptionManager = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("professional_profiles")
      .select("plan, created_at")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setPlan(data?.plan || "basico");
        setCreatedAt(data?.created_at || null);
        setLoading(false);
      });
  }, [user]);

  const handleSwitchPlan = () => {
    navigate("/seleccionar-plan");
  };

  const handleDeactivate = async () => {
    if (!user) return;
    await supabase
      .from("professional_profiles")
      .delete()
      .eq("user_id", user.id);
    toast.success("Tu cuenta profesional fue dada de baja.");
    await signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  const isPremium = plan === "premium";
  const monthlyPrice = PLAN_PRICES[plan || "basico"] || 6999;

  // Calculate first billing date: 3 months after profile creation
  let firstBillingLabel = "—";
  if (createdAt) {
    const d = new Date(createdAt);
    d.setMonth(d.getMonth() + 3);
    firstBillingLabel = d.toLocaleDateString("es-AR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-base font-bold text-card-foreground mb-4">
        Mi Plan de Suscripción
      </h3>

      {/* Current plan */}
      <div
        className={`flex items-center gap-3 rounded-xl p-4 mb-3 ${
          isPremium
            ? "bg-primary/10 border border-primary/20"
            : "bg-secondary/10 border border-secondary/20"
        }`}
      >
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            isPremium ? "bg-primary" : "bg-secondary"
          }`}
        >
          {isPremium ? (
            <Sparkles className="h-5 w-5 text-white" />
          ) : (
            <Calendar className="h-5 w-5 text-white" />
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-card-foreground">
            Plan {isPremium ? "Premium" : "Básico"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isPremium
              ? "IA para presupuestos, mayor alcance y soporte prioritario"
              : "Agenda, perfil público y recepción de solicitudes"}
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-muted-foreground line-through block">
            ${monthlyPrice.toLocaleString("es-AR")}/mes
          </span>
          <span className="text-sm font-bold text-primary">$0 hoy</span>
        </div>
      </div>

      {/* Billing info */}
      <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 mb-4 text-xs text-muted-foreground">
        <CreditCard className="h-3.5 w-3.5 flex-shrink-0" />
        <span>
          Primer cobro automático:{" "}
          <span className="font-semibold text-foreground">{firstBillingLabel}</span>
        </span>
      </div>

      {/* Switch plan */}
      <Button
        variant="outline"
        onClick={handleSwitchPlan}
        disabled={switching}
        className="w-full mb-3 gap-2"
      >
        {switching ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ArrowRightLeft className="h-4 w-4" />
        )}
        {isPremium ? "Cambiar a Básico" : "Pasarme a Premium"}
      </Button>

      {/* Deactivate */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button className="w-full text-center text-xs text-muted-foreground hover:text-destructive transition-colors py-2">
            Darme de baja del servicio
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              ¿Estás seguro de que querés irte?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              Si te das de baja, perderás toda tu trayectoria, calificaciones y
              posición en el ranking de meritocracia de FIX. Esta acción no se
              puede deshacer y empezarás de cero si decidís volver.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-semibold">
              Mantenerme en FIX
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar Baja
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SubscriptionManager;
