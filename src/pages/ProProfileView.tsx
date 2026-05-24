import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PortfolioManager from "@/components/dashboard/PortfolioManager";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Briefcase,
  ArrowLeft,
  Loader2,
  Camera,
  User,
  Pencil,
  Save,
  Star,
  Zap,
  CheckCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import LocationManager from "@/components/dashboard/LocationManager";

const RUBROS = [
  "Plomería", "Electricidad", "Gas", "Lavadero de Auto",
  "Taller Mecánico", "Jardinería", "Piletero",
  "Calefacción y Refrigeración", "Peluquería", "Uñas / Manicura", "Otro",
];

type ScoreData = {
  total_score: number;
  velocity: number;
  reliability: number;
  excellence: number;
  review_count: number;
};

const ProProfileView = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [score, setScore] = useState<ScoreData | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Edit state
  const [editName, setEditName] = useState("");
  const [editRubro, setEditRubro] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    const [{ data: prof }, { data: scoreData }, { data: phoneData }] = await Promise.all([
      supabase
        .from("professional_profiles")
        .select("full_name, rubro, descripcion, photo_url, plan, verified, created_at, mp_connected")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase.rpc("get_professional_score", { p_professional_id: user.id }),
      supabase.rpc("get_professional_phone", { p_professional_id: user.id }),
    ]);

    if (prof) {
      const profWithPhone = { ...prof, phone: (phoneData as string) || "" } as any;
      setProfile(profWithPhone);
      setEditName(prof.full_name);
      setEditRubro(prof.rubro);
      setEditDesc(prof.descripcion);
      setEditPhone((phoneData as string) || "");
      if (prof.photo_url) setPhotoPreview(prof.photo_url);
    }
    if (scoreData) setScore(scoreData as unknown as ScoreData);
    setLoading(false);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Seleccioná una imagen"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Máximo 5MB"); return; }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!user || !editName.trim() || !editRubro || !editDesc.trim()) {
      toast.error("Completá todos los campos");
      return;
    }
    setSaving(true);
    try {
      let photoUrl: string | undefined;
      if (photoFile) {
        const ext = photoFile.name.split(".").pop();
        const path = `${user.id}/photo.${ext}`;
        await supabase.storage.from("profile-photos").upload(path, photoFile, { upsert: true });
        const { data: urlData } = supabase.storage.from("profile-photos").getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }

      const { error } = await supabase
        .from("professional_profiles")
        .update({
          full_name: editName.trim(),
          rubro: editRubro,
          descripcion: editDesc.trim(),
          phone: editPhone.trim() || null,
          ...(photoUrl && { photo_url: photoUrl }),
        })
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success("Perfil actualizado");
      setEditing(false);
      setPhotoFile(null);
      loadData();
    } catch (err) {
      console.error("Save error:", err);
      toast.error("No se pudo guardar. Intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex min-h-screen items-center justify-center pt-14">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background pt-14">
        <div className="container mx-auto max-w-2xl px-4 py-8">
          <button
            onClick={() => navigate("/dashboard")}
            className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al panel
          </button>

          <h1 className="font-display text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            Mi Perfil Profesional
          </h1>

          {/* Profile Card */}
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Información Pública</CardTitle>
              {!editing && (
                <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="gap-1">
                  <Pencil className="h-4 w-4" /> Editar
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <>
                  {/* Photo edit */}
                  <div className="flex items-center gap-4">
                    <div
                      onClick={() => photoInputRef.current?.click()}
                      className="relative cursor-pointer group"
                    >
                      <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-dashed border-border bg-muted/50 flex items-center justify-center group-hover:border-primary transition-colors">
                        {photoPreview ? (
                          <img src={photoPreview} alt="Foto" className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <div className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
                        <Camera className="h-3.5 w-3.5" />
                      </div>
                    </div>
                    <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                    <p className="text-xs text-muted-foreground">Tocá para cambiar tu foto</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Especialidad</Label>
                    <Select value={editRubro} onValueChange={setEditRubro}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {RUBROS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Descripción del servicio</Label>
                    <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={4} />
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono / WhatsApp</Label>
                    <Input
                      type="tel"
                      inputMode="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="Ej: 11 1234 5678"
                    />
                    <p className="text-xs text-muted-foreground">
                      Los clientes podrán escribirte por WhatsApp para coordinar el servicio.
                    </p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleSave} disabled={saving} className="gap-1">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Guardar
                    </Button>
                    <Button variant="outline" onClick={() => { setEditing(false); if (profile) { setEditName(profile.full_name); setEditRubro(profile.rubro); setEditDesc(profile.descripcion); setEditPhone(profile.phone || ""); setPhotoPreview(profile.photo_url); } setPhotoFile(null); }}>
                      Cancelar
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 overflow-hidden rounded-full border border-border bg-muted/50 flex items-center justify-center">
                      {profile?.photo_url ? (
                        <img src={profile.photo_url} alt="Foto" className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{profile?.full_name}</p>
                      <p className="text-sm text-primary font-medium">{profile?.rubro}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            profile?.mp_connected
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {profile?.mp_connected ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          MP {profile?.mp_connected ? "conectado" : "sin conectar"}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            profile?.verified
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {profile?.verified ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          {profile?.verified ? "Verificado" : "Sin verificar"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Descripción</p>
                    <p className="text-sm text-foreground">{profile?.descripcion || "Sin descripción"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Teléfono / WhatsApp</p>
                    <p className="text-sm text-foreground">{profile?.phone || "Sin teléfono cargado"}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="mb-6">
            <LocationManager />
          </div>

          {/* Merit KPIs */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Star className="h-5 w-5 text-accent" />
                Métricas de Mérito
              </CardTitle>
            </CardHeader>
            <CardContent>
              {score ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-muted/50 p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">{score.total_score}</p>
                    <p className="text-xs text-muted-foreground mt-1">Score Total</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-4 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Zap className="h-4 w-4 text-accent" />
                    </div>
                    <p className="text-lg font-bold text-foreground">{score.velocity}/5</p>
                    <p className="text-xs text-muted-foreground">Tiempo de respuesta</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-4 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <CheckCircle className="h-4 w-4 text-secondary" />
                    </div>
                    <p className="text-lg font-bold text-foreground">{score.reliability}/5</p>
                    <p className="text-xs text-muted-foreground">Puntualidad y Compromiso</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-4 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Star className="h-4 w-4 text-accent fill-accent" />
                    </div>
                    <p className="text-lg font-bold text-foreground">{score.excellence}/5</p>
                    <p className="text-xs text-muted-foreground">Satisfacción del cliente ({score.review_count})</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Las métricas se generan cuando empieces a recibir trabajos.
                </p>
              )}
            </CardContent>
          </Card>

          <PortfolioManager />
        </div>
      </div>
    </>
  );
};

export default ProProfileView;
