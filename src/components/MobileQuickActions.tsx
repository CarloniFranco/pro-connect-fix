import { ClipboardList } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * FAB inferior derecho que sólo aparece en MOBILE para clientes (no profesionales).
 * Acceso directo a "Mis Pedidos" sin tener que abrir el header ni el dropdown.
 * Se oculta en la propia ruta /mis-pedidos para no estorbar.
 */
const MobileQuickActions = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [isPro, setIsPro] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setIsPro(null);
      return;
    }
    supabase
      .from("professional_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setIsPro(!!data));
  }, [user]);

  // Sólo mostramos a clientes logueados, fuera de /mis-pedidos
  if (!user || isPro !== false) return null;
  if (location.pathname.startsWith("/mis-pedidos")) return null;
  // Tampoco lo mostramos en flujos de autenticación / checkout
  if (
    location.pathname.startsWith("/auth") ||
    location.pathname.startsWith("/login") ||
    location.pathname.startsWith("/register") ||
    location.pathname.startsWith("/checkout")
  )
    return null;

  return (
    <button
      onClick={() => navigate("/mis-pedidos")}
      aria-label="Ver mis pedidos"
      className="fixed bottom-5 right-4 z-40 flex h-14 items-center gap-2 rounded-full bg-primary px-5 text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95 md:hidden"
      style={{ paddingBottom: "max(0px, env(safe-area-inset-bottom))" }}
    >
      <ClipboardList className="h-5 w-5" />
      <span className="text-sm font-bold">Mis Pedidos</span>
    </button>
  );
};

export default MobileQuickActions;
