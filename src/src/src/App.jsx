import { useState, useRef, useEffect } from "react";
import { supabase } from "./supabaseClient";
import Auth from "./Auth";

const SYSTEM_PROMPT = `You are JM Nexus, a powerful, intelligent, and friendly AI assistant. You are sharp, helpful, and slightly futuristic in tone — like a personal AI from the near future. You remember everything in the current conversation. You answer questions clearly and thoroughly. When a user asks you to generate or create an image, respond with: [IMAGE_REQUEST: a detailed image prompt based on what they asked for]. Otherwise, have a natural conversation. Keep responses concise but complete.`;

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "12px 0" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: "50%",
          background: "#7C3AED",
          animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
      <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-8px)} }`}</style>
    </div>
  );
}

function ImagePlaceholder({ prompt }) {
  const [loaded, setLoaded] = useState(false);
  const seed = encodeURIComponent(prompt.slice(0, 50));
  const url = `https://picsum.photos/seed/${seed}/400/300`;

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{
        background: "linear-gradient(135deg, #1e1b4b, #312e81)",
        borderRadius: 12, padding: "8px 12px", marginBottom: 8,
        fontSize: 11, color: "#a5b4fc", fontStyle: "italic"
      }}>
        🎨 Generated image for: "{prompt.slice(0, 60)}{prompt.length > 60 ? "…" : ""}"
      </div>
      <img
        src={url}
        alt={prompt}
        onLoad={() => setLoaded(true)}
        style={{
          width: "100%", maxWidth: 380, borderRadius: 12,
          display: "block",
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.5s ease",
          border: "1px solid #4c1d95"
        }}
      />
      {!loaded && (
        <div style={{
          width: "100%", maxWidth: 380, height: 200, borderRadius: 12,
          background: "linear-gradient(135deg, #1e1b4b, #312e81)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#7c3aed", fontSize: 13
        }}>Generating image…</div>
      )}
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  const imageMatch = msg.content.match(/\[IMAGE_REQUEST:\s*(.+?)\]/);
  const textContent = msg.content.replace(/\[IMAGE_REQUEST:\s*.+?\]/g, "").trim();

  return (
    <div style={{
      display: "flex",
      flexDirection: isUser ? "row-reverse" : "row",
      alignItems: "flex-start",
      gap: 10, marginBottom: 20,
      animation: "fadeIn 0.3s ease",
    }}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{
        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
        background: isUser
          ? "linear-gradient(135deg, #6d28d9, #4c1d95)"
          : "linear-gradient(135deg, #7c3aed, #2563eb)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, fontWeight: 700, color: "white",
        boxShadow: "0 0 12px rgba(124,58,237,0.4)"
      }}>
        {isUser ? "U" : "JM"}
      </div>
      <div style={{ maxWidth: "75%" }}>
        <div style={{
          background: isUser
            ? "linear-gradient(135deg, #4c1d95, #3730a3)"
            : "rgba(255,255,255,0.05)",
          border: isUser ? "none" : "1px solid rgba(124,58,237,0.3)",
          borderRadius: isUser ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
          padding: "12px 16px",
          color: "#e2e8f0",
          fontSize: 14,
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}>
          {textContent}
          {imageMatch && <ImagePlaceholder prompt={imageMatch[1]} />}
        </div>
        <div style={{ fontSize: 10, color: "#6366f1", marginTop: 4, paddingLeft: 4 }}>
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}

const WELCOME_MESSAGE = {
  role: "assistant",
  content: "Hello! I'm JM Nexus — your intelligent AI companion. I can answer questions, hold deep conversations, and generate images. What would you like to explore today?",
  timestamp: Date.now()
};

function Chat({ session }) {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const userId = session.user.id;

  useEffect(() => {
    let cancelled = false;
    async function loadHistory() {
      const { data, error } = await supabase
        .from("messages")
        .select("role, content, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (cancelled) return;
      if (!error && data && data.length > 0) {
        setMessages(data.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: new Date(m.created_at).getTime()
        })));
      }
      setHistoryLoaded(true);
    }
    loadHistory();
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function saveMessage(role, content) {
    const { error } = await supabase
      .from("messages")
      .insert({ user_id: userId, role, content });
    if (error) console.error("Failed to save message:", error.message);
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const userMsg = { role: "user", content: text, timestamp: Date.now() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);
    saveMessage("user", text);

    try {
      const apiMessages = updatedMessages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages
        })
      });

      const data = await res.json();
      const reply = data.content?.map(b => b.text || "").join("") || "I couldn't process that. Try again.";

      setMessages(prev => [...prev, {
        role: "assistant",
        content: reply,
        timestamp: Date.now()
      }]);
      saveMessage("assistant", reply);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "⚠️ Connection error. Please try again.",
        timestamp: Date.now()
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  async function clearChat() {
    await supabase.from("messages").delete().eq("user_id", userId);
    setMessages([{
      role: "assistant",
      content: "Conversation cleared. Starting fresh — what's on your mind?",
      timestamp: Date.now()
    }]);
  }

  function signOut() {
    supabase.auth.signOut();
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0514 0%, #0d0a1f 50%, #0a0514 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      padding: "0 0 20px",
    }}>
      <div style={{
        width: "100%", maxWidth: 700,
        padding: "20px 24px 16px",
        borderBottom: "1px solid rgba(124,58,237,0.2)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        backdropFilter: "blur(10px)",
        position: "sticky", top: 0, zIndex: 10,
        background: "rgba(10,5,20,0.9)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "linear-gradient(135deg, #7c3aed, #2563eb)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 800, color: "white",
            boxShadow: "0 0 20px rgba(124,58,237,0.5)",
          }}>JM</div>
          <div>
            <div style={{
              fontSize: 20, fontWeight: 800, color: "white",
              background: "linear-gradient(90deg, #a78bfa, #60a5fa)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              letterSpacing: "-0.5px"
            }}>JM Nexus</div>
            <div style={{ fontSize: 11, color: "#6366f1", display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
              Online · AI Assistant
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={clearChat} style={{
            background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.3)",
            color: "#a78bfa", borderRadius: 8, padding: "6px 14px",
            fontSize: 12, cursor: "pointer", transition: "all 0.2s"
          }}
            onMouseEnter={e => e.target.style.background = "rgba(124,58,237,0.25)"}
            onMouseLeave={e => e.target.style.background = "rgba(124,58,237,0.1)"}
          >
            New Chat
          </button>
          <button onClick={signOut} style={{
            background: "transparent", border: "1px solid rgba(124,58,237,0.3)",
            color: "#818cf8", borderRadius: 8, padding: "6px 14px",
            fontSize: 12, cursor: "pointer", transition: "all 0.2s"
          }}
            onMouseEnter={e => e.target.style.background = "rgba(124,58,237,0.1)"}
            onMouseLeave={e => e.target.style.background = "transparent"}
          >
            Sign Out
          </button>
        </div>
      </div>

      <div style={{
        width: "100%", maxWidth: 700, padding: "12px 24px",
        display: "flex", gap: 8, flexWrap: "wrap"
      }}>
        {["💬 Deep Q&A", "🎨 Image Generation", "🧠 Remembers Context", "⚡ Fast Responses"].map(tag => (
          <div key={tag} style={{
            fontSize: 11, color: "#818cf8",
            background: "rgba(99,102,241,0.1)",
            border: "1px solid rgba(99,102,241,0.2)",
            borderRadius: 20, padding: "3px 10px"
          }}>{tag}</div>
        ))}
      </div>

      <div style={{
        width: "100%", maxWidth: 700,
        flex: 1, padding: "10px 24px 0",
        overflowY: "auto",
        minHeight: 400,
      }}>
        {messages.map((msg, i) => <Message key={i} msg={msg} />)}
        {loading && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 20 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "linear-gradient(135deg, #7c3aed, #2563eb)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700, color: "white",
              boxShadow: "0 0 12px rgba(124,58,237,0.4)", flexShrink: 0
            }}>JM</div>
            <div style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(124,58,237,0.3)",
              borderRadius: "4px 18px 18px 18px",
              padding: "4px 16px",
            }}>
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 1 && (
        <div style={{
          width: "100%", maxWidth: 700,
          padding: "12px 24px", display: "flex", gap: 8, flexWrap: "wrap"
        }}>
          {[
            "Generate an image of a futuristic city at night",
            "Explain quantum computing simply",
            "Write a short poem about the ocean",
            "What are the best productivity habits?"
          ].map(s => (
            <button key={s} onClick={() => { setInput(s); inputRef.current?.focus(); }} style={{
              background: "rgba(124,58,237,0.08)",
              border: "1px solid rgba(124,58,237,0.25)",
              color: "#a5b4fc", borderRadius: 10,
              padding: "7px 12px", fontSize: 12,
              cursor: "pointer", textAlign: "left",
              transition: "all 0.2s", lineHeight: 1.4
            }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(124,58,237,0.2)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(124,58,237,0.08)"}
            >{s}</button>
          ))}
        </div>
      )}

      <div style={{
        width: "100%", maxWidth: 700, padding: "12px 24px 0",
      }}>
        <div style={{
          display: "flex", gap: 10, alignItems: "flex-end",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(124,58,237,0.35)",
          borderRadius: 16, padding: "10px 14px",
          boxShadow: "0 0 30px rgba(124,58,237,0.1)",
          transition: "border-color 0.2s",
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask anything, or say 'generate an image of…'"
            rows={1}
            style={{
              flex: 1, background: "transparent", border: "none",
              outline: "none", color: "#e2e8f0", fontSize: 14,
              resize: "none", lineHeight: 1.6,
              fontFamily: "inherit", minHeight: 24, maxHeight: 120,
              overflowY: "auto",
            }}
            onInput={e => {
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: loading || !input.trim()
                ? "rgba(124,58,237,0.2)"
                : "linear-gradient(135deg, #7c3aed, #2563eb)",
              border: "none", cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, transition: "all 0.2s",
              boxShadow: loading || !input.trim() ? "none" : "0 0 16px rgba(124,58,237,0.4)"
            }}
          >
            {loading ? "⏳" : "➤"}
          </button>
        </div>
        <div style={{ textAlign: "center", fontSize: 10, color: "#4b5563", marginTop: 8 }}>
          JM Nexus · Powered by Claude · Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}

export default function JMNexus() {
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setCheckingSession(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (checkingSession) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg, #0a0514 0%, #0d0a1f 50%, #0a0514 100%)",
        color: "#a78bfa", fontFamily: "'Inter', sans-serif"
      }}>
        Loading…
      </div>
    );
  }

  return session ? <Chat session={session} /> : <Auth />;
}
