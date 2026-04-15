import { useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";

export default function CheckoutReturn() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (sessionId) {
      toast.success("¡Pago realizado con éxito!");
    }
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto max-w-md px-4 pt-24 text-center">
        <div className="rounded-2xl border-2 border-border bg-card p-8 shadow-md">
          {sessionId ? (
            <>
              <div className="text-5xl mb-4">✅</div>
              <h1 className="text-2xl font-bold text-card-foreground mb-2">¡Pago confirmado!</h1>
              <p className="text-sm text-muted-foreground mb-4">
                Tu seña fue procesada correctamente. El turno quedó confirmado en la agenda del profesional.
              </p>
              <a href="/mis-pedidos" className="text-primary font-semibold underline text-sm">
                Ver mis pedidos
              </a>
            </>
          ) : (
            <>
              <div className="text-5xl mb-4">⚠️</div>
              <h1 className="text-2xl font-bold text-card-foreground mb-2">Sin información</h1>
              <p className="text-sm text-muted-foreground">
                No se encontró información de la sesión de pago.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
