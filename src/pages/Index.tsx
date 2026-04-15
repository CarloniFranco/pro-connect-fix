import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ProCTA from "@/components/ProCTA";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <ProCTA />
      <footer className="border-t border-border px-4 py-8 text-center">
        <p className="font-display text-lg font-bold text-foreground">FIX</p>
        <p className="mt-1 text-xs text-muted-foreground">
          © 2026 FIX. Todos los derechos reservados.
        </p>
        <Link to="/terminos" className="mt-2 inline-block text-xs text-primary hover:underline font-semibold">
          Términos y Condiciones
        </Link>
      </footer>
    </div>
  );
};

export default Index;
