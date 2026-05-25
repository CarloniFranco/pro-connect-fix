import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useProSubscriptionGate } from "@/hooks/useProSubscriptionGate";
import { isProNoSubAllowedRoute } from "@/lib/redirectUser";
import { Loader2 } from "lucide-react";

interface PrivateRouteProps {
  children: ReactNode;
}

const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const { user, loading } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const { loading: subLoading, isPro, hasActive } = useProSubscriptionGate(user?.id);
  const location = useLocation();

  if (loading || (user && roleLoading) || (user && !isAdmin && subLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admins only have access to admin routes
  if (isAdmin && !location.pathname.startsWith("/admin")) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // Pros without an active paid subscription are locked to plan/payment routes
  if (!isAdmin && isPro && !hasActive && !isProNoSubAllowedRoute(location.pathname)) {
    return <Navigate to="/seleccionar-plan" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
