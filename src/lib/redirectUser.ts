import { supabase } from "@/integrations/supabase/client";

/**
 * Determines the correct redirect path based on user profile state.
 * - Professional with complete profile → /dashboard
 * - Professional without rubro → /perfil-profesional (onboarding)
 * - Client with profile → / (home)
 * - No profile → onboarding based on role metadata
 */
export const getRedirectPath = async (userId: string): Promise<string> => {
  const { data: proProfile } = await supabase
    .from("professional_profiles")
    .select("id, rubro, plan")
    .eq("user_id", userId)
    .maybeSingle();

  if (proProfile) {
    // Professional exists but hasn't completed profile
    if (!proProfile.rubro) return "/perfil-profesional";
    // Professional with no plan selected
    if (!proProfile.plan || proProfile.plan === "basico") return "/dashboard";
    return "/dashboard";
  }

  const { data: clientProfile } = await supabase
    .from("client_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (clientProfile) return "/";

  // No profile at all — check role from metadata
  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.user_metadata?.role;
  return role === "professional" ? "/perfil-profesional" : "/completar-perfil";
};
