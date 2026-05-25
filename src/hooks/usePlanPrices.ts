import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PlanPrices {
  basico: number;
  premium: number;
}

const DEFAULTS: PlanPrices = { basico: 6999, premium: 14000 };

export const usePlanPrices = () => {
  const [prices, setPrices] = useState<PlanPrices>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("app_config")
        .select("key, value")
        .in("key", ["plan_price_basico", "plan_price_premium"]);
      if (!active) return;
      const next = { ...DEFAULTS };
      (data || []).forEach((row: any) => {
        const n = Number(row.value);
        if (!Number.isFinite(n)) return;
        if (row.key === "plan_price_basico") next.basico = n;
        if (row.key === "plan_price_premium") next.premium = n;
      });
      setPrices(next);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  return { prices, loading };
};
