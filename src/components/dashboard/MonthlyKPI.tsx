import { useEffect, useState } from "react";
import { Users, TrendingUp, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const MonthlyKPI = () => {
  const { user } = useAuth();
  const [completed, setCompleted] = useState(0);
  const [pending, setPending] = useState(0);

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

      setCompleted(doneCount || 0);
      setPending(activeCount || 0);
    };
    fetchKPIs();
  }, [user]);

  return (
    <div className="grid grid-cols-2 gap-3">
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
            <CheckCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-display text-2xl font-bold text-foreground">{completed}</p>
            <p className="text-xs text-muted-foreground">Finalizados este mes</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/15">
            <TrendingUp className="h-5 w-5 text-secondary" />
          </div>
          <div>
            <p className="font-display text-2xl font-bold text-foreground">{pending}</p>
            <p className="text-xs text-muted-foreground">En curso</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MonthlyKPI;
