import { Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  professionalId: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Si es true, frena la propagación al click (útil dentro de tarjetas clickeables) */
  stopPropagation?: boolean;
}

const sizeMap = {
  sm: { btn: "h-7 w-7", icon: "h-3.5 w-3.5" },
  md: { btn: "h-9 w-9", icon: "h-4 w-4" },
  lg: { btn: "h-11 w-11", icon: "h-5 w-5" },
};

export const FavoriteButton = ({
  professionalId,
  size = "md",
  className,
  stopPropagation = true,
}: FavoriteButtonProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const fav = isFavorite(professionalId);
  const sizes = sizeMap[size];

  const handleClick = async (e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation();
    e.preventDefault();

    if (!user) {
      toast.error("Iniciá sesión para guardar favoritos");
      navigate("/login");
      return;
    }

    const result = await toggleFavorite(professionalId);
    if (result === null) {
      toast.error("No se pudo actualizar tus favoritos");
    } else if (result) {
      toast.success("Agregado a favoritos");
    } else {
      toast("Quitado de favoritos");
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={fav ? "Quitar de favoritos" : "Agregar a favoritos"}
      title={fav ? "Quitar de favoritos" : "Agregar a favoritos"}
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-card/95 shadow-md transition-all hover:scale-110 active:scale-95",
        sizes.btn,
        className
      )}
    >
      <Heart
        className={cn(
          sizes.icon,
          "transition-colors",
          fav ? "fill-destructive text-destructive" : "text-muted-foreground"
        )}
      />
    </button>
  );
};
