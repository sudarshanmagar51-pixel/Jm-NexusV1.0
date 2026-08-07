import { useState } from "react";
import { supabase } from "./supabaseClient";

export default function Auth() {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleGoogle() {
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
    if (error) setError(error.message);
  }

  async function handleEmailAuth(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setNotice("Check your email to confirm your account.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0514 0%, #0d0a1f 50%, #0a0514 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      padding: 20,
    }}>
      <div style={{
        width: "100%", maxWidth: 380,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(124,58,237,0.3)",
        borderRadius: 20, padding: 32,
        boxShadow: "0 0 40px rgba(124,58,237,0.15)",
      }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: "linear-gradient(135deg, #7c3aed, #2563eb)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 800, color: "white",
            boxShadow: "0 0 20px rgba(124,58,237,0.5)",
          }}>JM</div>
        </div>
        <div style={{
          fontSize: 22, fontWeight: 800, color: "white", textAlign: "center",
          background: "linear-gradient(90deg, #a78bfa, #60a5fa)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          marginBottom: 6
        }}>JM Nexus</div>
        <div style={{ fontSize: 13, color: "#818cf8", textAlign: "center", marginBottom: 24 }}>
          {mode === "signin" ? "Sign in to continue" : "Create your account"}
        </div>

        <button onClick={handleGoogle} style={{
          width: "100%", padding: "11px 0", borderRadius: 10,
          background: "white", border: "none", cursor: "pointer",
          fontSize: 14, fontWeight: 600, color: "#1f2937",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          marginBottom: 16
        }}>
          <span style={{ fontSize: 16 }}>G</span> Continue with Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0", color: "#4b5563", fontSize: 11 }}>
          <div style={{ flex: 1, height: 1, background: "rgba(124,58,237,0.2)" }} />
          OR
          <div style={{ flex: 1, height: 1, background: "rgba(124,58,237,0.2)" }} />
        </div>

        <form onSubmit={handleEmailAuth}>
          <input
            type="email" required placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)}
            style={{
              width: "100%", boxSizing: "border-box", padding: "11px 14px", marginBottom: 10,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(124,58,237,0.3)",
              borderRadius: 10, color: "#e2e8f0", fontSize: 14, outline: "none"
            }}
          />
          <input
            type="password" required placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)}
            style={{
              width: "100%", boxSizing: "border-box", padding: "11px 14px", marginBottom: 14,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(124,58,237,0.3)",
              borderRadius: 10, color: "#e2e8f0", fontSize: 14, outline: "none"
            }}
          />
          {error && <div style={{ color: "#f87171", fontSize: 12, marginBottom: 10 }}>{error}</div>}
          {notice && <div style={{ color: "#4ade80", fontSize: 12, marginBottom: 10 }}>{notice}</div>}
          <button type="submit" disabled={loading} style={{
            width: "100%", padding: "11px 0", borderRadius: 10,
            background: "linear-gradient(135deg, #7c3aed, #2563eb)",
            border: "none", cursor: loading ? "not-allowed" : "pointer",
            fontSize: 14, fontWeight: 600, color: "white",
            boxShadow: "0 0 16px rgba(124,58,237,0.4)"
          }}>
            {loading ? "Please wait…" : mode === "signin" ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <div style={{ textAlign: "center", fontSize: 12, color: "#818cf8", marginTop: 18, cursor: "pointer" }}
          onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setNotice(""); }}>
          {mode === "signin" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
        </div>
      </div>
    </div>
  );
}
