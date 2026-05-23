import React from 'react';
import { supabase, isConfigured } from './lib/supabase';

// ─── LoginScreen: sign in / sign up with email + password ───
function LoginScreen({ onSignedIn }) {
  const [mode, setMode] = React.useState("signin"); // signin | signup
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState(null);

  async function submit() {
    if (!isConfigured) {
      setMsg({ kind: "error", text: "Supabase មិនទាន់ configure ទេ — សូមកំណត់ VITE_SUPABASE_URL និង VITE_SUPABASE_ANON_KEY" });
      return;
    }
    if (!email.trim() || !password) {
      setMsg({ kind: "error", text: "សូមបញ្ចូល Email និង Password" });
      return;
    }
    if (mode === "signup" && password.length < 6) {
      setMsg({ kind: "error", text: "Password ត្រូវយ៉ាងតិច 6 តួ" });
      return;
    }
    setBusy(true); setMsg(null);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        if (data.user && !data.session) {
          setMsg({ kind: "info", text: "✉️ យើងបានផ្ញើ Verification Email ហើយ! សូមបើក Inbox ហើយចុចតំណ​ដើម្បីបញ្ជាក់, បន្ទាប់មក Sign In។" });
          setMode("signin");
        } else if (data.session) {
          onSignedIn(data.session);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        onSignedIn(data.session);
      }
    } catch (e) {
      setMsg({ kind: "error", text: e.message || String(e) });
    } finally {
      setBusy(false);
    }
  }

  function onKey(e) { if (e.key === "Enter") submit(); }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg-0)', padding: 20 }}>
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--accent)', display: 'grid', placeItems: 'center', color: '#0b0b0b', fontWeight: 800, fontSize: 22 }}>G</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '0.02em' }}>GARAGE OS</div>
            <div className="mono muted" style={{ fontSize: 10, letterSpacing: '0.12em' }}>SERVICE CENTER · KH</div>
          </div>
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
          {mode === "signin" ? "សូមស្វាគមន៍មកវិញ" : "បង្កើតគណនីថ្មី"}
        </h2>
        <div className="muted" style={{ fontSize: 13, marginBottom: 20 }}>
          {mode === "signin" ? "Sign in ដើម្បីបន្តទៅ Garage OS" : "Sign up ជាមួយ Email + Password"}
        </div>

        <div className="field" style={{ marginBottom: 12 }}>
          <label>Email</label>
          <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={onKey} placeholder="you@example.com" autoFocus autoComplete="email" />
        </div>
        <div className="field" style={{ marginBottom: 16 }}>
          <label>Password</label>
          <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={onKey} placeholder={mode === "signup" ? "យ៉ាងតិច 6 តួ" : "••••••"} autoComplete={mode === "signin" ? "current-password" : "new-password"} />
        </div>

        {msg && (
          <div style={{ padding: 12, borderRadius: 8, marginBottom: 14, fontSize: 13,
            background: msg.kind === "error" ? 'var(--danger-soft, rgba(239,68,68,0.1))' : 'var(--info-soft, rgba(56,189,248,0.1))',
            color: msg.kind === "error" ? 'var(--danger, #ef4444)' : 'var(--info, #38bdf8)',
            border: '1px solid ' + (msg.kind === "error" ? 'rgba(239,68,68,0.3)' : 'rgba(56,189,248,0.3)'),
          }}>
            {msg.text}
          </div>
        )}

        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px 16px' }} onClick={submit} disabled={busy}>
          {busy ? "..." : mode === "signin" ? "Sign In" : "Sign Up"}
        </button>

        <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: 'var(--text-2)' }}>
          {mode === "signin" ? (
            <>មិនទាន់មានគណនី? <a href="#" onClick={(e) => { e.preventDefault(); setMode("signup"); setMsg(null); }} style={{ color: 'var(--accent-text)', fontWeight: 600 }}>បង្កើតគណនី</a></>
          ) : (
            <>មានគណនីរួចហើយ? <a href="#" onClick={(e) => { e.preventDefault(); setMode("signin"); setMsg(null); }} style={{ color: 'var(--accent-text)', fontWeight: 600 }}>Sign In វិញ</a></>
          )}
        </div>

        {!isConfigured && (
          <div style={{ marginTop: 18, padding: 10, borderRadius: 6, background: 'var(--bg-2)', fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
            ⚠️ Supabase keys មិនទាន់កំណត់ទេ — សូមមើល SUPABASE_SETUP.md
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingScreen({ message }) {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg-0)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: 12, background: 'var(--accent)', display: 'grid', placeItems: 'center', color: '#0b0b0b', fontWeight: 800, fontSize: 26, margin: '0 auto 16px' }}>G</div>
        <div className="mono muted" style={{ fontSize: 11, letterSpacing: '0.14em' }}>{message || "GARAGE OS · LOADING"}</div>
      </div>
    </div>
  );
}

export { LoginScreen, LoadingScreen };
