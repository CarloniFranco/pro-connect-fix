import { Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b-4 border-accent bg-primary/95 backdrop-blur-md">
      <div className="container mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <button onClick={() => navigate("/")} className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent shadow-md">
            <Wrench className="h-4 w-4 text-accent-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-primary-foreground">
            FIX
          </span>
        </button>
        <button
          onClick={() => navigate("/auth")}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-accent-foreground shadow-md transition-colors hover:bg-accent/90"
        >
          Soy Profesional
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
