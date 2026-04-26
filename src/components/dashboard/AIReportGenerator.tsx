import { useState } from "react";
import { Sparkles, Loader2, Calendar, FileText, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

type Period = "week" | "month" | "year";

const periodLabels: Record<Period, string> = {
  week: "Semanal",
  month: "Mensual",
  year: "Anual",
};

const AIReportGenerator = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<Period | null>(null);
  const [report, setReport] = useState<string>("");
  const [periodLabel, setPeriodLabel] = useState<string>("");

  const generate = async (period: Period) => {
    setLoading(period);
    setReport("");
    try {
      const { data, error } = await supabase.functions.invoke("generate-pro-report", {
        body: { period },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setReport(data.report);
      setPeriodLabel(data.period || periodLabels[period]);
      setOpen(true);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Error al generar el reporte");
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <CardContent className="p-4 sm:p-5">
          <div className="mb-3 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-base font-bold text-foreground sm:text-lg">
                Reporte con IA
              </h3>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Análisis inteligente de tu performance con recomendaciones para crecer.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(periodLabels) as Period[]).map((p) => (
              <Button
                key={p}
                variant="outline"
                size="sm"
                onClick={() => generate(p)}
                disabled={loading !== null}
                className="flex flex-col h-auto py-2 gap-1"
              >
                {loading === p ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Calendar className="h-4 w-4" />
                )}
                <span className="text-xs font-semibold">{periodLabels[p]}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden p-0 gap-0">
          <DialogHeader className="border-b border-border bg-gradient-to-r from-primary/10 to-secondary/10 px-4 py-3">
            <DialogTitle className="flex items-center gap-2 font-display text-base">
              <FileText className="h-4 w-4 text-primary" />
              Reporte {periodLabel}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto px-4 py-4 sm:px-6 sm:py-5" style={{ maxHeight: "calc(90vh - 60px)" }}>
            <article className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-display prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-li:text-foreground/90">
              <ReactMarkdown>{report}</ReactMarkdown>
            </article>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AIReportGenerator;
