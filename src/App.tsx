import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import PrivateRoute from "@/components/PrivateRoute";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Login from "./pages/Login.tsx";
import Register from "./pages/Register.tsx";
import ClientProfileSetup from "./pages/ClientProfileSetup.tsx";
import ClientProfile from "./pages/ClientProfile.tsx";
import ClientOrders from "./pages/ClientOrders.tsx";
import ProfessionalProfile from "./pages/ProfessionalProfile.tsx";
import HomeServices from "./pages/HomeServices.tsx";
import PersonalServices from "./pages/PersonalServices.tsx";
import ProfessionalsList from "./pages/ProfessionalsList.tsx";
import ProfessionalPublicProfile from "./pages/ProfessionalPublicProfile.tsx";
import TermsAndConditions from "./pages/TermsAndConditions.tsx";
import PlanSelection from "./pages/PlanSelection.tsx";
import PaymentSetup from "./pages/PaymentSetup.tsx";
import LegacyRedirect from "./pages/Auth.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Register />} />
            {/* Legacy redirects */}
            <Route path="/ingresar" element={<LegacyRedirect />} />
            <Route path="/auth" element={<LegacyRedirect />} />
            <Route path="/terminos" element={<TermsAndConditions />} />
            <Route path="/servicios/hogar" element={<HomeServices />} />
            <Route path="/servicios/personal" element={<PersonalServices />} />
            <Route path="/profesionales/:category" element={<ProfessionalsList />} />
            <Route path="/profesional/:userId" element={<ProfessionalPublicProfile />} />

            {/* Protected routes */}
            <Route path="/completar-perfil" element={<PrivateRoute><ClientProfileSetup /></PrivateRoute>} />
            <Route path="/mi-perfil" element={<PrivateRoute><ClientProfile /></PrivateRoute>} />
            <Route path="/mis-pedidos" element={<PrivateRoute><ClientOrders /></PrivateRoute>} />
            <Route path="/perfil-profesional" element={<PrivateRoute><ProfessionalProfile /></PrivateRoute>} />
            <Route path="/seleccionar-plan" element={<PrivateRoute><PlanSelection /></PrivateRoute>} />
            <Route path="/configurar-pago" element={<PrivateRoute><PaymentSetup /></PrivateRoute>} />
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
