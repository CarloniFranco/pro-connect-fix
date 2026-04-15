import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";

const TermsAndConditions = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto max-w-3xl px-4 pt-24 pb-16">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>

        <h1 className="mb-2 font-display text-2xl font-bold text-foreground md:text-3xl">
          Términos y Condiciones de Uso – Plataforma "FIX"
        </h1>
        <p className="mb-8 text-sm text-muted-foreground">Última actualización: 15 de abril de 2026</p>

        <div className="prose prose-sm max-w-none text-card-foreground space-y-6">
          <p>
            El presente documento constituye el contrato legal entre FIX (en adelante, "la Plataforma") y cualquier persona física o jurídica que acceda, navegue o utilice sus servicios, ya sea como Usuario Solicitante o como Profesional Prestador.
          </p>

          <h2 className="text-lg font-bold text-foreground mt-8">1. NATURALEZA DEL SERVICIO Y EXONERACIÓN DE RESPONSABILIDAD</h2>
          <p><strong>1.1. Intermediación Tecnológica:</strong> FIX es una plataforma digital de intermediación que conecta la demanda de servicios (Usuarios) con la oferta de servicios independientes (Profesionales). FIX no es una empresa de servicios, ni una constructora, ni una agencia de empleo.</p>
          <p><strong>1.2. Independencia de las Partes:</strong> Los Profesionales actúan de forma independiente y autónoma. No existe relación de dependencia, sociedad ni vínculo laboral entre FIX y los Profesionales.</p>
          <p><strong>1.3. Exclusión de Responsabilidad:</strong> FIX no se hace responsable por la calidad, idoneidad, seguridad, tiempos de entrega ni por cualquier daño (material o físico) derivado de la ejecución del servicio contratado. La responsabilidad civil y técnica recae exclusivamente sobre el Profesional.</p>

          <h2 className="text-lg font-bold text-foreground mt-8">2. EL SISTEMA DE RESERVA Y "SEÑA DE RESARCIMIENTO"</h2>
          <p><strong>2.1. Constitución de la Seña:</strong> Para confirmar la reserva de un turno, el Usuario deberá abonar a través de la Plataforma una "Seña de Reserva". Este monto actúa como garantía de compromiso.</p>
          <p><strong>2.2. Resarcimiento al Profesional:</strong> En caso de que el Profesional asista al domicilio acordado en fecha y hora, y el trabajo no pueda realizarse por causas imputables al Usuario (ausencia, falta de acceso al lugar, información falsa), la seña será retenida y entregada al Profesional en concepto de resarcimiento por traslado y lucro cesante.</p>
          <p><strong>2.3. Validación de Incumplimiento:</strong> El Profesional deberá proporcionar a la Plataforma pruebas verídicas (fotografías con geolocalización, capturas de mensajes sin respuesta o registro de llamadas) para ejecutar el cobro de la seña por incumplimiento del Usuario.</p>
          <p><strong>2.4. Devolución de la Seña:</strong> Una vez que el servicio ha sido prestado y finalizado con éxito, la Plataforma procederá a la devolución de la seña al Usuario (o su aplicación como parte de pago si así se configurase), quedando el pago total del servicio a ser transaccionado directamente entre Usuario y Profesional sin intervención de FIX.</p>

          <h2 className="text-lg font-bold text-foreground mt-8">3. RÉGIMEN PARA PROFESIONALES (SAAS)</h2>
          <p><strong>3.1. Suscripción:</strong> Los Profesionales abonan una tarifa mensual fija (SaaS) por el derecho de uso de las herramientas de gestión e IA y la visibilidad en el Marketplace.</p>
          <p><strong>3.2. Política de 0% Comisión:</strong> FIX no percibe porcentaje ni comisión alguna sobre el valor total de los servicios realizados. La rentabilidad del trabajo es 100% propiedad del Profesional.</p>
          <p><strong>3.3. Ranking Meritocrático:</strong> El orden de aparición en las búsquedas se rige estrictamente por un algoritmo de mérito basado en:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Velocidad:</strong> Tiempo de respuesta a solicitudes.</li>
            <li><strong>Confiabilidad:</strong> Ratio de asistencia y cumplimiento de turnos.</li>
            <li><strong>Excelencia:</strong> Valoraciones post-servicio de los Usuarios.</li>
          </ul>
          <p>FIX se reserva el derecho de dar de baja perfiles que afecten la integridad de la comunidad o mantengan estándares por debajo de los mínimos requeridos.</p>

          <h2 className="text-lg font-bold text-foreground mt-8">4. PROPIEDAD INTELECTUAL Y DATOS</h2>
          <p><strong>4.1.</strong> El nombre, logo y las herramientas de Inteligencia Artificial (IA) para presupuestos son propiedad exclusiva de FIX.</p>
          <p><strong>4.2.</strong> El uso de la IA por parte del Profesional es una herramienta de asistencia; el Profesional es el único responsable de validar y confirmar que los montos y materiales presupuestados sean los correctos antes de enviarlos al Usuario.</p>

          <h2 className="text-lg font-bold text-foreground mt-8">5. JURISDICCIÓN Y LEY APLICABLE</h2>
          <p>Para cualquier controversia derivada del uso de la Plataforma, las partes se someten a la jurisdicción de los Tribunales Ordinarios de la Ciudad de Mendoza, Provincia de Mendoza, renunciando a cualquier otro fuero o jurisdicción.</p>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;
