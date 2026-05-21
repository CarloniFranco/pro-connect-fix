import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

type Audience = "all" | "pros" | "clients";

const AdminBroadcast = () => {
  const [audience, setAudience] = useState<Audience>("all");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [sending, setSending] = useState(false);
  const [counts, setCounts] = useState({ pros: 0, clients: 0 });

  useEffect(() => {
    (async () => {
      const [p, c] = await Promise.all([
        supabase.from("professional_profiles").select("user_id", { count: "exact", head: true }),
        supabase.from("client_profiles").select("user_id", { count: "exact", head: true }),
      ]);
      setCounts({ pros: p.count || 0, clients: c.count || 0 });
    })();
  }, []);

  const audienceCount = audience === "all" ? counts.pros + counts.clients : audience === "pros" ? counts.pros : counts.clients;

  const send = async () => {
    if (!title.trim() || !message.trim()) return toast.error("Completá título y mensaje");
    if (!confirm(`¿Enviar a ${audienceCount} usuario(s)?`)) return;
    setSending(true);

    const ids = new Set<string>();
    if (audience !== "clients") {
      const { data } = await supabase.from("professional_profiles").select("user_id");
      (data || []).forEach((r: any) => ids.add(r.user_id));
    }
    if (audience !== "pros") {
      const { data } = await supabase.from("client_profiles").select("user_id");
      (data || []).forEach((r: any) => ids.add(r.user_id));
    }

    const rows = Array.from(ids).map((user_id) => ({
      user_id,
      type: "broadcast",
      title: title.trim(),
      message: message.trim(),
      link: link.trim() || null,
    }));

    // Insert in chunks of 200
    let ok = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      const { error } = await supabase.from("notifications").insert(chunk);
      if (!error) ok += chunk.length;
    }
    setSending(false);
    if (ok === rows.length) {
      toast.success(`Enviado a ${ok} usuarios`);
      setTitle("");
      setMessage("");
      setLink("");
    } else {
      toast.error(`Enviado parcial: ${ok}/${rows.length}`);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <h2 className="font-display text-2xl font-bold">Enviar notificación masiva</h2>
      <p className="text-sm text-muted-foreground">Aparece en la campanita y se envía por email automáticamente.</p>

      <div className="mt-6 space-y-5 rounded-2xl border bg-card p-5">
        <div>
          <Label>Destinatarios</Label>
          <RadioGroup value={audience} onValueChange={(v) => setAudience(v as Audience)} className="mt-2 grid grid-cols-3 gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm">
              <RadioGroupItem value="all" /> Todos ({counts.pros + counts.clients})
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm">
              <RadioGroupItem value="pros" /> Profesionales ({counts.pros})
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm">
              <RadioGroupItem value="clients" /> Clientes ({counts.clients})
            </label>
          </RadioGroup>
        </div>

        <div>
          <Label htmlFor="title">Título</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nueva función disponible" maxLength={80} />
        </div>

        <div>
          <Label htmlFor="message">Mensaje</Label>
          <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Contale a tus usuarios..." rows={5} maxLength={500} />
        </div>

        <div>
          <Label htmlFor="link">Link (opcional)</Label>
          <Input id="link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="/dashboard" />
        </div>

        <Button onClick={send} disabled={sending} className="w-full">
          {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Enviar a {audienceCount} usuario(s)
        </Button>
      </div>
    </div>
  );
};

export default AdminBroadcast;
