import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { hasActiveProSubscription } from "@/lib/redirectUser";

/**
 * Returns whether the current user is a professional, and if so whether they
 * have an active subscription. Pros without subscription should be locked out
 * of the app until they complete payment.
 */
export const useProSubscriptionGate = (userId: string | undefined) => {
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [hasActive, setHasActive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setLoading(false);
      setIsPro(false);
      setHasActive(false);
      return;
    }
    (async () => {
      setLoading(true);
      const { data: pro } = await supabase
        .from("professional_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (!pro) {
        setIsPro(false);
        setHasActive(false);
        setLoading(false);
        return;
      }
      setIsPro(true);
      const ok = await hasActiveProSubscription(userId);
      if (cancelled) return;
      setHasActive(ok);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { loading, isPro, hasActive };
};
