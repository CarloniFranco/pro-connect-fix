import { useEffect, useState } from "react";
import { User, LogOut, Loader2, Power, ChevronDown, Briefcase, ClipboardList, CreditCard, BarChart3, ShieldCheck, CheckCircle2, XCircle } from "lucide-react";
import FelixLogo from "@/components/FelixLogo";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import CalendarAgenda from "@/components/dashboard/CalendarAgenda";
import AgendaOrders from "@/components/dashboard/AgendaOrders";
import AvailabilityManager from "@/components/dashboard/AvailabilityManager";
import MyServicesManager from "@/components/dashboard/MyServicesManager";
import WorkStationsManager from "@/components/dashboard/WorkStationsManager";
import NotificationBell from "@/components/NotificationBell";
import DniVerificationCard from "@/components/DniVerificationCard";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const [profileName, setProfileName] = useState("");
  const [available, setAvailable] = useState(true);
  const [togglingAvailable, setTogglingAvailable] = useState(false);
  const [stationsVersion, setStationsVersion] = useState(0);
  const [mpConnected, setMpConnected] = useState<boolean | null>(null);
  const [verified, setVerified] = useState<boolean | null>(null);
  const { isAdmin } = useIsAdmin();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("professional_profiles")
      .select("full_name, available, mp_connected, verified")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.full_name) setProfileName(data.full_name);
        if (data?.available !== undefined && data?.available !== null) setAvailable(data.available);
        setMpConnected(!!(data as any)?.mp_connected);
        setVerified(!!(data as any)?.verified);
      });
  }, [user]);

  const toggleAvailable = async (checked: boolean) => {
    if (!user) return;
    setTogglingAvailable(true);
    setAvailable(checked);
    const { error } = await supabase
      .from("professional_profiles")
      .update({ available: checked } as any)
      .eq("user_id", user.id);
    setTogglingAvailable(false);
    if (error) {
      setAvailable(!checked);
      toast.error("Error al cambiar disponibilidad");
    } else {
      toast.success(checked ? "Ahora aparecés en búsquedas" : "Ya no aparecés en búsquedas");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header
        className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-md"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="container mx-auto flex h-14 max-w-4xl items-center justify-between gap-2 px-3 sm:px-4">
          <button onClick={() => navigate("/")} className="flex shrink-0 items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg">
              <FelixLogo className="h-7 w-7" wink />
            </div>
            <span className="font-display text-lg font-bold text-foreground">FIX</span>
          </button>
          <h1 className="truncate font-display text-base font-bold text-foreground sm:text-lg">Mi Panel</h1>
          <div className="flex shrink-0 items-center gap-1">
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex min-w-0 items-center gap-1.5 rounded-lg bg-muted px-2 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted/80 sm:gap-2 sm:px-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary">
                    <User className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <span className="hidden max-w-[120px] truncate sm:inline">
                    {profileName || "Mi cuenta"}
                  </span>
                  <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => navigate("/mi-perfil-pro")}>
                  <Briefcase className="mr-2 h-4 w-4" />
                  Mi Perfil Profesional
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
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate("/admin/dashboard")}>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Admin · Verificaciones
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl space-y-5 px-3 py-5 sm:space-y-6 sm:px-4 sm:py-6">
        {/* Greeting + Availability Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            {profileName && (
              <p className="truncate text-sm text-muted-foreground">
                Hola, <span className="font-semibold text-foreground">{profileName}</span> 👋
              </p>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  mpConnected
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {mpConnected ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}
                MP {mpConnected ? "conectado" : "sin conectar"}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  verified
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {verified ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}
                {verified ? "Verificado" : "Sin verificar"}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Power className={`h-4 w-4 ${available ? "text-green-500" : "text-muted-foreground"}`} />
            <span className={`text-xs font-semibold ${available ? "text-green-600" : "text-muted-foreground"}`}>
              {available ? "Disponible" : "No disponible"}
            </span>
            <Switch
              checked={available}
              onCheckedChange={toggleAvailable}
              disabled={togglingAvailable}
            />
          </div>
        </div>

        {mpConnected === false && (
          <button
            onClick={() => navigate("/conectar-mercadopago")}
            className="w-full rounded-xl border border-[#009ee3]/40 bg-[#009ee3]/10 p-4 text-left transition hover:bg-[#009ee3]/15"
          >
            <p className="text-sm font-semibold text-foreground">
              Conectá tu Mercado Pago para recibir señas
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Sin MP conectado tus clientes no pueden reservar turnos con seña. La plata va directo a tu cuenta MP — FIX no cobra comisión.
            </p>
          </button>
        )}

        <DniVerificationCard />
        <CalendarAgenda />
        <AgendaOrders />
        <MyServicesManager />
        <WorkStationsManager onSaved={() => setStationsVersion((v) => v + 1)} />
        <AvailabilityManager refreshKey={stationsVersion} />
      </main>
    </div>
  );
};

export default Dashboard;
