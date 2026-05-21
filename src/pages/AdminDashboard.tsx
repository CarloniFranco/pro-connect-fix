import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, Users, ClipboardList, CreditCard, ShieldAlert, DollarSign, Loader2 } from "lucide-react";

interface Stats {
  pros: number;
  clients: number;
  ordersTotal: number;
  ordersThisMonth: number;
  activeSubs: number;
  pendingDni: number;
  revenueThisMonth: number;
}

const Card = ({ icon: Icon, label, value, hint }: { icon: any; label: string; value: string | number; hint?: string }) => (
  <div className="rounded-2xl border bg-card p-5">
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">{label}</p>
      <Icon className="h-5 w-5 text-primary" />
    </div>
    <p className="mt-2 font-display text-3xl font-bold">{value}</p>
    {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
  </div>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const load = async () => {
      const startMonth = new Date();
      startMonth.setDate(1);
      startMonth.setHours(0, 0, 0, 0);
      const startMonthIso = startMonth.toISOString();

      const [pros, clients, ordersTotal, ordersMonth, subs, dni, finishedMonth] = await Promise.all([
        supabase.from("professional_profiles").select("user_id", { count: "exact", head: true }),
        supabase.from("client_profiles").select("user_id", { count: "exact", head: true }),
        supabase.from("service_requests").select("id", { count: "exact", head: true }),
        supabase.from("service_requests").select("id", { count: "exact", head: true }).gte("created_at", startMonthIso),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }).in("status", ["active", "authorized", "trialing"]),
        supabase.from("professional_verification").select("user_id", { count: "exact", head: true }).eq("dni_verification_status", "en_revision"),
        supabase.from("service_requests").select("quoted_amount").eq("status", "finalizada").gte("completed_at", startMonthIso),
      ]);

      const revenue = (finishedMonth.data || []).reduce((s, r: any) => s + (Number(r.quoted_amount) || 0), 0);

      setStats({
        pros: pros.count || 0,
        clients: clients.count || 0,
        ordersTotal: ordersTotal.count || 0,
        ordersThisMonth: ordersMonth.count || 0,
        activeSubs: subs.count || 0,
        pendingDni: dni.count || 0,
        revenueThisMonth: revenue,
      });
    };
    load();
  }, []);

  if (!stats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <h2 className="font-display text-2xl font-bold">Resumen general</h2>
      <p className="text-sm text-muted-foreground">Métricas en tiempo real de la plataforma</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card icon={Briefcase} label="Profesionales" value={stats.pros} />
        <Card icon={Users} label="Clientes" value={stats.clients} />
        <Card icon={ShieldAlert} label="DNI por verificar" value={stats.pendingDni} hint="En revisión" />
        <Card icon={ClipboardList} label="Pedidos totales" value={stats.ordersTotal} />
        <Card icon={ClipboardList} label="Pedidos este mes" value={stats.ordersThisMonth} />
        <Card icon={CreditCard} label="Suscripciones activas" value={stats.activeSubs} />
        <Card
          icon={DollarSign}
          label="Ingresos del mes (servicios finalizados)"
          value={`$${stats.revenueThisMonth.toLocaleString("es-AR")}`}
        />
      </div>
    </div>
  );
};

export default AdminDashboard;
