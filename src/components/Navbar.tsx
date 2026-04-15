import { useState, useEffect } from "react";
import { Wrench, User, LogOut, ChevronDown, ClipboardList } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
  const [userName, setUserName] = useState("");
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    if (!user) {
      setUserName("");
      setIsPro(false);
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
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="container mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <button onClick={() => navigate("/")} className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm">
            <Wrench className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-foreground">
            FIX
          </span>
        </button>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted/80">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                  <User className="h-3 w-3 text-primary-foreground" />
                </div>
                <span className="max-w-[120px] truncate hidden sm:inline">
                  {userName || "Mi cuenta"}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {isPro ? (
                <>
                  <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                    <Wrench className="mr-2 h-4 w-4" />
                    Mi Panel
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => navigate("/mi-perfil")}>
                    <User className="mr-2 h-4 w-4" />
                    Mi Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/mis-pedidos")}>
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Mis Pedidos
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
