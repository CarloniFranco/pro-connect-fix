import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/ingresar" element={<ClientAuth />} />
            <Route path="/completar-perfil" element={<ClientProfileSetup />} />
            <Route path="/servicios/hogar" element={<HomeServices />} />
            <Route path="/servicios/personal" element={<PersonalServices />} />
            <Route path="/profesionales/:category" element={<ProfessionalsList />} />
            <Route path="/profesional/:userId" element={<ProfessionalPublicProfile />} />
            <Route path="/terminos" element={<TermsAndConditions />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/perfil-profesional" element={<ProfessionalProfile />} />
            <Route path="/dashboard" element={<Dashboard />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
