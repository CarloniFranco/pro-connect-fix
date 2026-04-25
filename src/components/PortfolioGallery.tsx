import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ImageIcon, ChevronLeft, ChevronRight, X } from "lucide-react";

interface PortfolioItem {
  id: string;
  photo_url: string;
  title: string;
  description: string;
}

interface Props {
  professionalId: string;
}

const PortfolioGallery = ({ professionalId }: Props) => {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data } = await supabase
        .from("professional_portfolio" as any)
        .select("id, photo_url, title, description")
        .eq("professional_id", professionalId)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (!cancel) {
        setItems((data as any) || []);
        setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [professionalId]);

  if (loading || items.length === 0) return null;

  const active = activeIdx !== null ? items[activeIdx] : null;
  const prev = () => setActiveIdx((i) => (i === null ? null : (i - 1 + items.length) % items.length));
  const next = () => setActiveIdx((i) => (i === null ? null : (i + 1) % items.length));

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2 mb-4">
        <ImageIcon className="h-5 w-5 text-primary" />
        Book de trabajos
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((it, idx) => (
          <button
            key={it.id}
            onClick={() => setActiveIdx(idx)}
            className="group relative aspect-square rounded-xl overflow-hidden border border-border bg-muted"
          >
            <img
              src={it.photo_url}
              alt={it.title || "Trabajo del profesional"}
              loading="lazy"
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
            {it.title && (
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <p className="text-xs font-semibold text-white truncate text-left">{it.title}</p>
              </div>
            )}
          </button>
        ))}
      </div>

      <Dialog open={activeIdx !== null} onOpenChange={(v) => !v && setActiveIdx(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-background">
          {active && (
            <div className="relative">
              <img
                src={active.photo_url}
                alt={active.title || "Trabajo"}
                className="w-full max-h-[70vh] object-contain bg-black"
              />
              <button
                onClick={() => setActiveIdx(null)}
                className="absolute top-3 right-3 h-9 w-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
              {items.length > 1 && (
                <>
                  <button
                    onClick={prev}
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                    aria-label="Anterior"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={next}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                    aria-label="Siguiente"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
              {(active.title || active.description) && (
                <div className="p-4 border-t border-border">
                  {active.title && <h3 className="font-semibold text-foreground">{active.title}</h3>}
                  {active.description && (
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{active.description}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default PortfolioGallery;
