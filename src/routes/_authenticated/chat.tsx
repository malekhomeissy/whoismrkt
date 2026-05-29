import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/site/Logo";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Send, LogOut, Sparkles, Trash2, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({ meta: [{ title: "MRKT — AI marketing strategist" }] }),
  component: ChatPage,
});

type Msg  = { role: "user" | "assistant"; content: string };
type Chat = { id: string; title: string; updated_at: string };

const SUGGESTIONS = [
  "Build a 4-week content calendar for a new skincare brand on Instagram and TikTok.",
  "Write 5 high-converting hooks for a fitness coach launching a 30-day program.",
  "Create 3 reel scripts for a luxury watch brand — under 30 seconds each.",
  "Audit my brand voice and recommend 3 content pillars with examples.",
];

function ChatPage() {
  const { user, signOut } = useAuth();
  const [chats,    setChats]    = useState<Chat[]>([]);
  const [chatId,   setChatId]   = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input,    setInput]    = useState("");
  const [streaming,setStreaming]= useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const textarea  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { loadChats(); }, []);
  useEffect(() => { if (chatId) loadMessages(chatId); else setMessages([]); }, [chatId]);
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textarea.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [input]);

  async function loadChats() {
    const { data } = await supabase
      .from("chats")
      .select("id,title,updated_at")
      .order("updated_at", { ascending: false });
    setChats(data ?? []);
    if (!chatId && data && data.length) setChatId(data[0].id);
  }

  async function loadMessages(id: string) {
    const { data } = await supabase
      .from("messages")
      .select("role,content")
      .eq("chat_id", id)
      .order("created_at");
    setMessages((data ?? []) as Msg[]);
  }

  async function newChat() {
    setChatId(null);
    setMessages([]);
    setInput("");
  }

  async function deleteChat(id: string) {
    await supabase.from("chats").delete().eq("id", id);
    if (chatId === id) { setChatId(null); setMessages([]); }
    loadChats();
  }

  async function send(text: string) {
    if (!text.trim() || streaming || !user) return;
    // Lock immediately — before any await — so rapid double-clicks can't slip through
    setStreaming(true);
    setInput("");

    let activeId = chatId;
    if (!activeId) {
      const title = text.trim().slice(0, 60);
      const { data, error } = await supabase
        .from("chats")
        .insert({ user_id: user.id, title })
        .select()
        .single();
      if (error || !data) {
        setStreaming(false);
        return toast.error("Couldn't start session");
      }
      activeId = data.id;
      setChatId(activeId);
      setChats((c) => [{ id: data.id, title, updated_at: data.updated_at }, ...c]);
    }

    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages([...next, { role: "assistant", content: "" }]);

    await supabase.from("messages").insert({
      chat_id: activeId, user_id: user.id, role: "user", content: text,
    });

    let assistant = "";
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Session expired — please sign in again.");
        setStreaming(false);
        return;
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ messages: next }),
        },
      );

      if (!res.ok || !res.body) {
        // Read the error body from the edge function so we show the real message
        let errMsg = "Something went wrong. Try again.";
        try {
          const errBody = await res.clone().json();
          if (errBody?.error) errMsg = errBody.error;
        } catch { /* use default */ }
        toast.error(errMsg);
        setMessages(next);
        setStreaming(false);
        return;
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;

      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const delta  = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistant += delta;
              setMessages([...next, { role: "assistant", content: assistant }]);
            }
          } catch { buf = line + "\n" + buf; break; }
        }
      }

      if (assistant) {
        await supabase.from("messages").insert({
          chat_id: activeId, user_id: user.id, role: "assistant", content: assistant,
        });
        await supabase.from("chats")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", activeId);
      }
    } catch (e) {
      console.error(e);
      toast.error("Connection failed");
    } finally {
      setStreaming(false);
    }
  }

  const initial = user?.email?.[0]?.toUpperCase() ?? "M";

  return (
    <div className="h-screen flex bg-background text-foreground overflow-hidden">

      {/* ── SIDEBAR ─────────────────────────────────────────────────── */}
      <aside
        className="hidden md:flex w-[17rem] flex-col flex-none"
        style={{ background: "oklch(0.055 0 0)", borderRight: "1px solid oklch(1 0 0 / 6%)" }}
      >
        {/* Logo */}
        <div className="h-[4.5rem] flex items-center px-5 shrink-0" style={{ borderBottom: "1px solid oklch(1 0 0 / 6%)" }}>
          <Link to="/"><Logo /></Link>
        </div>

        {/* New session */}
        <div className="p-4 shrink-0">
          <button
            onClick={newChat}
            className="btn-primary w-full h-9 rounded-full text-[0.8125rem] font-semibold inline-flex items-center justify-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> New session
          </button>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto px-3 pb-4 min-h-0">
          {chats.length > 0 && (
            <div className="px-2 pb-2 pt-1 text-[9px] font-medium uppercase tracking-[0.3em] text-muted-foreground/40">
              Recent
            </div>
          )}
          {chats.length === 0 && (
            <div className="px-3 py-3 text-[0.8125rem] text-muted-foreground/40">No sessions yet.</div>
          )}
          {chats.map((c) => (
            <div
              key={c.id}
              className={`group flex items-center rounded-xl mb-px transition-colors duration-150 ${
                chatId === c.id
                  ? "bg-white/[0.07] text-foreground/90"
                  : "text-muted-foreground/55 hover:bg-white/[0.04] hover:text-foreground/75"
              }`}
            >
              {chatId === c.id && (
                <span className="ml-2.5 mr-0.5 h-4 w-[2px] rounded-full bg-white/45 flex-none" />
              )}
              <button
                onClick={() => setChatId(c.id)}
                className="flex-1 text-left px-3 py-2.5 text-[0.8125rem] truncate leading-snug"
              >
                {c.title}
              </button>
              <button
                onClick={() => deleteChat(c.id)}
                className="opacity-0 group-hover:opacity-100 p-2 mr-1.5 text-muted-foreground/35 hover:text-muted-foreground/70 transition"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>

        {/* User footer */}
        <div className="shrink-0 p-4" style={{ borderTop: "1px solid oklch(1 0 0 / 6%)" }}>
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-full bg-white/10 flex-none flex items-center justify-center text-[10px] font-semibold text-white/60">
              {initial}
            </div>
            <span className="flex-1 text-[0.75rem] text-muted-foreground/50 truncate min-w-0">
              {user?.email}
            </span>
            <button
              onClick={() => signOut()}
              className="p-1.5 text-muted-foreground/35 hover:text-foreground/60 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN ────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile header */}
        <div
          className="md:hidden h-[4.5rem] px-5 flex items-center justify-between shrink-0"
          style={{ borderBottom: "1px solid oklch(1 0 0 / 8%)" }}
        >
          <Link to="/"><Logo /></Link>
          <button
            onClick={newChat}
            className="btn-ghost inline-flex items-center gap-1.5 rounded-full px-3 h-8 text-[0.8125rem]"
          >
            <Plus className="h-3.5 w-3.5" /> New
          </button>
        </div>

        {/* Messages area */}
        <div ref={scroller} className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (

            /* ── EMPTY STATE ── */
            <div className="h-full flex items-center justify-center px-6 py-16">
              <div className="w-full max-w-lg text-center">

                {/* Icon */}
                <div className="mx-auto mb-8 relative h-14 w-14">
                  <div
                    className="ring-spinner absolute inset-0 rounded-full"
                    style={{ border: "1px solid oklch(1 0 0 / 18%)", animation: "ring-spin 18s linear infinite" }}
                  />
                  <div
                    className="ring-spinner absolute inset-[6px] rounded-full"
                    style={{ border: "1px solid oklch(1 0 0 / 10%)", animation: "ring-spin-r 28s linear infinite" }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="h-4 w-4" style={{ color: "oklch(0.78 0.005 250)" }} />
                  </div>
                </div>

                <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-[-0.04em] leading-[1.05]">
                  What are we{" "}
                  <span className="text-foreground/90">building today?</span>
                </h1>
                <p className="mt-3 text-[0.9375rem] text-muted-foreground/50 font-light">
                  Strategy, calendars, hooks, captions — ask MRKT anything.
                </p>

                <div className="mt-8 grid sm:grid-cols-2 gap-2.5 text-left">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      disabled={streaming}
                      className="surface chrome-border rounded-xl px-4 py-3.5 text-[0.8125rem] text-muted-foreground/65 hover:text-foreground/85 hover:surface-2 transition-all duration-200 leading-relaxed text-left disabled:opacity-40 disabled:pointer-events-none"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          ) : (

            /* ── MESSAGE THREAD ── */
            <div className="max-w-2xl mx-auto w-full px-5 py-10 space-y-10">
              {messages.map((m, i) =>
                m.role === "user" ? (

                  /* User bubble */
                  <div key={i} className="flex justify-end">
                    <div
                      className="max-w-[82%] rounded-[18px] rounded-br-[4px] px-4 py-3 text-[0.9375rem] leading-relaxed"
                      style={{ background: "oklch(1 0 0 / 7%)", border: "1px solid oklch(1 0 0 / 8%)" }}
                    >
                      {m.content}
                    </div>
                  </div>

                ) : (

                  /* MRKT response */
                  <div key={i}>
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="h-3.5 w-3.5 flex-none" style={{ color: "oklch(0.78 0.005 250)" }} />
                      <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/45">
                        MRKT
                      </span>
                    </div>
                    <div className="prose prose-invert prose-sm max-w-none leading-[1.75] prose-headings:font-display prose-headings:tracking-tight prose-a:text-foreground/70 prose-code:text-foreground/80 prose-code:bg-white/5 prose-code:rounded prose-code:px-1 prose-p:text-foreground/80 prose-li:text-foreground/80">
                      {m.content ? (
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      ) : (
                        <div className="flex items-center gap-2.5 py-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 animate-pulse" />
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/20 animate-pulse" style={{ animationDelay: "0.15s" }} />
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/10 animate-pulse" style={{ animationDelay: "0.3s" }} />
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* ── COMPOSER ────────────────────────────────────────────── */}
        <div className="shrink-0 px-5 py-4 md:px-8">
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="max-w-2xl mx-auto"
          >
            <div
              className="flex items-end gap-3 rounded-2xl transition-[border-color] duration-200 p-3 pl-4"
              style={{
                background: "oklch(0.07 0 0)",
                border: "1px solid oklch(1 0 0 / 10%)",
              }}
              onFocusCapture={(e) => {
                e.currentTarget.style.borderColor = "oklch(1 0 0 / 24%)";
              }}
              onBlurCapture={(e) => {
                e.currentTarget.style.borderColor = "oklch(1 0 0 / 10%)";
              }}
            >
              <textarea
                ref={textarea}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="Ask your marketing strategist…"
                rows={1}
                className="flex-1 bg-transparent resize-none outline-none text-[0.9375rem] leading-relaxed placeholder:text-muted-foreground/28 py-1.5"
                style={{ minHeight: 24, maxHeight: 160 }}
              />
              <button
                type="submit"
                disabled={streaming || !input.trim()}
                className="btn-icon h-9 w-9 rounded-full flex-none inline-flex items-center justify-center"
              >
                <Send className="h-3.5 w-3.5 text-black" />
              </button>
            </div>
            <p className="mt-2 text-[11px] text-center text-muted-foreground/28">
              MRKT can make mistakes — verify before publishing.
            </p>
          </form>
        </div>

        {/* Mobile bottom chat list */}
        {messages.length === 0 && chats.length > 0 && (
          <div className="md:hidden shrink-0 px-5 pb-4">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {chats.slice(0, 6).map((c) => (
                <button
                  key={c.id}
                  onClick={() => setChatId(c.id)}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-1.5 text-xs text-muted-foreground/60 hover:border-white/25 hover:text-foreground/75 transition"
                >
                  <MessageSquare className="h-3 w-3" />
                  <span className="truncate max-w-[120px]">{c.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
