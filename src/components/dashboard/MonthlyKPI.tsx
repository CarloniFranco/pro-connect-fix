import { useEffect, useState, useCallback } from "react";
import { TrendingUp, CheckCircle, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const MonthlyKPI = () => {
  const { user } = useAuth();
  const [completed, setCompleted] = useState(0);
  const [pending, setPending] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);

  const fetchKPIs = useCallback(async () => {
    if (!user) return;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { count: doneCount } = await supabase
      .from("service_requests")
      .select("*", { count: "exact", head: true })
      .eq("professional_id", user.id)
      .eq("status", "finalizada" as any)
      .gte("completed_at", startOfMonth);

    const { count: activeCount } = await supabase
      .from("service_requests")
      .select("*", { count: "exact", head: true })
      .eq("professional_id", user.id)
      .in("status", ["nueva", "cotizada", "aceptada", "en_servicio"] as any);

    // Ingresos confirmados del mes en curso:
    // - aceptada / en_servicio creadas este mes
    // - finalizada completadas este mes
    const { data: confirmedThisMonth } = await supabase
      .from("service_requests")
      .select("quoted_amount")
      .eq("professional_id", user.id)
      .in("status", ["aceptada", "en_servicio"] as any)
      .gte("created_at", startOfMonth)
      .not("quoted_amount", "is", null);

    const { data: finishedThisMonth } = await supabase
      .from("service_requests")
      .select("quoted_amount")
      .eq("professional_id", user.id)
      .eq("status", "finalizada" as any)
      .gte("completed_at", startOfMonth)
      .not("quoted_amount", "is", null);

    const total =
      (confirmedThisMonth || []).reduce((s, r) => s + (Number(r.quoted_amount) || 0), 0) +
      (finishedThisMonth || []).reduce((s, r) => s + (Number(r.quoted_amount) || 0), 0);

    setCompleted(doneCount || 0);
    setPending(activeCount || 0);
    setTotalRevenue(total);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchKPIs();

    // Realtime: refrescar al confirmarse / actualizarse / crearse servicios
    const channel = supabase
      .channel("kpi-service-requests")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "service_requests",
          filter: `professional_id=eq.${user.id}`,
        },
        () => fetchKPIs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchKPIs]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(amount);

  // Compact currency for mobile (e.g. $1.2M, $350k) so it never overflows.
  const formatCurrencyCompact = (amount: number) => {
    if (amount >= 1_000_000) {
      const v = amount / 1_000_000;
      return `$${v.toFixed(v >= 10 ? 0 : 1).replace(".", ",")}M`;
    }
    if (amount >= 1_000) {
      const v = amount / 1_000;
      return `$${v.toFixed(v >= 100 ? 0 : 0).replace(".", ",")}k`;
    }
    return formatCurrency(amount);
  };

  const cards = [
    {
      icon: CheckCircle,
      iconBg: "bg-primary/15",
      iconColor: "text-primary",
      value: String(completed),
      label: "Finalizados",
      sublabel: "este mes",
    },
    {
      icon: TrendingUp,
      iconBg: "bg-secondary/15",
      iconColor: "text-secondary",
      value: String(pending),
      label: "En curso",
      sublabel: "",
    },
    {
      icon: DollarSign,
      iconBg: "bg-accent/20",
      iconColor: "text-accent-foreground",
      // Compact on mobile, full on >=sm
      valueMobile: formatCurrencyCompact(totalRevenue),
      value: formatCurrency(totalRevenue),
      label: "Generado",
      sublabel: "este mes",
      isCurrency: true,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <Card key={i} className="overflow-hidden">
            <CardContent className="flex flex-col items-start gap-2 p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
              <div
                className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full ${c.iconBg}`}
              >
                <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${c.iconColor}`} />
              </div>
              <div className="min-w-0 w-full">
                {c.isCurrency ? (
                  <>
                    <p className="font-display text-base sm:hidden font-bold text-foreground leading-tight tabular-nums">
                      {c.valueMobile}
                    </p>
                    <p className="hidden sm:block font-display text-lg font-bold text-foreground leading-tight tabular-nums truncate">
                      {c.value}
                    </p>
                  </>
                ) : (
                  <p className="font-display text-xl sm:text-2xl font-bold text-foreground leading-tight tabular-nums">
                    {c.value}
                  </p>
                )}
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">
                  {c.label}
                  {c.sublabel ? <span className="hidden sm:inline"> {c.sublabel}</span> : null}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default MonthlyKPI;
