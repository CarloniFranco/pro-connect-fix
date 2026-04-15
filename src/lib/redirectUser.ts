import { supabase } from "@/integrations/supabase/client";

/**
 * Determines the correct redirect path based on user profile state.
 * - Professional with complete profile → /dashboard
 * - Professional without rubro → /perfil-profesional (onboarding)
 * - Client with profile → / (home)
 * - No profile → onboarding based on role metadata
 */
export const getRedirectPath = async (userId: string, fallbackRole?: string | null): Promise<string> => {
  const { data: proProfile } = await supabase
    .from("professional_profiles")
    .select("id, rubro, plan")
    .eq("user_id", userId)
    .maybeSingle();

  if (proProfile) {
    if (!proProfile.rubro) return "/perfil-profesional";
    return "/dashboard";
  }

  const { data: clientProfile } = await supabase
    .from("client_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (clientProfile) return "/";

  const { data: { user } } = await supabase.auth.getUser();
  const role = fallbackRole || user?.user_metadata?.role || localStorage.getItem("fix_pending_role");
  return role === "professional" ? "/perfil-profesional" : "/completar-perfil";
};
