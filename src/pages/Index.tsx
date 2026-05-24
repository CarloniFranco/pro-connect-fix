import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ProCTA from "@/components/ProCTA";
import HowItWorks from "@/components/HowItWorks";
import SocialProof from "@/components/SocialProof";
import Testimonials from "@/components/Testimonials";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import FelixLogo from "@/components/FelixLogo";


const Index = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useIsAdmin();
  useEffect(() => {
    if (!loading && isAdmin) navigate("/admin/dashboard", { replace: true });
  }, [isAdmin, loading, navigate]);
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <SocialProof />
      <HowItWorks />
      <Testimonials />
      <ProCTA />
      <footer className="border-t border-border px-4 py-8 text-center">
        <div className="flex items-center justify-center gap-2">
          <FelixLogo className="h-7 w-7" wink />
          <p className="font-display text-lg font-bold text-foreground">FIX</p>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          © 2026 FIX · Tu problema, <strong className="font-bold">resuelto</strong>.
        </p>
        <Link to="/terminos" className="mt-2 inline-block text-xs text-primary hover:underline font-semibold">
          Términos y Condiciones
        </Link>
      </footer>
    </div>
  );
};

export default Index;
