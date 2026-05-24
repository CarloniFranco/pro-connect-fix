## Problema

Cuando Mercado Pago termina el pago de la seña, redirige a `https://pro-connect-fix.lovable.app/sena/confirmada?...` en vez de a tu app publicada (`https://somofix.lovable.app`). Esa URL vieja muestra el mensaje "Publish or update your Lovable project for it to appear here" en lugar de la pestaña de turno confirmado con Felix festejando.

La causa está en `supabase/functions/_shared/mp.ts`:

```ts
export const APP_URL = Deno.env.get("APP_PUBLIC_URL") ?? "https://pro-connect-fix.lovable.app";
```

El fallback apunta al dominio viejo y `APP_PUBLIC_URL` no está seteado como secret, así que **todas** las edge functions de MP (seña, suscripción, OAuth callback) están armando back_urls con el dominio incorrecto.

## Solución

1. **Cambiar el fallback de `APP_URL`** en `supabase/functions/_shared/mp.ts` a `https://somofix.lovable.app` (tu URL publicada actual).

2. **Configurar el secret `APP_PUBLIC_URL`** en Lovable Cloud con el valor `https://somofix.lovable.app`. Así, si en el futuro conectás un dominio custom (ej. `fix.com.ar`), solo cambiás el secret y no tocás código.

3. **Verificar las 3 edge functions afectadas** usan `APP_URL` correctamente:
   - `mp-create-deposit-preference` → `back_urls.success → /sena/confirmada` ✅
   - `mp-create-subscription` → `back_url → /pro-subscription?sub=success` (revisar que esa ruta exista; si no, apuntar a `/mi-suscripcion`)
   - `mp-oauth-start` → redirect_uri del OAuth de MP

4. **Recordatorio**: en el panel de MP Developers, el redirect_uri OAuth registrado tiene que coincidir exactamente con `https://somofix.lovable.app/mp-oauth-callback`. Si quedó cargado el dominio viejo, hay que actualizarlo ahí también.

## Resultado

Después del pago, MP redirige a `https://somofix.lovable.app/sena/confirmada?deposit=success&request=...`, que ya tiene a Felix festejando ("¡Turno confirmado!") cuando el pago fue aprobado, y a Felix triste si fue cancelado/rechazado.

## Pregunta antes de implementar

¿Tu dominio público definitivo es `somofix.lovable.app`, o pensás conectar un dominio custom (ej. `fix.com.ar`) pronto? Si es lo segundo, lo dejo configurado vía secret para que el cambio sea de un click.
