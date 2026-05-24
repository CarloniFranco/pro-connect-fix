import { Briefcase, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ProCTA = () => {
  const navigate = useNavigate();
  return (
    <section className="px-4 pb-16 pt-8 md:pb-24 md:pt-12">
      <div className="container mx-auto max-w-4xl">
        <div
         
         
         
         
          className="relative overflow-hidden rounded-2xl border-primary/20 bg-gradient-to-br from-primary to-accent p-6 text-center shadow-[var(--shadow-felix)] md:p-10 border-slate-600 border-4"
        >

          <div className="relative z-10">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary-foreground/15 backdrop-blur-sm">
              <Briefcase className="h-7 w-7 text-primary-foreground" />
            </div>
            <h3 className="mb-2 font-display text-xl font-bold text-primary-foreground md:text-2xl">
              ¿Sos Profesional?
            </h3>
            <p className="mb-6 text-sm text-primary-foreground/80 md:text-base">
              Digitalizá tu negocio y llegá a más clientes
            </p>
            <button
             
             
              onClick={() => navigate("/registro")}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-foreground px-6 py-3 font-display text-sm font-bold text-primary shadow-lg transition-colors hover:bg-primary-foreground/90 md:px-8 md:py-4 md:text-base"
            >
              Quiero Digitalizar mi Negocio
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProCTA;
