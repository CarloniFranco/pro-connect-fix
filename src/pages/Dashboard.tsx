import { useEffect, useState } from "react";
import { ArrowLeft, User, LogOut, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import MonthlyKPI from "@/components/dashboard/MonthlyKPI";
import DayAgenda from "@/components/dashboard/DayAgenda";
import WorkOrders from "@/components/dashboard/WorkOrders";
import BudgetGenerator from "@/components/dashboard/BudgetGenerator";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const [profileName, setProfileName] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("professional_profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.full_name) setProfileName(data.full_name);
      });
  }, [user]);

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
        {profileName && (
          <p className="text-sm text-muted-foreground">Hola, <span className="font-semibold text-foreground">{profileName}</span> 👋</p>
        )}
        <MonthlyKPI />
        <DayAgenda />
        <WorkOrders />
      </main>

      <BudgetGenerator />
    </div>
  );
};

export default Dashboard;
