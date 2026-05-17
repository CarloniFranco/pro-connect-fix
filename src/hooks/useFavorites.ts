import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook global para manejar favoritos del cliente actual.
 * Mantiene un Set de professional_id favoritos en memoria.
 */
export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setFavorites(new Set());
      return;
    }
    let mounted = true;
    setLoading(true);
    supabase
      .from("favorites")
      .select("professional_id")
      .eq("client_user_id", user.id)
      .then(({ data, error }) => {
        if (!mounted) return;
        if (!error && data) {
          setFavorites(new Set(data.map((f) => f.professional_id)));
        }
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [user]);

  const isFavorite = useCallback(
    (professionalId: string) => favorites.has(professionalId),
    [favorites]
  );

  const toggleFavorite = useCallback(
    async (professionalId: string): Promise<boolean | null> => {
      if (!user) return null;
      const currentlyFav = favorites.has(professionalId);

      // Optimistic update
      setFavorites((prev) => {
        const next = new Set(prev);
        if (currentlyFav) next.delete(professionalId);
        else next.add(professionalId);
        return next;
      });

      if (currentlyFav) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("client_user_id", user.id)
          .eq("professional_id", professionalId);
        if (error) {
          // Revert
          setFavorites((prev) => new Set(prev).add(professionalId));
          return null;
        }
        return false;
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({ client_user_id: user.id, professional_id: professionalId });
        if (error) {
          setFavorites((prev) => {
            const next = new Set(prev);
            next.delete(professionalId);
            return next;
          });
          return null;
        }
        return true;
      }
    },
    [user, favorites]
  );

  return { favorites, isFavorite, toggleFavorite, loading };
}
