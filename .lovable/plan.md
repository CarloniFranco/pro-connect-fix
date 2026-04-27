# Plan: 4 mejoras grandes para FIX

## 1. Notificaciones por Email (y WhatsApp opcional)

**Estado actual**: existe `send-notification` que solo crea notificaciones in-app (campanita). El trigger `notify_on_status_change` ya cubre todos los eventos clave: presupuesto recibido, aceptado/rechazado, seña pagada, servicio iniciado, finalizado, cancelaciones.

**Qué hago**:
- **Email (Resend connector)**: extender la edge function `send-notification` para que, además de insertar la notificación in-app, dispare un email al usuario destinatario usando Resend. Plantillas HTML simples con branding FIX (navy/teal/gold) por tipo de evento (`presupuesto_recibido`, `seña_pagada`, `servicio_iniciado`, `servicio_finalizado`, `cliente_cancelo`, `profesional_cancelo`). Se conecta vía gateway, sin pedir API key al usuario.
- Como los emails se disparan desde el trigger SQL (que llama a `notifications` directo, no a la edge function), agrego un **trigger AFTER INSERT en `notifications`** que llame con `pg_net` a la edge function `send-email-notification` para enviar el mail con los datos del usuario (busca email en `auth.users`).
- Agregar columna opcional `email_notifications_enabled` (default true) en `professional_profiles` y `client_profiles` para que el usuario pueda apagarlas desde su perfil.
- **WhatsApp**: Lovable no tiene connector nativo de WhatsApp Business API y Twilio WhatsApp requiere aprobación de plantillas + número verificado (proceso de días/semanas con Meta). Recomiendo **diferir WhatsApp para una segunda fase** y arrancar solo con email, que es instantáneo. Si querés avanzar igual, lo dejo planteado con Twilio (pedirías Account SID + Auth Token + número WhatsApp aprobado).

## 2. Pagos — ya está resuelto (aclaración)

Ya tenés Stripe integrado (gateway de Lovable, sin API keys propias):
- Suscripciones de profesionales (`create-checkout` + `payments-webhook` + tabla `subscriptions`).
- Seña del 10% del cliente al confirmar turno (mismo flujo).
- El dueño cobra todo (modelo "owner-collects-all").

**MercadoPago**: lo planteás como alternativa, pero conviene **no migrar** porque Stripe ya funciona, soporta tarjetas argentinas y el gateway de Lovable evita configuración. Si más adelante querés MercadoPago para Pago Fácil/Rapipago/transferencia local, es un proyecto separado (integración custom con su SDK + webhooks propios). **Sugiero dejar Stripe** y no tocar nada en este plan.

## 3. Dashboard ampliado para profesionales

**Estado actual**: `MonthlyKPI` muestra finalizados, en curso, ingresos del mes. Hay `AIReportGenerator` y `CalendarAgenda`. Falta vista analítica.

**Qué agrego — nuevo componente `BusinessStats.tsx`** debajo de MonthlyKPI:
- **Tarjeta de Score/Reputación**: usa el RPC ya existente `get_professional_score` para mostrar puntaje meritocrático (velocidad/confiabilidad/excelencia + cantidad de reseñas + tasa de rechazo). Barra visual por categoría.
- **Gráfico de ingresos últimos 6 meses** (Recharts barras): agrupar `service_requests` finalizadas por mes.
- **Top servicios**: ranking de los servicios más vendidos del profesional (count + ingresos por `service_type`) últimos 90 días.
- **Tasa de conversión**: % de solicitudes `nueva` → `aceptada` últimos 30 días, y tiempo promedio de respuesta (en minutos/horas).
- **Próximos 7 días**: mini-resumen de turnos confirmados por día (deposit_paid = true).
- **Comparativa mes actual vs mes anterior**: ingresos, trabajos, ticket promedio (con flecha verde/roja de variación %).

Todo se calcula client-side con queries a `service_requests` y `reviews` (ya tenemos RLS adecuadas). Mobile-first con grid responsivo.

## 4. Lavadero "dejar y retirar" (drop-off / pickup)

**Caso de uso**: el cliente deja el auto a las 9hs y lo retira a las 18hs. El lavado tarda 1h pero ocupa una estación parte del día (o ninguna, si simplemente está estacionado esperando).

**Modelo propuesto** — agrego al flujo existente:

### Cambios de schema (`service_requests`)
- `dropoff_mode` (boolean, default false) — marca si el turno es modalidad "dejá y retirá".
- `dropoff_time` (time) — hora a la que el cliente deja el auto.
- `pickup_time` (time) — hora a la que el cliente lo retira.
- `service_window_start` / `service_window_end` (time) — ventana en la que el lavadero efectivamente realizará el trabajo (decidida por el profesional, dentro del rango dropoff→pickup). Esto es lo que ocupa la estación.

### UX cliente (al pedir turno en lavadero)
Toggle "Quiero dejar el auto y retirarlo más tarde". Si lo activa:
- Selecciona hora de entrega y hora de retiro (rango mínimo = duración del servicio + 30min buffer).
- Solo paga la seña. El lavadero ve el pedido con esa flexibilidad.

### UX profesional (lavadero)
- En `AgendaOrders` y `DayAgenda`, los pedidos `dropoff_mode=true` aparecen con un badge "Flexible 9–18hs" distinto.
- El profesional, al aceptar, **elige cuándo dentro de esa ventana va a hacer el trabajo** (`service_window_start/end`) — eso es lo que reserva la estación en `AvailabilityManager`.
- En el calendario mensual y por estación, ese slot se muestra con color distinto (ej. ámbar) indicando "auto en espera/en sitio".

### Capacidad de "estacionamiento"
- Nuevo campo en `professional_profiles`: `parking_spots` (integer, default 0). Solo aparece cuando `rubro = 'lavadero'`.
- Independiente de `work_stations`. El sistema valida que la cantidad de autos en sitio simultáneamente (entre dropoff y pickup) ≤ `parking_spots`.
- En `WorkStationsManager` agrego el input "Lugares de estacionamiento" cuando es lavadero.

### Lógica de bloqueo
- Cuando se acepta un dropoff, se crea un bloqueo "soft" en `blocked_slots` con `slot_status = 'parking'` para las horas de espera (ocupa parking, no estación), y un bloqueo normal `manual_block`/`pending` en la `service_window` (ocupa estación).

---

## Detalles técnicos

**Archivos nuevos**:
- `supabase/functions/send-email-notification/index.ts` — recibe `notification_id`, busca destinatario en `auth.users`, usa template por `type`, envía vía Resend gateway.
- `src/components/dashboard/BusinessStats.tsx` — nuevo bloque del dashboard con score, gráficos, conversión.
- `src/lib/emailTemplates.ts` — HTML por tipo de notificación.

**Archivos modificados**:
- `src/pages/Dashboard.tsx` — incluir `<BusinessStats />`.
- `src/components/dashboard/WorkStationsManager.tsx` — input `parking_spots` para lavaderos.
- `src/components/ServiceRequestForm.tsx` — toggle dropoff + horarios para lavaderos.
- `src/components/dashboard/RequestDetail.tsx` — al aceptar dropoff, modal para elegir ventana de servicio.
- `src/components/dashboard/AgendaOrders.tsx` y `DayAgenda.tsx` — badges/colores para dropoff.
- `src/components/dashboard/AvailabilityManager.tsx` — soportar slot tipo "parking".
- `src/pages/ClientProfile.tsx` y `ProfessionalProfile.tsx` — toggle "Recibir notificaciones por email".

**Migraciones SQL**:
1. Agregar `email_notifications_enabled boolean default true` a `professional_profiles` y `client_profiles`.
2. Agregar `dropoff_mode`, `dropoff_time`, `pickup_time`, `service_window_start`, `service_window_end` a `service_requests`.
3. Agregar `parking_spots integer default 0` a `professional_profiles`.
4. Trigger AFTER INSERT en `notifications` que invoca `send-email-notification` vía `pg_net` (requiere `pg_net` enabled).
5. Permitir `slot_status = 'parking'` en `blocked_slots`.

**Conector requerido**: Resend (te voy a pedir conectarlo cuando arranque la implementación).

---

## Confirmación pendiente

Antes de implementar, confirmá:
1. **WhatsApp**: ¿lo dejamos para fase 2 (recomendado) o querés Twilio ahora pagando setup adicional?
2. **MercadoPago**: ¿confirmás que seguimos con Stripe y no integramos MP?
3. **Dropoff**: ¿el cliente puede elegir dropoff/pickup libremente o el lavadero define franjas (ej. "entrega 8–10hs, retiro 17–19hs")? Sugiero libre con validaciones mínimas.
