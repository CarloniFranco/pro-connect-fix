import { useEffect, useState } from "react";
import { ArrowLeft, User, LogOut, Loader2, Power } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import MonthlyKPI from "@/components/dashboard/MonthlyKPI";
import CalendarAgenda from "@/components/dashboard/CalendarAgenda";
import AgendaOrders from "@/components/dashboard/AgendaOrders";
import BudgetGenerator from "@/components/dashboard/BudgetGenerator";
import AvailabilityManager from "@/components/dashboard/AvailabilityManager";
import MyServicesManager from "@/components/dashboard/MyServicesManager";
import WorkStationsManager from "@/components/dashboard/WorkStationsManager";
import PortfolioManager from "@/components/dashboard/PortfolioManager";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const [profileName, setProfileName] = useState("");
  const [available, setAvailable] = useState(true);
  const [togglingAvailable, setTogglingAvailable] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("professional_profiles")
      .select("full_name, available")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.full_name) setProfileName(data.full_name);
        if (data?.available !== undefined && data?.available !== null) setAvailable(data.available);
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="container mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>
          <h1 className="font-display text-lg font-bold text-foreground">Mi Panel</h1>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
              <User className="h-4 w-4 text-primary-foreground" />
            </div>
            <button onClick={signOut} className="text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl space-y-6 px-4 py-6">
        {/* Greeting + Availability Toggle */}
        <div className="flex items-center justify-between">
          <div>
            {profileName && (
              <p className="text-sm text-muted-foreground">Hola, <span className="font-semibold text-foreground">{profileName}</span> 👋</p>
            )}
          </div>
          <div className="flex items-center gap-2">
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

        <MonthlyKPI />
        <CalendarAgenda />
        <AgendaOrders />
        <MyServicesManager />
        <WorkStationsManager />
        <AvailabilityManager />
        <PortfolioManager />
      </main>

      <BudgetGenerator />
    </div>
  );
};

export default Dashboard;
