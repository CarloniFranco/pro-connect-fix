import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { hasActiveProSubscription, hasSubmittedDni } from "@/lib/redirectUser";

/**
 * Returns the onboarding state for the current user when they are a professional.
 * The PrivateRoute uses this to gate access to the app until DNI is submitted and
 * the subscription is active.
 */
export const useProSubscriptionGate = (userId: string | undefined) => {
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [hasActive, setHasActive] = useState(false);
  const [dniSubmitted, setDniSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setLoading(false);
      setIsPro(false);
      setHasActive(false);
      setDniSubmitted(false);
      return;
    }
    (async () => {
      setLoading(true);
      const { data: pro } = await supabase
        .from("professional_profiles")
        .select("id, rubro")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (!pro) {
        setIsPro(false);
        setHasActive(false);
        setDniSubmitted(false);
        setLoading(false);
        return;
      }
      setIsPro(true);
      const [dni, sub] = await Promise.all([
        hasSubmittedDni(userId),
        hasActiveProSubscription(userId),
      ]);
      if (cancelled) return;
      setDniSubmitted(dni);
      setHasActive(sub);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { loading, isPro, hasActive, dniSubmitted };
};
