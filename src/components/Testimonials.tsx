import { useEffect, useState } from "react";
import { Star, Quote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Testimonial {
  name: string;
  location: string;
  rating: number;
  comment: string;
  service: string;
}

const renderStars = (rating: number) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star
        key={i}
        className={`h-3.5 w-3.5 ${
          i <= rating ? "fill-accent text-accent" : "text-muted-foreground/30"
        }`}
      />
    ))}
  </div>
);

const Testimonials = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("reviews")
        .select("rating, comment, service_request_id, created_at")
        .not("comment", "is", null)
        .gte("rating", 4)
        .order("rating", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(6);

      const valid = (data || []).filter(
        (r) => r.comment && r.comment.trim().length > 20
      );

      if (valid.length === 0) {
        setLoaded(true);
        return;
      }

      const requestIds = valid.map((r) => r.service_request_id);
      const { data: requests } = await supabase
        .from("service_requests")
        .select("id, client_name, client_address, service_type")
        .in("id", requestIds);

      const reqMap = new Map((requests || []).map((r) => [r.id, r]));

      const real: Testimonial[] = valid.slice(0, 3).map((r) => {
        const req = reqMap.get(r.service_request_id);
        const firstName = (req?.client_name || "Cliente").split(" ")[0];
        const lastInitial =
          (req?.client_name || "").split(" ")[1]?.[0]?.toUpperCase() || "";
        return {
          name: lastInitial ? `${firstName} ${lastInitial}.` : firstName,
          location: req?.client_address?.split(",").pop()?.trim() || "Argentina",
          rating: r.rating,
          comment: r.comment as string,
          service: req?.service_type || "Servicio",
        };
      });

      setTestimonials(real);
      setLoaded(true);
    })();
  }, []);

  if (!loaded || testimonials.length === 0) return null;

  return (
    <section className="px-4 py-12 md:py-16">
      <div className="container mx-auto max-w-5xl">
        <h2 className="mb-2 text-center font-display text-2xl font-bold text-foreground md:text-3xl">
          Lo que dicen los clientes
        </h2>
        <p className="mb-8 text-center text-sm text-muted-foreground md:text-base">
          Reseñas reales después de cada servicio finalizado.
        </p>

        <div className="grid gap-4 md:grid-cols-3 md:gap-6">
          {testimonials.map((t, i) => (
            <figure
              key={`${t.name}-${i}`}
             
             
             
             
              className="relative flex flex-col rounded-2xl border-2 border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg md:p-6"
            >
              <Quote className="absolute right-4 top-4 h-6 w-6 text-primary/15" />
              <div className="mb-3">{renderStars(t.rating)}</div>
              <blockquote className="mb-4 flex-1 text-sm leading-relaxed text-foreground/90 md:text-base">
                "{t.comment}"
              </blockquote>
              <figcaption className="flex items-center gap-3 border-t border-border pt-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-display text-base font-bold text-primary">
                  {t.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-foreground">
                    {t.name}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {t.service} · {t.location}
                  </div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
