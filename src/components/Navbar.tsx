import { Wrench } from "lucide-react";

const Navbar = () => {
  return (
    <nav className="fixed left-0 right-0 top-0 z-50 bg-primary/95 backdrop-blur-md">
      <div className="container mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
            <Wrench className="h-4 w-4 text-accent-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-primary-foreground">
            FIX
          </span>
        </div>
        <button className="rounded-lg bg-primary-foreground/10 px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/20">
          Ingresar
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
