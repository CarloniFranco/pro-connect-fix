import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Camera, Loader2, Plus, Trash2, ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface PortfolioItem {
  id: string;
  photo_url: string;
  title: string;
  description: string;
  display_order: number;
}

const MAX_PHOTOS = 20;

const PortfolioManager = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("professional_portfolio" as any)
      .select("*")
      .eq("professional_id", user.id)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      toast.error("No se pudo cargar tu book");
    } else {
      setItems((data as any) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setTitle("");
    setDescription("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Solo imágenes");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Máx 5MB");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!user || !file) return;
    if (items.length >= MAX_PHOTOS) {
      toast.error(`Máximo ${MAX_PHOTOS} fotos`);
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("portfolio-photos")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("portfolio-photos").getPublicUrl(path);
      const photoUrl = pub.publicUrl;

      const { error: insErr } = await supabase
        .from("professional_portfolio" as any)
        .insert({
          professional_id: user.id,
          photo_url: photoUrl,
          title: title.trim(),
          description: description.trim(),
          display_order: items.length,
        });
      if (insErr) throw insErr;

      toast.success("Foto agregada al book");
      resetForm();
      setOpen(false);
      load();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Error al subir la foto");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (item: PortfolioItem) => {
    if (!confirm("¿Eliminar esta foto del book?")) return;
    setDeletingId(item.id);
    try {
      // intentar borrar el archivo de storage si la URL pertenece al bucket
      const marker = "/storage/v1/object/public/portfolio-photos/";
      const idx = item.photo_url.indexOf(marker);
      if (idx >= 0) {
        const path = item.photo_url.slice(idx + marker.length);
        await supabase.storage.from("portfolio-photos").remove([path]);
      }
      const { error } = await supabase
        .from("professional_portfolio" as any)
        .delete()
        .eq("id", item.id);
      if (error) throw error;
      toast.success("Foto eliminada");
      load();
    } catch (e: any) {
      console.error(e);
      toast.error("No se pudo eliminar");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            Mi Book de Trabajos
          </h2>
          <p className="text-xs text-muted-foreground">
            Mostrá tus mejores trabajos para que los clientes te elijan ({items.length}/{MAX_PHOTOS})
          </p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={items.length >= MAX_PHOTOS}>
              <Plus className="h-4 w-4 mr-1" /> Agregar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Agregar foto al book</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFile}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-video rounded-xl border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center hover:bg-muted/50 transition-colors overflow-hidden"
                >
                  {preview ? (
                    <img src={preview} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Camera className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">Tocá para elegir una foto</span>
                      <span className="text-xs text-muted-foreground mt-1">Máx 5MB</span>
                    </>
                  )}
                </button>
              </div>
              <div>
                <Label htmlFor="port-title">Título (opcional)</Label>
                <Input
                  id="port-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Detallado completo SUV"
                  maxLength={80}
                />
              </div>
              <div>
                <Label htmlFor="port-desc">Descripción (opcional)</Label>
                <Textarea
                  id="port-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contale al cliente qué hiciste"
                  maxLength={300}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={uploading}>
                Cancelar
              </Button>
              <Button onClick={handleUpload} disabled={!file || uploading}>
                {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Subir foto
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-border rounded-xl">
          <ImageIcon className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Todavía no subiste fotos a tu book</p>
          <p className="text-xs text-muted-foreground mt-1">Las fotos ayudan a que más clientes confíen en vos</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map((it) => (
            <div key={it.id} className="group relative aspect-square rounded-xl overflow-hidden border border-border bg-muted">
              <img src={it.photo_url} alt={it.title || "Trabajo"} className="w-full h-full object-cover" />
              {(it.title || it.description) && (
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  {it.title && <p className="text-xs font-semibold text-white truncate">{it.title}</p>}
                </div>
              )}
              <button
                onClick={() => handleDelete(it)}
                disabled={deletingId === it.id}
                className="absolute top-2 right-2 h-8 w-8 rounded-full bg-destructive/90 text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-100"
              >
                {deletingId === it.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default PortfolioManager;
