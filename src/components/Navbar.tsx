import { useState, useEffect } from "react";
import { Wrench, User, LogOut, ChevronDown, ClipboardList, Briefcase, CreditCard, BarChart3, Heart, ShieldCheck } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import FelixLogo from "@/components/FelixLogo";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [userName, setUserName] = useState("");
  const [isPro, setIsPro] = useState<boolean | null>(null);
  const [plan, setPlan] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setUserName("");
      setIsPro(null);
      return;
    }
    supabase
      .from("professional_profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setUserName(data.full_name);
          setIsPro(true);
          return;
        }
        setIsPro(false);
        supabase
          .from("client_profiles")
          .select("full_name")
          .eq("user_id", user.id)
          .maybeSingle()
          .then(({ data: clientData }) => {
            if (clientData) {
              setUserName(clientData.full_name);
            } else {
              setUserName(user.user_metadata?.full_name || user.email || "");
            }
          });
      });
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="container mx-auto flex h-14 max-w-4xl items-center justify-between gap-2 px-3 sm:px-4">
        <button onClick={() => navigate("/")} className="flex shrink-0 items-center gap-2">
          <FelixLogo className="h-9 w-9" wink />
          <span className="font-display text-xl font-bold tracking-tight">
            <span className="text-foreground">FI</span>
            <span className="text-primary">X</span>
          </span>
        </button>

        {user ? (
          <div className="flex min-w-0 items-center gap-1">
            {!isAdmin && isPro === false && (
              <button
                onClick={() => navigate("/mis-pedidos")}
                title="Ver mis pedidos"
                aria-label="Ver mis pedidos"
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 sm:px-3"
              >
                <ClipboardList className="h-4 w-4" />
                <span className="hidden xs:inline sm:inline">Mis Pedidos</span>
              </button>
            )}
            {!isAdmin && <NotificationBell />}
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex min-w-0 items-center gap-1.5 rounded-lg bg-muted px-2 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted/80 sm:gap-2 sm:px-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary">
                  <User className="h-3 w-3 text-primary-foreground" />
                </div>
                <span className="hidden max-w-[120px] truncate sm:inline">
                  {userName || "Mi cuenta"}
                </span>
                <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {isAdmin ? (
                <DropdownMenuItem onClick={() => navigate("/admin/dashboard")}>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Panel de Admin
                </DropdownMenuItem>
              ) : isPro ? (
                <>
                  <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                    <Wrench className="mr-2 h-4 w-4" />
                    Mi Panel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/mi-perfil-pro")}>
                    <Briefcase className="mr-2 h-4 w-4" />
                    Mi Perfil Profesional
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/mis-pedidos")}>
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Mis Pedidos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/historial-trabajos")}>
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Historial de Trabajos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/indicadores")}>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Indicadores
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/mi-suscripcion")}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Mi Suscripción
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => navigate("/mi-perfil")}>
                    <User className="mr-2 h-4 w-4" />
                    Mi Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/mis-favoritos")}>
                    <Heart className="mr-2 h-4 w-4" />
                    Mis Favoritos
                  </DropdownMenuItem>
                </>
              )}
              {isAdmin && (
                <DropdownMenuSeparator />
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        ) : (
          <button
            onClick={() => navigate("/login")}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <User className="h-4 w-4" />
            Ingresar
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
