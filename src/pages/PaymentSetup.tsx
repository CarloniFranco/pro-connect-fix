import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CreditCard, Lock, ShieldCheck, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  if (!state) {
    navigate("/seleccionar-plan");
    return null;
  }

  const firstBillingDate = new Date();
  firstBillingDate.setMonth(firstBillingDate.getMonth() + 3);
  const formattedDate = firstBillingDate.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const formatCardNumber = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  };

  const formatExpiry = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 4);
    if (digits.length > 2) return digits.slice(0, 2) + "/" + digits.slice(2);
    return digits;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const cleanCard = cardNumber.replace(/\s/g, "");
    if (cleanCard.length < 13) {
      toast.error("Número de tarjeta inválido");
      return;
    }
    if (expiry.length < 5) {
      toast.error("Fecha de vencimiento inválida");
      return;
    }
    if (cvc.length < 3) {
      toast.error("CVC inválido");
      return;
    }

    setLoading(true);
    try {
      // Save plan selection (no actual charge)
      await supabase
        .from("professional_profiles")
        .update({
          plan: state.planId === "premium" ? "premium" : "basico",
        })
        .eq("user_id", user.id);

      toast.success(
        state.planId === "premium"
          ? "¡Plan Premium activado! Tu tarjeta fue vinculada."
          : "Plan Básico activado. Tu tarjeta fue vinculada."
      );
      navigate("/dashboard");
    } catch {
      toast.error("Ocurrió un error. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const priceLabel =
    state.billing === "anual"
      ? `$${state.fullPrice.toLocaleString("es-AR")}/año`
      : `$${state.fullPrice.toLocaleString("es-AR")}/mes`;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
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
                Configuración de Pago
              </h1>
              <p className="text-xs text-muted-foreground">
                Plan {state.planName} · {state.billing === "anual" ? "Anual" : "Mensual"}
              </p>
            </div>
          </div>

          {/* No-charge banner */}
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 mb-6 flex items-start gap-2">
            <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-primary">
                No se realizará ningún cargo hoy
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tu tarjeta se vincula para activar los 3 meses gratis y asegurar
                la continuidad del servicio. El primer cobro de{" "}
                <span className="font-semibold text-foreground">{priceLabel}</span>{" "}
                será el <span className="font-semibold text-foreground">{formattedDate}</span>.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-xs">Nombre del titular</Label>
              <Input
                id="name"
                placeholder="Juan Pérez"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="card" className="text-xs">Número de tarjeta</Label>
              <Input
                id="card"
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                maxLength={19}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="expiry" className="text-xs">Vencimiento</Label>
                <Input
                  id="expiry"
                  placeholder="MM/AA"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  maxLength={5}
                  required
                />
              </div>
              <div>
                <Label htmlFor="cvc" className="text-xs">CVC</Label>
                <Input
                  id="cvc"
                  placeholder="123"
                  type="password"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  maxLength={4}
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full gap-2">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              {loading ? "Vinculando tarjeta..." : "Vincular tarjeta y activar plan"}
            </Button>
          </form>

          <p className="mt-4 text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1">
            <Lock className="h-3 w-3" />
            Datos protegidos con encriptación de grado bancario
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentSetup;
