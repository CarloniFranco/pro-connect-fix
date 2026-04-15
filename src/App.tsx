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
import Auth from "./pages/Auth.tsx";
import ClientAuth from "./pages/ClientAuth.tsx";
import ClientProfileSetup from "./pages/ClientProfileSetup.tsx";
import ProfessionalProfile from "./pages/ProfessionalProfile.tsx";
import HomeServices from "./pages/HomeServices.tsx";
import PersonalServices from "./pages/PersonalServices.tsx";
import ProfessionalsList from "./pages/ProfessionalsList.tsx";
import ProfessionalPublicProfile from "./pages/ProfessionalPublicProfile.tsx";
import TermsAndConditions from "./pages/TermsAndConditions.tsx";
import PlanSelection from "./pages/PlanSelection.tsx";
import PaymentSetup from "./pages/PaymentSetup.tsx";

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
            <Route path="/ingresar" element={<ClientAuth />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/terminos" element={<TermsAndConditions />} />
            <Route path="/servicios/hogar" element={<HomeServices />} />
            <Route path="/servicios/personal" element={<PersonalServices />} />
            <Route path="/profesionales/:category" element={<ProfessionalsList />} />
            <Route path="/profesional/:userId" element={<ProfessionalPublicProfile />} />

            {/* Protected routes */}
            <Route path="/completar-perfil" element={<PrivateRoute><ClientProfileSetup /></PrivateRoute>} />
            <Route path="/perfil-profesional" element={<PrivateRoute><ProfessionalProfile /></PrivateRoute>} />
            <Route path="/seleccionar-plan" element={<PrivateRoute><PlanSelection /></PrivateRoute>} />
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
