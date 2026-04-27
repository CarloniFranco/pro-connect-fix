import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Award,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Trophy,
  CalendarCheck,
  BarChart3,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

interface ScoreData {
  total_score: number;
  velocity: number;
  reliability: number;
  excellence: number;
  review_count: number;
  decline_rate: number;
}

interface MonthlyRevenue {
  label: string;
  revenue: number;
  jobs: number;
}

interface ServiceStat {
  service_type: string;
  count: number;
  revenue: number;
}

interface ConversionStats {
  conversionRate: number;
  avgResponseMinutes: number | null;
  newCount: number;
  acceptedCount: number;
}

interface CompareStats {
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  thisMonthJobs: number;
  lastMonthJobs: number;
  thisMonthTicket: number;
  lastMonthTicket: number;
}

interface UpcomingDay {
  date: string;
  label: string;
  count: number;
}

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const formatCompact = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(".", ",")}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n}`;
};

export default function BusinessStats() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState<ScoreData | null>(null);
  const [monthly, setMonthly] = useState<MonthlyRevenue[]>([]);
  const [topServices, setTopServices] = useState<ServiceStat[]>([]);
  const [conversion, setConversion] = useState<ConversionStats | null>(null);
  const [compare, setCompare] = useState<CompareStats | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingDay[]>([]);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const last30 = new Date(Date.now() - 30 * 86400000);
    const last90 = new Date(Date.now() - 90 * 86400000);
    const next7 = new Date(Date.now() + 7 * 86400000);

    // 1. Score (RPC)
    const { data: scoreData } = await supabase.rpc("get_professional_score", {
      p_professional_id: user.id,
    });
    if (scoreData) setScore(scoreData as unknown as ScoreData);

    // 2. Monthly revenue last 6 months (finalizada por completed_at)
    const { data: finishedAll } = await supabase
      .from("service_requests")
      .select("quoted_amount, completed_at")
      .eq("professional_id", user.id)
      .eq("status", "finalizada" as any)
      .gte("completed_at", sixMonthsAgo.toISOString())
      .not("completed_at", "is", null);

    const buckets = new Map<string, { revenue: number; jobs: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      buckets.set(key, { revenue: 0, jobs: 0 });
    }
    (finishedAll || []).forEach((r: any) => {
      if (!r.completed_at) return;
      const d = new Date(r.completed_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const b = buckets.get(key);
      if (b) {
        b.revenue += Number(r.quoted_amount) || 0;
        b.jobs += 1;
      }
    });
    const monthlyArr: MonthlyRevenue[] = [];
    buckets.forEach((v, k) => {
      const [, m] = k.split("-").map(Number);
      monthlyArr.push({ label: MONTH_LABELS[m], revenue: v.revenue, jobs: v.jobs });
    });
    setMonthly(monthlyArr);

    // 3. Top servicios últimos 90 días (finalizadas + en curso)
    const { data: services90 } = await supabase
      .from("service_requests")
      .select("service_type, quoted_amount, status")
      .eq("professional_id", user.id)
      .in("status", ["finalizada", "aceptada", "en_servicio"] as any)
      .gte("created_at", last90.toISOString());

    const svcMap = new Map<string, { count: number; revenue: number }>();
    (services90 || []).forEach((r: any) => {
      const key = (r.service_type || "Sin categoría").trim();
      const cur = svcMap.get(key) || { count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += Number(r.quoted_amount) || 0;
      svcMap.set(key, cur);
    });
    const sortedSvc = [...svcMap.entries()]
      .map(([service_type, v]) => ({ service_type, count: v.count, revenue: v.revenue }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    setTopServices(sortedSvc);

    // 4. Tasa de conversión últimos 30 días + tiempo de respuesta
    const { data: requests30 } = await supabase
      .from("service_requests")
      .select("status, created_at, responded_at")
      .eq("professional_id", user.id)
      .gte("created_at", last30.toISOString());

    const reqs = (requests30 || []) as any[];
    const newC = reqs.length;
    const acceptedC = reqs.filter(
      (r) => r.status === "aceptada" || r.status === "en_servicio" || r.status === "finalizada"
    ).length;
    const responded = reqs.filter((r) => r.responded_at);
    const avgMin =
      responded.length > 0
        ? responded.reduce((s, r) => {
            const diff = (new Date(r.responded_at).getTime() - new Date(r.created_at).getTime()) / 60000;
            return s + diff;
          }, 0) / responded.length
        : null;
    setConversion({
      newCount: newC,
      acceptedCount: acceptedC,
      conversionRate: newC > 0 ? Math.round((acceptedC / newC) * 100) : 0,
      avgResponseMinutes: avgMin,
    });

    // 5. Comparativa mes actual vs anterior
    const { data: thisMonth } = await supabase
      .from("service_requests")
      .select("quoted_amount, status, created_at, completed_at")
      .eq("professional_id", user.id)
      .or(
        `and(status.eq.finalizada,completed_at.gte.${startThisMonth.toISOString()}),and(status.in.(aceptada,en_servicio),created_at.gte.${startThisMonth.toISOString()})`
      );

    const { data: lastMonth } = await supabase
      .from("service_requests")
      .select("quoted_amount, status, created_at, completed_at")
      .eq("professional_id", user.id)
      .or(
        `and(status.eq.finalizada,completed_at.gte.${startLastMonth.toISOString()},completed_at.lte.${endLastMonth.toISOString()}),and(status.in.(aceptada,en_servicio),created_at.gte.${startLastMonth.toISOString()},created_at.lte.${endLastMonth.toISOString()})`
      );

    const sumRev = (arr: any[] | null) =>
      (arr || []).reduce((s, r) => s + (Number(r.quoted_amount) || 0), 0);
    const tmRev = sumRev(thisMonth);
    const lmRev = sumRev(lastMonth);
    const tmJobs = (thisMonth || []).length;
    const lmJobs = (lastMonth || []).length;
    setCompare({
      thisMonthRevenue: tmRev,
      lastMonthRevenue: lmRev,
      thisMonthJobs: tmJobs,
      lastMonthJobs: lmJobs,
      thisMonthTicket: tmJobs > 0 ? tmRev / tmJobs : 0,
      lastMonthTicket: lmJobs > 0 ? lmRev / lmJobs : 0,
    });

    // 6. Próximos 7 días con turnos confirmados
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data: upcomingData } = await supabase
      .from("service_requests")
      .select("scheduled_date")
      .eq("professional_id", user.id)
      .in("status", ["aceptada", "en_servicio"] as any)
      .eq("deposit_paid", true)
      .gte("scheduled_date", today.toISOString().split("T")[0])
      .lte("scheduled_date", next7.toISOString().split("T")[0]);

    const dayMap = new Map<string, number>();
    (upcomingData || []).forEach((r: any) => {
      if (!r.scheduled_date) return;
      dayMap.set(r.scheduled_date, (dayMap.get(r.scheduled_date) || 0) + 1);
    });
    const upArr: UpcomingDay[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + i);
      const ds = d.toISOString().split("T")[0];
      upArr.push({
        date: ds,
        label: i === 0 ? "Hoy" : i === 1 ? "Mañana" : `${DAY_LABELS[d.getDay()]} ${d.getDate()}`,
        count: dayMap.get(ds) || 0,
      });
    }
    setUpcoming(upArr);

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const variation = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const revenueVar = compare ? variation(compare.thisMonthRevenue, compare.lastMonthRevenue) : 0;
  const jobsVar = compare ? variation(compare.thisMonthJobs, compare.lastMonthJobs) : 0;
  const ticketVar = compare ? variation(compare.thisMonthTicket, compare.lastMonthTicket) : 0;

  const formatResponse = (min: number | null) => {
    if (min === null) return "—";
    if (min < 1) return "<1 min";
    if (min < 60) return `${Math.round(min)} min`;
    const h = min / 60;
    if (h < 24) return `${h.toFixed(1).replace(".", ",")} h`;
    return `${Math.round(h / 24)} días`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h2 className="font-display text-lg font-bold text-foreground">Estadísticas del negocio</h2>
      </div>

      {/* Reputación / Score */}
      {score && (
        <Card className="overflow-hidden border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-display">
              <Trophy className="h-4 w-4 text-accent-foreground" />
              Tu reputación FIX
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end gap-2">
              <span className="font-display text-4xl font-bold text-primary tabular-nums leading-none">
                {score.total_score.toFixed(1).replace(".", ",")}
              </span>
              <span className="text-sm text-muted-foreground mb-1">/ 5,0</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {score.review_count} reseñas
              </span>
            </div>

            <ScoreBar label="Velocidad" value={score.velocity} icon={<Clock className="h-3 w-3" />} />
            <ScoreBar label="Confiabilidad" value={score.reliability} icon={<Target className="h-3 w-3" />} />
            <ScoreBar label="Excelencia" value={score.excellence} icon={<Award className="h-3 w-3" />} />

            {score.decline_rate > 10 && (
              <p className="text-[11px] text-destructive bg-destructive/10 rounded p-2">
                Tasa de rechazo: {score.decline_rate.toFixed(1).replace(".", ",")}% — bajala para mejorar tu confiabilidad.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Comparativa mes actual vs anterior */}
      {compare && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Este mes vs. mes anterior</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-2">
            <CompareCell label="Ingresos" value={formatCompact(compare.thisMonthRevenue)} variation={revenueVar} />
            <CompareCell label="Trabajos" value={String(compare.thisMonthJobs)} variation={jobsVar} />
            <CompareCell label="Ticket prom." value={formatCompact(compare.thisMonthTicket)} variation={ticketVar} />
          </CardContent>
        </Card>
      )}

      {/* Gráfico de ingresos 6 meses */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-display">Ingresos últimos 6 meses</CardTitle>
        </CardHeader>
        <CardContent>
          {monthly.every((m) => m.revenue === 0) ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Todavía no hay ingresos registrados.
            </p>
          ) : (
            <div className="h-44 -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCompact(v)} width={48} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value: number, _name, props: any) => [
                      `${formatCurrency(value)} · ${props.payload.jobs} trabajos`,
                      "Ingresos",
                    ]}
                  />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                    {monthly.map((_, i) => (
                      <Cell key={i} fill={i === monthly.length - 1 ? "hsl(var(--primary))" : "hsl(var(--secondary))"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tasa de conversión + tiempo de respuesta */}
      {conversion && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Conversión (últimos 30 días)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/40 p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Target className="h-3 w-3" /> Tasa de conversión
              </div>
              <p className="font-display text-2xl font-bold text-foreground tabular-nums">
                {conversion.conversionRate}%
              </p>
              <p className="text-[11px] text-muted-foreground">
                {conversion.acceptedCount} de {conversion.newCount} solicitudes
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" /> Tiempo de respuesta
              </div>
              <p className="font-display text-2xl font-bold text-foreground tabular-nums">
                {formatResponse(conversion.avgResponseMinutes)}
              </p>
              <p className="text-[11px] text-muted-foreground">promedio</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top servicios */}
      {topServices.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Servicios más vendidos (90 días)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topServices.map((s, i) => {
              const max = topServices[0].count;
              const pct = (s.count / max) * 100;
              return (
                <div key={s.service_type} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground truncate flex-1 mr-2">
                      {i + 1}. {s.service_type}
                    </span>
                    <span className="tabular-nums text-muted-foreground shrink-0">
                      {s.count} · {formatCompact(s.revenue)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Próximos 7 días */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-display">
            <CalendarCheck className="h-4 w-4 text-primary" />
            Próximos 7 días
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1.5">
            {upcoming.map((d) => (
              <div
                key={d.date}
                className={`flex flex-col items-center rounded-lg p-2 text-center ${
                  d.count > 0 ? "bg-primary/10 border border-primary/30" : "bg-muted/40 border border-transparent"
                }`}
              >
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                  {d.label}
                </span>
                <span
                  className={`font-display text-lg font-bold tabular-nums ${
                    d.count > 0 ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {d.count}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 text-center">
            Cantidad de turnos confirmados por día
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ScoreBar({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  const pct = (value / 5) * 100;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="flex items-center gap-1 text-muted-foreground">
          {icon} {label}
        </span>
        <span className="tabular-nums font-semibold text-foreground">
          {value.toFixed(1).replace(".", ",")} / 5
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-secondary to-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function CompareCell({ label, value, variation }: { label: string; value: string; variation: number }) {
  const positive = variation > 0;
  const negative = variation < 0;
  return (
    <div className="rounded-lg bg-muted/40 p-2.5 text-center">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="font-display text-base font-bold text-foreground tabular-nums leading-tight">{value}</p>
      <p
        className={`flex items-center justify-center gap-0.5 text-[10px] font-semibold ${
          positive ? "text-green-600" : negative ? "text-destructive" : "text-muted-foreground"
        }`}
      >
        {positive ? <TrendingUp className="h-3 w-3" /> : negative ? <TrendingDown className="h-3 w-3" /> : null}
        {variation > 0 ? "+" : ""}
        {variation}%
      </p>
    </div>
  );
}
