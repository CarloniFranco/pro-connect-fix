import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CreditCard,
  ArrowLeft,
  Loader2,
  Sparkles,
  Calendar,
  ArrowRightLeft,
  AlertTriangle,
  Trash2,
  Star,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";

const PLAN_PRICES: Record<string, number> = {
  basico: 6999,
  premium: 14000,
};

const ProSubscription = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [plan, setPlan] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  const handleSendTestEmail = async () => {
    setSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-test-notification");
      if (error) throw error;
      toast.success(`Email de prueba enviado a ${data?.sent_to || "tu casilla"}. Revisá la bandeja (y spam) en unos segundos.`);
    } catch (err) {
      console.error("Test email error:", err);
      toast.error("No se pudo enviar el email de prueba.");
    } finally {
      setSendingTest(false);
    }
  };

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

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-user-account");
      if (error) throw error;
      toast.success("Tu cuenta fue eliminada.");
      await signOut();
      navigate("/");
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("No se pudo eliminar la cuenta. Intentá de nuevo.");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex min-h-screen items-center justify-center pt-14">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  const isPremium = plan === "premium";
  const monthlyPrice = PLAN_PRICES[plan || "basico"] || 6999;

  let firstBillingLabel = "—";
  if (createdAt) {
    const d = new Date(createdAt);
    d.setMonth(d.getMonth() + 3);
    firstBillingLabel = d.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background pt-14">
        <div className="container mx-auto max-w-2xl px-4 py-8">
          <button
            onClick={() => navigate("/dashboard")}
            className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al panel
          </button>

          <h1 className="font-display text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" />
            Mi Suscripción
          </h1>

          {/* Current plan */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Plan Actual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`flex items-center gap-3 rounded-xl p-4 mb-4 ${isPremium ? "bg-primary/10 border border-primary/20" : "bg-secondary/10 border border-secondary/20"}`}>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isPremium ? "bg-primary" : "bg-secondary"}`}>
                  {isPremium ? <Sparkles className="h-5 w-5 text-primary-foreground" /> : <Calendar className="h-5 w-5 text-secondary-foreground" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">
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

              <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 mb-4 text-xs text-muted-foreground">
                <CreditCard className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Primer cobro automático:{" "}
                  <span className="font-semibold text-foreground">{firstBillingLabel}</span>
                </span>
              </div>

              <Button
                variant="outline"
                onClick={() => navigate("/seleccionar-plan")}
                className="w-full gap-2"
              >
                <ArrowRightLeft className="h-4 w-4" />
                {isPremium ? "Cambiar a Básico" : "Pasarme a Premium"}
              </Button>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Separator className="my-6" />
          <Card className="border-destructive/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Zona de peligro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Si eliminás tu cuenta, perderás de forma irreversible toda tu reputación acumulada, tus estrellas y tu posición en el ranking de FIX.
              </p>
              <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    Eliminar mi cuenta de FIX
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      ¿Estás seguro?
                    </DialogTitle>
                    <DialogDescription className="leading-relaxed">
                      Si eliminás tu cuenta, perderás de forma irreversible toda tu reputación acumulada, tus <Star className="inline h-3 w-3 text-accent fill-accent" /> 5 estrellas y tu posición en el ranking de FIX. <strong>Esta acción no tiene vuelta atrás.</strong>
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => setDeleteOpen(false)} className="font-semibold">
                      Mantenerme en FIX
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAccount}
                      disabled={deleting}
                      className="gap-1"
                    >
                      {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Confirmar eliminación
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default ProSubscription;
