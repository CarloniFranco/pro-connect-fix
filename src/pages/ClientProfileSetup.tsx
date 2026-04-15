import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MapPin, Phone, User, Calendar, ArrowLeft } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ClientProfileSetup = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(
    user?.user_metadata?.full_name || ""
  );
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("otro");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const { error } = await supabase.from("client_profiles").insert({
        user_id: user.id,
        full_name: fullName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        age: age ? parseInt(age) : null,
        gender,
      });

      if (error) throw error;
      toast.success("¡Perfil creado correctamente!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Error al guardar el perfil");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate("/")}
          className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </button>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-lg md:p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
              <User className="h-8 w-8 text-secondary-foreground" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Completá tu perfil
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Necesitamos algunos datos para brindarte un mejor servicio
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Juan Pérez"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+54 11 1234-5678"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Domicilio actual</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Av. Corrientes 1234, CABA"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">Edad</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="age"
                    type="number"
                    min={18}
                    max={120}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="25"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Sexo</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="femenino">Femenino</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Guardando..." : "Guardar y continuar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ClientProfileSetup;
