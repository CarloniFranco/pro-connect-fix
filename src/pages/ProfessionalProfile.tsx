import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wrench, Upload, ShieldCheck, Loader2, Camera, User } from "lucide-react";
import { toast } from "sonner";

const RUBROS = [
  "Plomería",
  "Electricidad",
  "Gas",
  "Lavadero de Auto",
  "Taller Mecánico",
  "Jardinería",
  "Piletero",
  "Calefacción y Refrigeración",
  "Peluquería",
  "Uñas",
  "Estética",
  "Otro",
];

const ProfessionalProfile = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [rubro, setRubro] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [phone, setPhone] = useState("");
  const [workStations, setWorkStations] = useState(1);
  const [matriculaFile, setMatriculaFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [existingProfile, setExistingProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (user) loadProfile();
  }, [user, authLoading]);

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("professional_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      const { data: phoneData } = await supabase.rpc("get_professional_phone", { p_professional_id: user.id });
      setExistingProfile(true);
      setFullName(data.full_name);
      setRubro(data.rubro);
      setDescripcion(data.descripcion);
      setPhone((phoneData as string) || "");
      setWorkStations((data as any).work_stations || 1);
      if (data.photo_url) setPhotoPreview(data.photo_url);
      // Profile already filled — gate routing happens in PrivateRoute,
      // so just let them edit if they want. Do not auto-redirect.
    } else {
      setFullName(user.user_metadata?.full_name || "");
    }
    setLoadingProfile(false);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor seleccioná una imagen");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no puede superar los 5MB");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    try {
      let matriculaUrl: string | null = null;
      let photoUrl: string | null = null;

      // Upload matrícula if provided
      if (matriculaFile) {
        const ext = matriculaFile.name.split(".").pop();
        const path = `${user.id}/matricula.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("matriculas")
          .upload(path, matriculaFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from("matriculas")
          .createSignedUrl(path, 3600);
        if (signedUrlError) throw signedUrlError;
        matriculaUrl = signedUrlData.signedUrl;
      }

      // Upload profile photo if provided
      if (photoFile) {
        const ext = photoFile.name.split(".").pop();
        const path = `${user.id}/photo.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("profile-photos")
          .upload(path, photoFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("profile-photos").getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }

      const isLavadero = rubro === "Lavadero de Auto";
      const profileData: any = {
        full_name: fullName,
        rubro,
        descripcion,
        phone: phone.trim() || null,
        work_stations: isLavadero ? Math.max(1, Math.min(20, workStations)) : 1,
        ...(photoUrl && { photo_url: photoUrl }),
      };

      if (existingProfile) {
        const { error } = await supabase
          .from("professional_profiles")
          .update(profileData)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("professional_profiles")
          .insert({ ...profileData, user_id: user.id });
        if (error) throw error;
      }

      if (matriculaUrl) {
        await supabase
          .from("professional_verification")
          .upsert({ user_id: user.id, matricula_url: matriculaUrl }, { onConflict: "user_id" });
      }

      toast.success("¡Perfil guardado! Ahora verificá tu identidad.");
      navigate("/verificar-identidad");
    } catch (error: any) {
      console.error("Profile save error:", error);
      toast.error("Error inesperado al guardar el perfil. Intentá nuevamente.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <Wrench className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Completá tu Perfil</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Necesitamos algunos datos para verificar tu cuenta profesional
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-lg">
          {/* Profile Photo */}
          <div className="flex flex-col items-center gap-3">
            <Label className="text-sm font-medium">Foto de perfil</Label>
            <div
              onClick={() => photoInputRef.current?.click()}
              className="relative cursor-pointer group"
            >
              <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-dashed border-border bg-muted/50 flex items-center justify-center transition-colors group-hover:border-primary">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Foto de perfil"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
              <div className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
                <Camera className="h-4 w-4" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Subí una foto de tu cara para generar confianza
            </p>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoSelect}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Nombre del profesional o del negocio</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ej: Juan Pérez o Lavadero El Rápido"
              required
            />
            <p className="text-xs text-muted-foreground">
              Es como te van a ver tus clientes en FIX. Podés usar tu nombre o el nombre de tu negocio/lavadero.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rubro">¿En qué rubro trabajás?</Label>
            <Select value={rubro} onValueChange={setRubro} required>
              <SelectTrigger>
                <SelectValue placeholder="Seleccioná tu rubro" />
              </SelectTrigger>
              <SelectContent>
                {RUBROS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción de tus servicios</Label>
            <Textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Contanos qué servicios ofrecés, tu experiencia, zona de trabajo..."
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono / WhatsApp</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ej: 11 1234 5678"
            />
            <p className="text-xs text-muted-foreground">
              Los clientes podrán escribirte por WhatsApp para coordinar el servicio.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="matricula">Matrícula / Habilitación</Label>
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/50 p-4">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <div className="flex-1">
                <input
                  id="matricula"
                  type="file"
                  accept="image/*,.pdf"
                  className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
                  onChange={(e) => setMatriculaFile(e.target.files?.[0] || null)}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Subí una foto o PDF de tu matrícula profesional
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-accent/10 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-accent-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Verificación de autenticidad</p>
              <p className="text-xs text-muted-foreground">
                Tu perfil será revisado por nuestro equipo para verificar tu matrícula y habilitar tu cuenta profesional.
              </p>
            </div>
          </div>

          <Button type="submit" disabled={saving || !rubro || !descripcion} className="w-full">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar y continuar"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ProfessionalProfile;
