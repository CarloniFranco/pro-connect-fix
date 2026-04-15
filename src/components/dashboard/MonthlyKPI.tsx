import { useEffect, useState } from "react";
import { TrendingUp, CheckCircle, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const MonthlyKPI = () => {
  const { user } = useAuth();
  const [completed, setCompleted] = useState(0);
  const [pending, setPending] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    if (!user) return;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const fetchKPIs = async () => {
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

      // Total revenue from all accepted/completed quotes
      const { data: revenueData } = await supabase
        .from("service_requests")
        .select("quoted_amount")
        .eq("professional_id", user.id)
        .in("status", ["aceptada", "en_servicio", "finalizada"] as any)
        .not("quoted_amount", "is", null);

      const total = (revenueData || []).reduce(
        (sum, r) => sum + (r.quoted_amount || 0),
        0
      );

      setCompleted(doneCount || 0);
      setPending(activeCount || 0);
      setTotalRevenue(total);
    };
    fetchKPIs();
  }, [user]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(amount);

  return (
    <div className="grid grid-cols-3 gap-3">
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
            <CheckCircle className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-2xl font-bold text-foreground">{completed}</p>
            <p className="text-xs text-muted-foreground">Finalizados este mes</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/15">
            <TrendingUp className="h-5 w-5 text-secondary" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-2xl font-bold text-foreground">{pending}</p>
            <p className="text-xs text-muted-foreground">En curso</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/20">
            <DollarSign className="h-5 w-5 text-accent-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-lg font-bold text-foreground leading-tight">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-muted-foreground">Generado en FIX</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MonthlyKPI;
