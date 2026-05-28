import { supabase } from "@/integrations/supabase/client";

/**
 * Routes a professional without an active subscription is still allowed to access.
 * Everything else must redirect them to /seleccionar-plan.
 */
export const PRO_NO_SUB_ALLOWED_ROUTES = [
  "/seleccionar-plan",
  "/configurar-pago",
  "/mi-suscripcion",
  "/perfil-profesional",
  "/verificar-identidad",
  "/mp-oauth-callback",
  "/conectar-mercadopago",
  "/terminos",
  "/reset-password",
];

export const PRO_NO_DNI_ALLOWED_ROUTES = [
  "/verificar-identidad",
  "/perfil-profesional",
  "/terminos",
  "/reset-password",
];

export const isProNoSubAllowedRoute = (pathname: string) =>
  PRO_NO_SUB_ALLOWED_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/"));

export const isProNoDniAllowedRoute = (pathname: string) =>
  PRO_NO_DNI_ALLOWED_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/"));

/**
 * Checks if the user has an active (paid) professional subscription.
 */
export const hasActiveProSubscription = async (userId: string): Promise<boolean> => {
  for (const env of ["live", "sandbox"] as const) {
    const { data } = await supabase.rpc("has_active_subscription", {
      user_uuid: userId,
      check_env: env,
    });
    if (data === true) return true;
  }
  return false;
};

/**
 * Returns true if the professional has already submitted their DNI for review (or is verified).
 */
export const hasSubmittedDni = async (userId: string): Promise<boolean> => {
  const { data } = await supabase
    .from("professional_verification")
    .select("dni_verification_status")
    .eq("user_id", userId)
    .maybeSingle();
  const s = data?.dni_verification_status;
  return s === "en_revision" || s === "verificado";
};

/**
 * Determines the correct redirect path based on user profile state.
 */
export const getRedirectPath = async (userId: string, fallbackRole?: string | null): Promise<string> => {
  const { data: adminRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (adminRole) return "/admin/dashboard";

  const { data: proProfile } = await supabase
    .from("professional_profiles")
    .select("id, rubro, plan")
    .eq("user_id", userId)
    .maybeSingle();

  if (proProfile) {
    if (!proProfile.rubro) return "/perfil-profesional";
    const dniOk = await hasSubmittedDni(userId);
    if (!dniOk) return "/verificar-identidad";
    const hasSub = await hasActiveProSubscription(userId);
    if (!hasSub) return "/seleccionar-plan";
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
