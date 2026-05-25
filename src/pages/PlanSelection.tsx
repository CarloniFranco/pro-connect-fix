import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Sparkles, Calendar, Users, Brain, Search, Headphones, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { usePlanPrices } from "@/hooks/usePlanPrices";

const PLAN_META = [
  {
    id: "basico" as const,
    name: "Básica",
    icon: Calendar,
    features: [
      "Gestión de agenda",
      "Perfil público visible",
      "Recepción de solicitudes de clientes",
    ],
    accent: false,
  },
  {
    id: "premium" as const,
    name: "Premium",
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

const featureIcons: Record<string, typeof Check> = {
  "Gestión de agenda": Calendar,
  "Perfil público visible": Users,
  "Recepción de solicitudes de clientes": Search,
  "Todo lo de la suscripción Básica": Check,
  "Asistente de IA para Presupuestos": Brain,
  "Mayor alcance en búsquedas": Search,
  "Soporte prioritario": Headphones,
};

const formatPrice = (n: number) =>
  n.toLocaleString("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 });

const PlanSelection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [annual, setAnnual] = useState(false);

  const handleSelect = (planId: string) => {
    if (!user) return;
    const plan = plans.find((p) => p.id === planId)!;
    const billing = annual ? "anual" : "mensual";
    const fullPrice = annual
      ? Math.round(plan.monthlyPrice * 12 * 0.8)
      : plan.monthlyPrice;
    navigate("/configurar-pago", {
      state: { planId, planName: plan.name, billing, fullPrice },
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div
       
       
        className="text-center mb-8"
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
      </div>

      {/* Annual toggle */}
      <div
       
       
       
        className="flex items-center gap-3 mb-8"
      >
        <Label htmlFor="billing-toggle" className={`text-sm font-medium ${!annual ? "text-foreground" : "text-muted-foreground"}`}>
          Mensual
        </Label>
        <Switch id="billing-toggle" checked={annual} onCheckedChange={setAnnual} />
        <Label htmlFor="billing-toggle" className={`text-sm font-medium ${annual ? "text-foreground" : "text-muted-foreground"}`}>
          Anual <span className="text-xs font-bold text-primary ml-1">-20%</span>
        </Label>
      </div>

      <div className="grid w-full max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2">
        {plans.map((plan, i) => {
          const originalPrice = annual
            ? plan.monthlyPrice * 12
            : plan.monthlyPrice;
          const displayOriginal = annual
            ? formatPrice(originalPrice) + "/año"
            : formatPrice(originalPrice) + "/mes";
          const discountedAnnual = annual
            ? formatPrice(Math.round(originalPrice * 0.8)) + "/año"
            : null;

          return (
            <div
              key={plan.id}
             
             
             
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
                <h2 className="text-lg font-bold text-card-foreground">
                  {plan.name}
                </h2>
              </div>

              {/* Pricing */}
              <div className="mb-1">
                <span className="text-sm text-muted-foreground line-through mr-2">
                  {annual ? discountedAnnual ?? displayOriginal : displayOriginal}
                </span>
              </div>
              <div className="mb-4 flex items-end gap-2">
                <span className="text-3xl font-bold text-foreground">$0</span>
                <span className="text-sm text-muted-foreground mb-1">hoy</span>
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
                variant={plan.accent ? "default" : "outline"}
                className="w-full"
              >
                Elegir {plan.name}
              </Button>
            </div>
          );
        })}
      </div>

      <div
       
       
       
        className="mt-8 max-w-lg rounded-xl bg-primary/5 border border-primary/20 p-4 text-center"
      >
        <p className="text-sm font-semibold text-primary">
          🚀 ¡Beneficio Fundador!
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          3 meses 100% bonificados. Empezá a pagar recién en el cuarto mes.
        </p>
      </div>
    </div>
  );
};

export default PlanSelection;
