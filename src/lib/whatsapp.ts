// WhatsApp click-to-chat helper (Argentina-first)

/**
 * Normaliza un teléfono a formato internacional para wa.me.
 * Reglas pensadas para Argentina:
 *  - Quita todos los caracteres no numéricos
 *  - Si empieza con 00, lo descarta
 *  - Si empieza con 54 lo deja
 *  - Si empieza con 0 (formato local), lo quita
 *  - Si empieza con 15 (móvil viejo formato), lo quita
 *  - Si no empieza con código de país, antepone 549 (móvil AR)
 */
export function normalizePhoneForWhatsapp(input?: string | null): string | null {
  if (!input) return null;
  let digits = String(input).replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("54")) {
    // Asegurar el 9 de móvil si parece faltar (ej: 5411xxxxxxxx -> 54911xxxxxxxx)
    if (digits.length === 12 && digits[2] !== "9") {
      digits = "549" + digits.slice(2);
    }
    return digits;
  }
  if (digits.startsWith("0")) digits = digits.replace(/^0+/, "");
  if (digits.startsWith("15")) digits = digits.slice(2);
  return "549" + digits;
}

export function buildWhatsappUrl(phone?: string | null, message?: string): string | null {
  const normalized = normalizePhoneForWhatsapp(phone);
  if (!normalized) return null;
  const base = `https://wa.me/${normalized}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

export function openWhatsapp(phone?: string | null, message?: string) {
  const url = buildWhatsappUrl(phone, message);
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}
