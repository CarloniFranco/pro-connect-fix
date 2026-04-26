import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const STORAGE_KEY = "fix_chat_messages";
const ACTIVE_REQ_KEY = "fix_chat_active_request";

const INITIAL_MSG: Msg = {
  role: "assistant",
  content:
    "¡Hola! Soy **Fix Bot** 🚗\n\nReservá tu turno de lavadero en 1 minuto. Para arrancar contame:\n\n📍 **¿De qué zona/localidad sos?**\n📅 **¿Qué día y horario te queda cómodo?**\n\nEj: \"Soy de Palermo, mañana a las 15hs\"",
};

export default function LavaderoChat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [INITIAL_MSG];
    } catch {
      return [INITIAL_MSG];
    }
  });
  const [activeRequestId, setActiveRequestId] = useState<string | null>(() =>
    sessionStorage.getItem(ACTIVE_REQ_KEY),
  );
  const [unread, setUnread] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Persist messages
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (activeRequestId) sessionStorage.setItem(ACTIVE_REQ_KEY, activeRequestId);
    else sessionStorage.removeItem(ACTIVE_REQ_KEY);
  }, [activeRequestId]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  // Realtime: when active request gets quoted, push a message into the chat
  useEffect(() => {
    if (!activeRequestId || !user) return;
    const channel = supabase
      .channel(`req-${activeRequestId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "service_requests",
          filter: `id=eq.${activeRequestId}`,
        },
        (payload) => {
          const newRow = payload.new as any;
          if (newRow.status === "cotizada" && newRow.quoted_amount) {
            const msg: Msg = {
              role: "assistant",
              content: `¡Ya tengo tu presupuesto! 🎉\n\n💰 **$${Number(
                newRow.quoted_amount,
              ).toLocaleString("es-AR")}**\n\nMirá los detalles y confirmá acá: [Ver pedido](/mis-pedidos)`,
            };
            setMessages((prev) => [...prev, msg]);
            if (!open) setUnread((u) => u + 1);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRequestId, user, open]);

  const sendMessage = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    const userMsg: Msg = { role: "user", content: text };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    if (!overrideText) setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("lavadero-chat", {
        body: { messages: newMsgs, active_request_id: activeRequestId },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Disculpá, tuve un problema. Probá de nuevo en un toque." },
        ]);
      } else if (data?.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);

        // Trust the edge function's request_id (it knows what was just created/cancelled)
        if (typeof data.request_id === "string") {
          setActiveRequestId(data.request_id);
        } else if (data.request_id === null) {
          setActiveRequestId(null);
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("No pude conectar con el asistente.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (loading) return;
    sendMessage("Quiero cancelar el turno");
  };

  const reset = () => {
    setMessages([INITIAL_MSG]);
    setActiveRequestId(null);
  };

  const handleOpen = () => {
    setOpen(true);
    setUnread(0);
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <div className="fixed bottom-5 right-5 z-50 flex items-end gap-2">
          {/* Tooltip / cartel */}
          <div className="hidden sm:flex flex-col items-end animate-[float_3s_ease-in-out_infinite]">
            <div className="relative rounded-2xl rounded-br-sm bg-card border border-border px-4 py-2 shadow-lg">
              <p className="text-xs font-bold text-foreground whitespace-nowrap">
                Chateá con <span className="text-primary">FIX</span> 🚗
              </p>
              <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                Tu asistente para reservar turnos
              </p>
              {/* Tail */}
              <div className="absolute -bottom-1.5 right-4 h-3 w-3 rotate-45 border-b border-r border-border bg-card" />
            </div>
          </div>
          <button
            onClick={handleOpen}
            className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-110"
            aria-label="Abrir chat de reservas"
          >
            <MessageCircle className="h-6 w-6" />
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {unread}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 flex h-[min(560px,80vh)] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-border bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <div>
                <p className="text-sm font-bold leading-tight">Fix Bot</p>
                <p className="text-[10px] opacity-80">Reservá tu lavadero en segundos</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={reset}
                className="rounded px-2 py-1 text-[10px] opacity-80 hover:bg-primary-foreground/10"
                title="Nueva conversación"
              >
                Nuevo
              </button>
              <button
                onClick={() => setOpen(false)}
                className="rounded p-1 hover:bg-primary-foreground/10"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-background/40 p-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm bg-muted text-foreground"
                  }`}
                >
                  <SimpleMarkdown
                    text={m.content}
                    onLinkClick={(href) => {
                      if (href.startsWith("/")) {
                        setOpen(false);
                        navigate(href);
                      } else {
                        window.open(href, "_blank");
                      }
                    }}
                  />
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Pensando...
                </div>
              </div>
            )}
            {activeRequestId && !loading && (
              <div className="flex justify-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancel}
                  className="text-destructive hover:text-destructive"
                >
                  Cancelar pedido
                </Button>
              </div>
            )}
            {!user && messages.length > 1 && (
              <div className="flex justify-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    navigate("/login");
                  }}
                >
                  Iniciar sesión para reservar
                </Button>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border bg-card p-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribí tu mensaje..."
                disabled={loading}
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              />
              <Button type="submit" size="icon" disabled={loading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// Tiny markdown renderer: supports **bold** and [text](url) links.
function SimpleMarkdown({
  text,
  onLinkClick,
}: {
  text: string;
  onLinkClick: (href: string) => void;
}) {
  // Split by markdown links first
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: Array<{ type: "text" | "link"; content: string; href?: string }> = [];
  let lastIndex = 0;
  let match;
  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: "link", content: match[1], href: match[2] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: "text", content: text.slice(lastIndex) });
  }

  const renderBold = (s: string) => {
    const segs = s.split(/(\*\*[^*]+\*\*)/g);
    return segs.map((seg, i) =>
      seg.startsWith("**") && seg.endsWith("**") ? (
        <strong key={i}>{seg.slice(2, -2)}</strong>
      ) : (
        <span key={i}>{seg}</span>
      ),
    );
  };

  return (
    <>
      {parts.map((p, i) =>
        p.type === "link" ? (
          <button
            key={i}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onTouchStart={(e) => {
              // Evita que el foco se transfiera al input en mobile tras el tap
              (document.activeElement as HTMLElement | null)?.blur?.();
            }}
            onClick={(e) => {
              e.preventDefault();
              (document.activeElement as HTMLElement | null)?.blur?.();
              onLinkClick(p.href!);
            }}
            className="font-semibold underline underline-offset-2 hover:opacity-80"
          >
            {p.content}
          </button>
        ) : (
          <span key={i}>{renderBold(p.content)}</span>
        ),
      )}
    </>
  );
}
