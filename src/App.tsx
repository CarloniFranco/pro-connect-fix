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
import ClientFavorites from "./pages/ClientFavorites.tsx";
import ProfessionalProfile from "./pages/ProfessionalProfile.tsx";
import ProProfileView from "./pages/ProProfileView.tsx";
import ProWorkHistory from "./pages/ProWorkHistory.tsx";
import ProSubscription from "./pages/ProSubscription.tsx";
import ProIndicators from "./pages/ProIndicators.tsx";
import HomeServices from "./pages/HomeServices.tsx";
import PersonalServices from "./pages/PersonalServices.tsx";
import VehicleServices from "./pages/VehicleServices.tsx";
import PetServices from "./pages/PetServices.tsx";
import ProfessionalsList from "./pages/ProfessionalsList.tsx";
import ProfessionalPublicProfile from "./pages/ProfessionalPublicProfile.tsx";
import TermsAndConditions from "./pages/TermsAndConditions.tsx";
import PlanSelection from "./pages/PlanSelection.tsx";
import PaymentSetup from "./pages/PaymentSetup.tsx";

import DepositConfirmed from "./pages/DepositConfirmed.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import LegacyRedirect from "./pages/Auth.tsx";
import AdminDniVerifications from "./pages/AdminDniVerifications.tsx";
import AdminLayout from "./components/admin/AdminLayout.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import AdminProfessionals from "./pages/AdminProfessionals.tsx";
import AdminClients from "./pages/AdminClients.tsx";
import AdminOrders from "./pages/AdminOrders.tsx";
import AdminSubscriptions from "./pages/AdminSubscriptions.tsx";
import AdminPlanPrices from "./pages/AdminPlanPrices.tsx";
import AdminBroadcast from "./pages/AdminBroadcast.tsx";
import MercadoPagoConnect from "./pages/MercadoPagoConnect.tsx";
import MercadoPagoCallback from "./pages/MercadoPagoCallback.tsx";



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
            <Route path="/ingresar" element={<LegacyRedirect />} />
            <Route path="/auth" element={<LegacyRedirect />} />
            <Route path="/terminos" element={<TermsAndConditions />} />
            <Route path="/servicios/hogar" element={<HomeServices />} />
            <Route path="/servicios/personal" element={<PersonalServices />} />
            <Route path="/servicios/vehiculo" element={<VehicleServices />} />
            <Route path="/servicios/mascotas" element={<PetServices />} />
            <Route path="/profesionales/:category" element={<ProfessionalsList />} />
            <Route path="/profesional/:userId" element={<ProfessionalPublicProfile />} />
            
            <Route path="/sena/confirmada" element={<DepositConfirmed />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Client protected routes */}
            <Route path="/completar-perfil" element={<PrivateRoute><ClientProfileSetup /></PrivateRoute>} />
            <Route path="/mi-perfil" element={<PrivateRoute><ClientProfile /></PrivateRoute>} />
            <Route path="/mis-pedidos" element={<PrivateRoute><ClientOrders /></PrivateRoute>} />
            <Route path="/mis-favoritos" element={<PrivateRoute><ClientFavorites /></PrivateRoute>} />

            {/* Professional protected routes */}
            <Route path="/perfil-profesional" element={<PrivateRoute><ProfessionalProfile /></PrivateRoute>} />
            <Route path="/mi-perfil-pro" element={<PrivateRoute><ProProfileView /></PrivateRoute>} />
            <Route path="/historial-trabajos" element={<PrivateRoute><ProWorkHistory /></PrivateRoute>} />
            <Route path="/mi-suscripcion" element={<PrivateRoute><ProSubscription /></PrivateRoute>} />
            <Route path="/indicadores" element={<PrivateRoute><ProIndicators /></PrivateRoute>} />
            <Route path="/seleccionar-plan" element={<PrivateRoute><PlanSelection /></PrivateRoute>} />
            <Route path="/configurar-pago" element={<PrivateRoute><PaymentSetup /></PrivateRoute>} />
            <Route path="/conectar-mercadopago" element={<PrivateRoute><MercadoPagoConnect /></PrivateRoute>} />
            <Route path="/mp-oauth-callback" element={<PrivateRoute><MercadoPagoCallback /></PrivateRoute>} />
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/admin" element={<PrivateRoute><AdminLayout /></PrivateRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="verificaciones" element={<AdminDniVerifications />} />
              <Route path="profesionales" element={<AdminProfessionals />} />
              <Route path="clientes" element={<AdminClients />} />
              <Route path="pedidos" element={<AdminOrders />} />
              <Route path="suscripciones" element={<AdminSubscriptions />} />
              <Route path="precios" element={<AdminPlanPrices />} />
              <Route path="broadcast" element={<AdminBroadcast />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
          
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
