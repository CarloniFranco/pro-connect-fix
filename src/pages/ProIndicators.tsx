import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3, Loader2 } from "lucide-react";
import MonthlyKPI from "@/components/dashboard/MonthlyKPI";
import AIReportGenerator from "@/components/dashboard/AIReportGenerator";
import BusinessStats from "@/components/dashboard/BusinessStats";

const ProIndicators = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

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
        <div className="container mx-auto flex h-14 max-w-4xl items-center gap-2 px-3 sm:px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex min-w-0 items-center gap-2">
            <BarChart3 className="h-5 w-5 shrink-0 text-primary" />
            <h1 className="truncate font-display text-base font-bold text-foreground sm:text-lg">
              Indicadores
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl space-y-5 px-3 py-5 sm:space-y-6 sm:px-4 sm:py-6">
        <p className="text-sm text-muted-foreground">
          Métricas, reportes y estadísticas de tu negocio en un solo lugar.
        </p>
        <MonthlyKPI />
        <AIReportGenerator />
        <BusinessStats />
      </main>
    </div>
  );
};

export default ProIndicators;
