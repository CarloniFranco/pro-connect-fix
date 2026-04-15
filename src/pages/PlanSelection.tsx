import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Sparkles, Calendar, Users, Brain, Search, Headphones, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const plans = [
  {
    id: "basico",
    name: "Básica",
    price: "Gratis",
    subtitle: "por los primeros 3 meses",
    icon: Calendar,
    features: [
      "Gestión de agenda",
      "Perfil público visible",
      "Recepción de solicitudes de clientes",
    ],
    accent: false,
  },
  {
    id: "premium",
    name: "Premium",
    price: "Gratis",
    subtitle: "por los primeros 3 meses",
    icon: Sparkles,
    features: [
      "Todo lo de la suscripción Básica",
      "Asistente de IA para Presupuestos",
      "Mayor alcance en búsquedas",
      "Soporte prioritario",
    ],
    accent: true,
  },
];

const PlanSelection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSelect = async (planId: string) => {
    if (!user) return;
    setSelectedPlan(planId);
    setLoading(true);
    try {
      await supabase
        .from("professional_profiles")
        .update({ plan: planId === "premium" ? "premium" : "basico" })
        .eq("user_id", user.id);
      toast.success(
        planId === "premium"
          ? "¡Excelente! Activaste el plan Premium."
          : "Plan Básico activado."
      );
      navigate("/dashboard");
    } catch {
      toast.error("Error al activar el plan");
    } finally {
      setLoading(false);
    }
  };

  const featureIcons: Record<string, typeof Check> = {
    "Gestión de agenda": Calendar,
    "Perfil público visible": Users,
    "Recepción de solicitudes de clientes": Search,
    "Todo lo de la suscripción Básica": Check,
    "Asistente de IA para Presupuestos": Brain,
    "Mayor alcance en búsquedas": Search,
    "Soporte prioritario": Headphones,
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
          <Rocket className="h-7 w-7 text-primary-foreground" />
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
          Elegí tu Plan
        </h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
          Seleccioná la suscripción que mejor se adapte a tu negocio
        </p>
      </motion.div>

      <div className="grid w-full max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`relative flex flex-col rounded-2xl border-2 p-6 shadow-md transition-all ${
              plan.accent
                ? "border-primary bg-card shadow-lg"
                : "border-border bg-card"
            }`}
          >
            {plan.accent && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-bold text-primary-foreground">
                Recomendado
              </div>
            )}

            <div className="mb-4 flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  plan.accent ? "bg-primary" : "bg-secondary"
                }`}
              >
                <plan.icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-card-foreground">
                  {plan.name}
                </h2>
              </div>
            </div>

            <div className="mb-5">
              <span className="text-3xl font-bold text-foreground">
                {plan.price}
              </span>
              <span className="ml-1 text-sm text-muted-foreground">
                {plan.subtitle}
              </span>
            </div>

            <ul className="mb-6 flex-1 space-y-3">
              {plan.features.map((feat) => {
                const Icon = featureIcons[feat] || Check;
                return (
                  <li key={feat} className="flex items-start gap-2.5">
                    <div
                      className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${
                        plan.accent
                          ? "bg-primary/10 text-primary"
                          : "bg-secondary/10 text-secondary"
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                    </div>
                    <span className="text-sm text-card-foreground">{feat}</span>
                  </li>
                );
              })}
            </ul>

            <Button
              onClick={() => handleSelect(plan.id)}
              disabled={loading}
              variant={plan.accent ? "default" : "outline"}
              className="w-full"
            >
              {loading && selectedPlan === plan.id
                ? "Activando..."
                : `Elegir ${plan.name}`}
            </Button>
          </motion.div>
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-8 max-w-lg text-center text-sm font-medium text-primary"
      >
        🚀 Aprovechá el Lanzamiento: Ambos planes son 100% bonificados por
        tiempo limitado
      </motion.p>
    </div>
  );
};

export default PlanSelection;
