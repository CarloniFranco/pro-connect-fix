import { ReactNode } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShieldCheck,
  Briefcase,
  Users,
  ClipboardList,
  CreditCard,
  DollarSign,
  Megaphone,
  LogOut,
  Wrench,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Loader2 } from "lucide-react";

const items = [
  { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Verificaciones DNI", url: "/admin/verificaciones", icon: ShieldCheck },
  { title: "Profesionales", url: "/admin/profesionales", icon: Briefcase },
  { title: "Clientes", url: "/admin/clientes", icon: Users },
  { title: "Pedidos", url: "/admin/pedidos", icon: ClipboardList },
  { title: "Suscripciones", url: "/admin/suscripciones", icon: CreditCard },
  { title: "Precios de planes", url: "/admin/precios", icon: DollarSign },
  { title: "Broadcast", url: "/admin/broadcast", icon: Megaphone },
];

const AdminSidebar = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };
  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="flex items-center gap-2 px-3 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Wrench className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold">FIX Admin</span>
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>Panel</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        `flex items-center gap-2 ${isActive ? "bg-muted font-semibold text-primary" : "hover:bg-muted/50"}`
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut} className="text-destructive">
              <LogOut className="h-4 w-4" />
              <span>Cerrar sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

const AdminLayout = ({ children }: { children?: ReactNode }) => {
  const { isAdmin, loading } = useIsAdmin();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!isAdmin) return null;
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AdminSidebar />
        <div className="flex flex-1 flex-col">
          <header className="flex h-12 items-center border-b bg-card px-3">
            <SidebarTrigger />
            <h1 className="ml-3 text-sm font-semibold text-muted-foreground">Panel de Administración</h1>
          </header>
          <main className="flex-1 overflow-auto">
            {children ?? <Outlet />}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
