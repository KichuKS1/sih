import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X, Loader2 } from "lucide-react";
import { chatDeepSeek, type ChatMessage } from "@/lib/deepseek";

interface Msg { role: "user" | "bot"; text: string }

const KB: Array<{ q: RegExp; a: string }> = [
  { q: /(what\s+is\s+)?dementia/i, a: "Dementia is a syndrome affecting memory, thinking, behavior and the ability to perform everyday activities. Alzheimer's disease is the most common cause." },
  { q: /symptom|sign|memory|forget/i, a: "Common signs: memory loss, difficulty planning, confusion about time/place, language problems, poor judgment, mood/behavior changes." },
  { q: /risk|cause/i, a: "Risk factors: age, family history, cardiovascular disease, diabetes, head injury, low physical/social activity." },
  { q: /prevent|reduce|lifestyle/i, a: "Healthy diet, exercise, cognitive and social engagement, good sleep, and blood pressure control may reduce risk." },
  { q: /diagnos|test|screen/i, a: "Diagnosis: clinical history, cognitive tests, labs, and imaging. Early screening helps plan care. Always consult a clinician." },
  { q: /treat|cure|medicat/i, a: "No cure for most dementias, but medicines and therapies can help manage symptoms and enhance quality of life." },
];

function fallbackAnswer(query: string): string {
  for (const item of KB) if (item.q.test(query)) return item.a + " (This is general info, not medical advice)";
  return "I can share general information about dementia (not medical advice). Ask about symptoms, risk factors, prevention, diagnosis, or treatment.";
}

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([{
    role: "bot",
    text: "Hi! How can I help you with dementia-related questions? This is general information, not medical advice.",
  }]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const alreadyShown = sessionStorage.getItem("ms_chatbot_hint");
    if (!alreadyShown) {
      setShowHint(true);
      sessionStorage.setItem("ms_chatbot_hint", "1");
      const t = setTimeout(() => setShowHint(false), 8000);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    if (open) setShowHint(false);
  }, [open]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, open, loading]);

  const callDeepSeek = async (q: string): Promise<string> => {
    const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY as string | undefined;
    if (!apiKey) return fallbackAnswer(q);
    const sys: ChatMessage = {
      role: "system",
      content:
        "You are a helpful dementia information assistant for a cognitive screening app. Answer concisely in 3–6 bullet points, plain language, India-friendly context, and always include: 'This is general information, not medical advice.' If user asks for diagnosis/treatment, recommend consulting a clinician. Avoid claiming to diagnose or store PII.",
    };
    const historyMsgs: ChatMessage[] = messages.map<ChatMessage>((m) => ({
      role: (m.role === "bot" ? "assistant" : "user") as "assistant" | "user",
      content: m.text,
    }));
    const msgs: ChatMessage[] = [sys, ...historyMsgs, { role: "user", content: q }];
    try {
      const text = await chatDeepSeek(msgs, { max_tokens: 300 });
      return text;
    } catch {
      return fallbackAnswer(q);
    }
  };

  const handleSend = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setLoading(true);
    const a = await callDeepSeek(q);
    setMessages((m) => [...m, { role: "bot", text: a }]);
    setLoading(false);
  };

  return (
    <div className="fixed z-50 bottom-6 right-6">
      {/* Bubble button */}
      {!open && (
        <>
          {showHint && (
            <div className="absolute bottom-20 right-4 w-64 rounded-xl border border-border bg-card shadow-xl p-3 text-sm animate-in fade-in slide-in-from-bottom-4">
              <div className="font-semibold">Hey there! 👋</div>
              <p className="text-xs text-muted-foreground mt-1">
                I’m your dementia info assistant. Tap the bubble if you need quick answers or guidance.
              </p>
              <div className="absolute right-12 -bottom-2 h-4 w-4 rotate-45 bg-card border-r border-b border-border" />
            </div>
          )}
          <button
            aria-label="Chatbot"
            onClick={() => setOpen(true)}
            className="relative rounded-full h-14 w-14 flex items-center justify-center bg-primary text-white shadow-lg hover:brightness-110 focus:outline-none"
          >
            <MessageCircle className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Panel */}
      {open && (
        <div className="w-80 h-96 bg-card border border-border rounded-xl shadow-xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/50">
            <div className="text-sm font-medium">Dementia Assistant</div>
            <button className="p-1 hover:bg-muted rounded" onClick={() => setOpen(false)} aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 p-3 overflow-y-auto space-y-2 text-sm">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
                <span className={`inline-block px-3 py-2 rounded-lg ${m.role === "user" ? "bg-primary text-white" : "bg-muted"}`}>
                  {m.text}
                </span>
              </div>
            ))}
            {loading && (
              <div className="text-left">
                <span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking...
                </span>
              </div>
            )}
            <div ref={endRef} />
          </div>
          <div className="p-2 border-t border-border flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" ? handleSend() : undefined}
              placeholder="Type your question..."
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none"
            />
            <button onClick={handleSend} className="p-2 rounded-lg bg-primary text-white hover:brightness-110 disabled:opacity-50" aria-label="Send" disabled={loading}>
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
