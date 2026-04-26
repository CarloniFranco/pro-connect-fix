import { useState } from "react";
import { Sparkles, Wrench, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface BudgetData {
  description: string;
  materials: string;
  labor: string;
  materialsCost: number;
  laborCost: number;
}

const BudgetPreview = ({ data, onClose }: { data: BudgetData; onClose: () => void }) => {
  const total = data.materialsCost + data.laborCost;
  const today = new Date().toLocaleDateString("es-AR");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
            <Wrench className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <p className="font-display text-lg font-bold text-foreground">FIX</p>
            <p className="text-xs text-muted-foreground">Presupuesto Profesional</p>
          </div>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p>Fecha: {today}</p>
          <p>N°: PRE-{Math.floor(Math.random() * 9000 + 1000)}</p>
        </div>
      </div>

      {/* Professional info */}
      <div className="rounded-lg bg-muted/50 p-3">
        <p className="text-xs font-semibold text-muted-foreground">Profesional</p>
        <p className="text-sm font-semibold text-foreground">Juan Pérez — Plomería</p>
        <p className="text-xs text-muted-foreground">CABA, Buenos Aires</p>
      </div>

      {/* Description */}
      <div>
        <p className="mb-1 text-xs font-semibold text-muted-foreground">Descripción del trabajo</p>
        <p className="text-sm text-foreground">{data.description}</p>
      </div>

      {/* Breakdown */}
      <div className="rounded-lg border border-border">
        <div className="flex items-center justify-between border-b border-border p-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Materiales</p>
            <p className="text-xs text-muted-foreground">{data.materials}</p>
          </div>
          <p className="font-display font-bold text-foreground">
            ${data.materialsCost.toLocaleString("es-AR")}
          </p>
        </div>
        <div className="flex items-center justify-between border-b border-border p-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Mano de obra</p>
            <p className="text-xs text-muted-foreground">{data.labor}</p>
          </div>
          <p className="font-display font-bold text-foreground">
            ${data.laborCost.toLocaleString("es-AR")}
          </p>
        </div>
        <div className="flex items-center justify-between bg-primary p-3">
          <p className="text-sm font-bold text-primary-foreground">TOTAL</p>
          <p className="font-display text-lg font-bold text-primary-foreground">
            ${total.toLocaleString("es-AR")}
          </p>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Presupuesto válido por 15 días. Generado con FIX.
      </p>

      <Button onClick={onClose} className="w-full">
        Cerrar Vista Previa
      </Button>
    </div>
  );
};

const BudgetGenerator = () => {
  const [open, setOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [form, setForm] = useState({
    description: "",
    materials: "",
    materialsCost: "",
    labor: "",
    laborCost: "",
  });

  const handleGenerate = () => {
    setShowPreview(true);
  };

  const budgetData: BudgetData = {
    description: form.description || "Trabajo de reparación general",
    materials: form.materials || "Materiales varios",
    labor: form.labor || "Instalación y mano de obra",
    materialsCost: Number(form.materialsCost) || 0,
    laborCost: Number(form.laborCost) || 0,
  };

  const handleClose = () => {
    setOpen(false);
    setShowPreview(false);
    setForm({ description: "", materials: "", materialsCost: "", labor: "", laborCost: "" });
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Generar presupuesto con IA"
        title="Generar presupuesto con IA"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        <Sparkles className="h-6 w-6" />
      </button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <Sparkles className="h-5 w-5 text-accent" />
              {showPreview ? "Vista Previa del Presupuesto" : "Generar Presupuesto"}
            </DialogTitle>
            <DialogDescription>
              {showPreview
                ? "Así se verá tu presupuesto profesional"
                : "Completá los datos para generar un presupuesto"}
            </DialogDescription>
          </DialogHeader>

          {showPreview ? (
            <BudgetPreview data={budgetData} onClose={handleClose} />
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Descripción del problema
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Ej: Pérdida en cañería de cocina..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                    Materiales
                  </label>
                  <input
                    value={form.materials}
                    onChange={(e) => setForm((f) => ({ ...f, materials: e.target.value }))}
                    placeholder="Ej: Caño PVC, codos, pegamento..."
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                    Costo materiales ($)
                  </label>
                  <input
                    type="number"
                    value={form.materialsCost}
                    onChange={(e) => setForm((f) => ({ ...f, materialsCost: e.target.value }))}
                    placeholder="15000"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                    Costo mano de obra ($)
                  </label>
                  <input
                    type="number"
                    value={form.laborCost}
                    onChange={(e) => setForm((f) => ({ ...f, laborCost: e.target.value }))}
                    placeholder="25000"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Detalle mano de obra
                </label>
                <input
                  value={form.labor}
                  onChange={(e) => setForm((f) => ({ ...f, labor: e.target.value }))}
                  placeholder="Ej: Instalación y reparación, 3hs..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <Button onClick={handleGenerate} className="w-full gap-2">
                <Sparkles className="h-4 w-4" />
                Generar Presupuesto
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BudgetGenerator;
