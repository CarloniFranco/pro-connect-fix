import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { CheckCircle2, Calendar, Clock, Wrench, AlertTriangle, ShieldCheck, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import FelixLogo from "@/components/FelixLogo";

interface ServiceRequestData {
  id: string;
  service_type: string;
  quoted_amount: number | null;
  deposit_amount: number | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  professional_id: string;
  deposit_paid: boolean;
  status: string;
}

interface ProfessionalData {
  full_name: string;
  rubro: string;
  phone: string | null;
}

export default function DepositConfirmed() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const requestId = params.get("request");
  const status = params.get("deposit"); // success | pending | failure

  const [loading, setLoading] = useState(true);
  const [req, setReq] = useState<ServiceRequestData | null>(null);
  const [pro, setPro] = useState<ProfessionalData | null>(null);

  useEffect(() => {
    if (!requestId) {
      setLoading(false);
      return;
    }
    (async () => {
      // Poll briefly in case webhook hasn't confirmed deposit_paid yet
      let attempts = 0;
      let data: any = null;
      while (attempts < 4) {
        const r = await supabase
          .from("service_requests")
          .select("id, service_type, quoted_amount, deposit_amount, scheduled_date, scheduled_time, professional_id, deposit_paid, status")
          .eq("id", requestId)
          .maybeSingle();
        data = r.data;
        if (data?.deposit_paid || attempts === 3 || status !== "success") break;
        await new Promise((res) => setTimeout(res, 1500));
        attempts++;
      }

      // Safety net: si MP nos devolvió success pero el webhook no llegó, reconciliamos
      if (status === "success" && data && !data.deposit_paid) {
        try {
          const { data: rec } = await supabase.functions.invoke("mp-reconcile-deposit", {
            body: { service_request_id: requestId },
          });
          if (rec?.paid) {
            const r2 = await supabase
              .from("service_requests")
              .select("id, service_type, quoted_amount, deposit_amount, scheduled_date, scheduled_time, professional_id, deposit_paid, status")
              .eq("id", requestId)
              .maybeSingle();
            data = r2.data;
          }
        } catch (e) {
          console.warn("reconcile failed", e);
        }
      }

      setReq(data);
      if (data?.professional_id) {
        const { data: p } = await supabase
          .from("professional_profiles")
          .select("full_name, rubro, phone")
          .eq("user_id", data.professional_id)
          .maybeSingle();
        setPro(p as ProfessionalData | null);
      }
      setLoading(false);
    })();
  }, [requestId, status]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isFailure = status === "failure";
  const isPending = status === "pending" || (status === "success" && req && !req.deposit_paid);

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
  };
  const formatTime = (t: string | null) => (t ? t.slice(0, 5) + " hs" : "—");

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto max-w-xl px-4 py-8">
        {/* Logo FIX */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <FelixLogo className="h-10 w-10" />
          <span className="font-display text-2xl font-bold text-foreground">FIX</span>
        </div>

        {/* Card principal */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8">
          {isFailure ? (
            <>
              <div className="mb-4 flex justify-center">
                <FelixLogo className="h-28 w-28" mood="sad" />
              </div>
              <h1 className="text-center font-display text-2xl font-bold text-foreground">
                No pudimos procesar el pago
              </h1>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                A Felix le da pena: tu pago de la seña no se completó. Podés volver a intentarlo desde tus pedidos.
              </p>
            </>
          ) : isPending ? (
            <>
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-accent/10 p-3">
                  <Clock className="h-10 w-10 text-accent" />
                </div>
              </div>
              <h1 className="text-center font-display text-2xl font-bold text-foreground">
                Pago en proceso
              </h1>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                Mercado Pago está confirmando tu pago. Cuando se acredite, tu turno quedará confirmado automáticamente.
              </p>
            </>
          ) : (
            <>
              <div className="mb-4 flex justify-center">
                <FelixLogo className="h-28 w-28" mood="happy" />
              </div>
              <h1 className="text-center font-display text-2xl font-bold text-foreground">
                ¡Tu turno está confirmado!
              </h1>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                ¡Felix está festejando! Recibimos tu seña y reservamos el lugar para vos.
              </p>
            </>
          )}

          {/* Datos del turno */}
          {req && !isFailure && (
            <div className="mt-6 space-y-3 rounded-xl bg-muted/40 p-4">
              <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Datos del turno
              </h2>
              <div className="flex items-start gap-3">
                <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Servicio</p>
                  <p className="text-sm font-semibold text-foreground">{req.service_type}</p>
                </div>
              </div>
              {pro && (
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Profesional</p>
                    <p className="text-sm font-semibold text-foreground">{pro.full_name}</p>
                    <p className="text-xs text-muted-foreground">{pro.rubro}</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-start gap-2">
                  <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Fecha</p>
                    <p className="text-sm font-semibold capitalize text-foreground">{formatDate(req.scheduled_date)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Hora</p>
                    <p className="text-sm font-semibold text-foreground">{formatTime(req.scheduled_time)}</p>
                  </div>
                </div>
              </div>
              {(req.quoted_amount || req.deposit_amount) && (
                <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
                  {req.quoted_amount != null && (
                    <div>
                      <p className="text-xs text-muted-foreground">Monto total</p>
                      <p className="text-sm font-bold text-foreground">${Number(req.quoted_amount).toLocaleString("es-AR")}</p>
                    </div>
                  )}
                  {req.deposit_amount != null && (
                    <div>
                      <p className="text-xs text-muted-foreground">Seña pagada</p>
                      <p className="text-sm font-bold text-secondary">${Number(req.deposit_amount).toLocaleString("es-AR")}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Política de seña */}
          {!isFailure && (
            <div className="mt-5 space-y-3 rounded-xl border border-border/60 bg-background p-4">
              <h2 className="flex items-center gap-2 font-display text-sm font-bold text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Política de la seña
              </h2>
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary" />
                <p>
                  Si el <strong className="text-foreground">profesional cancela</strong> el turno, te reembolsamos
                  la seña automáticamente (puede demorar 2 a 10 días hábiles).
                </p>
              </div>
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary" />
                <p>
                  Si <strong className="text-foreground">cancelás con más de 24hs</strong> de anticipación, también
                  recibís el reembolso de la seña.
                </p>
              </div>
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                <p>
                  Si <strong className="text-foreground">cancelás con menos de 24hs</strong> del horario del turno,
                  la seña queda retenida y no se reembolsa.
                </p>
              </div>
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary" />
                <p>
                  Cuando el profesional <strong className="text-foreground">finalice</strong> el servicio, también
                  recibís el reembolso de la seña.
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => navigate("/mis-pedidos")} className="flex-1 gap-2">
              Ver mis pedidos <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <Link to="/">Volver al inicio</Link>
            </Button>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          ¿Dudas? Escribinos desde tu perfil y te ayudamos.
        </p>
      </div>
    </div>
  );
}
