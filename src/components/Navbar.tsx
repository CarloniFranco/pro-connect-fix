import { Wrench, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Navbar = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="container mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <button onClick={() => navigate("/")} className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm">
            <Wrench className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-foreground">
            FIX
          </span>
        </button>
        {user ? (
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 rounded-lg bg-muted px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted/80"
          >
            <User className="h-4 w-4" />
            Mi cuenta
          </button>
        ) : (
          <button
            onClick={() => navigate("/ingresar")}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <User className="h-4 w-4" />
            Ingresar
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
