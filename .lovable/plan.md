## Objetivo

Migrar el modelo de seña a **MercadoPago Connect (OAuth)**: la seña va directo a la cuenta MP del profesional, FIX solo cobra la suscripción. Los pros existentes y nuevos pueden conectar su MP cuando quieran; si no lo tienen conectado, su perfil funciona pero **sin opción de seña** (reserva con turno bloqueado no disponible).

---

## Cambios en la base de datos

Nuevos campos en `professional_profiles`:
- `mp_user_id` (text) — ID del usuario MP del pro
- `mp_access_token` (text) — token OAuth del pro (encriptado vía pgsodium o guardado en tabla aparte)
- `mp_refresh_token` (text)
- `mp_token_expires_at` (timestamptz)
- `mp_connected_at` (timestamptz)
- `mp_public_key` (text, opcional)

Por seguridad los tokens van en una tabla nueva `professional_mp_credentials` (solo accesible por service_role, sin RLS para usuarios). En `professional_profiles` queda solo un flag `mp_connected boolean` para consultas públicas.

---

## Flujo OAuth

1. **Nueva página** `/conectar-mercadopago` con botón "Conectar con Mercado Pago".
2. **Edge function** `mp-oauth-start` — genera state random, lo guarda en DB, devuelve URL de autorización MP.
3. El pro autoriza en MP → MP redirige a `/mp-oauth-callback?code=...&state=...`.
4. **Edge function** `mp-oauth-callback` — intercambia `code` por `access_token` + `refresh_token`, los guarda en `professional_mp_credentials`, marca `mp_connected=true`.
5. **Edge function** `mp-oauth-refresh` (cron diario) — refresca tokens próximos a expirar.

---

## Cambios en el flujo de seña

- `mp-create-deposit-preference` ahora usa el **access_token del pro** (no el de FIX) para crear la preference. El dinero va directo a la cuenta MP del pro.
- El `notification_url` sigue apuntando a nuestro webhook (MP lo soporta).
- `mp-webhook` usa el token del pro para consultar el pago (lo busca por `service_request_id` → `professional_id` → token).
- `mp-refund-deposit` también usa el token del pro.
- Si `mp_connected = false` para el pro, el frontend **no muestra** la opción de "Reservar con seña" — solo "Pedir presupuesto" (sin bloqueo de turno).

---

## Cambios en UI

1. **Banner en `Dashboard`** para pros sin MP conectado: "Conectá tu Mercado Pago para recibir señas y reservas confirmadas". CTA → `/conectar-mercadopago`.
2. **Sección en configuración del pro** con estado de conexión MP (conectado/desconectado + botón conectar/desconectar).
3. **`ServiceRequestForm` (cliente)**: si el pro no tiene MP, ocultar opción de reserva con seña y mostrar nota: "Este profesional solo acepta presupuestos sin reserva de turno por ahora".
4. **Cards de profesionales**: badge opcional "Acepta reservas" si tiene MP conectado.
5. **`PaymentSetup` / onboarding del pro**: paso opcional "Conectar Mercado Pago" después de la suscripción.

---

## Secretos requeridos

- `MP_CLIENT_ID` — Client ID de la aplicación FIX en MP Developers
- `MP_CLIENT_SECRET` — Client Secret de la aplicación FIX

El usuario debe crear la aplicación en https://www.mercadopago.com.ar/developers/panel/app y configurar:
- Redirect URI: `https://pro-connect-fix.lovable.app/mp-oauth-callback`
- Scopes: `offline_access read write`

`MP_ACCESS_TOKEN` (el de FIX) se mantiene **solo para suscripciones** (preapproval).

---

## Pros existentes

- Reciben notificación in-app + email pidiendo conectar MP.
- Mientras no conecten: su perfil sigue activo pero solo aceptan presupuestos sin seña.
- No hay deadline forzado — pueden conectar cuando quieran.

---

## Resumen de archivos

**Nuevos:**
- `supabase/functions/mp-oauth-start/index.ts`
- `supabase/functions/mp-oauth-callback/index.ts`
- `supabase/functions/mp-oauth-refresh/index.ts` (cron)
- `src/pages/MercadoPagoConnect.tsx`
- `src/pages/MercadoPagoCallback.tsx`
- `src/components/dashboard/MercadoPagoStatus.tsx`

**Modificados:**
- `supabase/functions/mp-create-deposit-preference/index.ts` — usa token del pro
- `supabase/functions/mp-webhook/index.ts` — usa token del pro para consultar
- `supabase/functions/mp-refund-deposit/index.ts` — usa token del pro
- `src/components/ServiceRequestForm.tsx` — oculta seña si pro sin MP
- `src/pages/Dashboard.tsx` — banner si pro sin MP
- DB migration + `supabase/config.toml` (3 funciones nuevas)

---

## Estimación

3-4 días de trabajo. Lo hago en 3 etapas:

1. **Etapa 1** (esta) — DB + OAuth + UI de conexión
2. **Etapa 2** — Migrar seña/webhook/refund al token del pro
3. **Etapa 3** — Bloqueos en UI cliente + notificaciones a pros existentes

---

## Para arrancar necesito que:

1. Crees la app en MP Developers y me pases `MP_CLIENT_ID` y `MP_CLIENT_SECRET` (los cargás cuando te los pida con el formulario seguro).
2. Confirmes el redirect URI: `https://pro-connect-fix.lovable.app/mp-oauth-callback`.

¿Arrancamos con la Etapa 1?
