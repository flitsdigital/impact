"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Mail, Lock, Eye, EyeOff, ChevronRight, Zap } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    // rememberMe: Supabase beheert sessie-persistentie op client-niveau, niet per call.
    // Sessies zijn standaard persistent (localStorage). TODO: implementeer via aparte client config.
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        background: "var(--bg-0)",
      }}
    >
      {/* ─── Left — brand pane ─── */}
      <div
        style={{
          position: "relative",
          padding: 32,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: `
            radial-gradient(900px 600px at 18% 28%, rgba(255, 243, 1, 0.06), transparent 60%),
            radial-gradient(700px 500px at 80% 80%, rgba(91, 91, 214, 0.10), transparent 60%),
            var(--bg-0)
          `,
          borderRight: "1px solid var(--border-subtle)",
          overflow: "hidden",
        }}
      >
        {/* Grid overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Brand mark */}
          <div className="flex items-center gap-[10px]">
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: "rgba(255, 243, 1, 0.20)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Zap size={18} fill="var(--brand-yellow)" color="var(--brand-yellow)" />
            </span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "var(--fg-1)",
              }}
            >
              Flits Impact CRM
            </span>
          </div>
        </div>

        {/* Center copy */}
        <div style={{ position: "relative", zIndex: 1, maxWidth: 480 }}>
          <p
            style={{
              margin: "0 0 16px",
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--fg-3)",
            }}
          >
            Welkom terug
          </p>
          <h1
            style={{
              margin: "0 0 16px",
              fontSize: 42,
              lineHeight: 1.08,
              fontWeight: 600,
              letterSpacing: "-0.025em",
              color: "var(--fg-1)",
            }}
          >
            Beheer je klanten, content en facturen —{" "}
            <em
              style={{
                color: "var(--brand-yellow)",
                fontStyle: "normal",
                fontWeight: 700,
              }}
            >
              op één plek
            </em>
            .
          </h1>
          <p
            style={{
              margin: "0 0 32px",
              fontSize: 14,
              lineHeight: 1.6,
              color: "var(--fg-2)",
            }}
          >
            Flits Impact CRM bundelt alles wat een klein agency nodig heeft.
            Van content-kalenders tot facturatie-tijdlijnen — gemaakt voor wie
            snel wil schakelen.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 32,
              paddingTop: 24,
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            {[
              { value: "15", label: "Actieve klanten" },
              { value: "€ 4.837", label: "Maandomzet" },
              { value: "7", label: "Acties vereist" },
            ].map((s) => (
              <div key={s.label}>
                <span
                  style={{
                    display: "block",
                    fontSize: 22,
                    fontWeight: 700,
                    color: "var(--fg-1)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {s.value}
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: 11,
                    color: "var(--fg-3)",
                    marginTop: 2,
                  }}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 11,
            color: "var(--fg-3)",
          }}
        >
          <span>2026 Flits Impact</span>
          <span style={{ display: "flex", gap: 8 }}>
            <a href="#" style={{ color: "var(--fg-2)", textDecoration: "none" }}>Privacy</a>
            <span>·</span>
            <a href="#" style={{ color: "var(--fg-2)", textDecoration: "none" }}>Voorwaarden</a>
          </span>
        </div>
      </div>

      {/* ─── Right — form pane ─── */}
      <div
        style={{
          padding: 32,
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-1)",
        }}
      >
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <form
            onSubmit={handleSubmit}
            style={{
              width: "100%",
              maxWidth: 380,
              display: "flex",
              flexDirection: "column",
              gap: 24,
            }}
          >
            {/* Head */}
            <div>
              <h2
                style={{
                  margin: "0 0 6px",
                  fontSize: 24,
                  fontWeight: 600,
                  color: "var(--fg-1)",
                  letterSpacing: "-0.02em",
                }}
              >
                Inloggen
              </h2>
              <p style={{ margin: 0, fontSize: "var(--fs-13)", color: "var(--fg-3)" }}>
                Voer je e-mailadres en wachtwoord in om door te gaan.
              </p>
            </div>

            {/* Fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Email */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label
                  htmlFor="email"
                  style={{ fontSize: "var(--fs-12)", color: "var(--fg-2)", fontWeight: 500 }}
                >
                  E-mailadres
                </label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <Mail
                    size={14}
                    style={{
                      position: "absolute",
                      left: 10,
                      color: "var(--fg-3)",
                      pointerEvents: "none",
                    }}
                  />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jij@bedrijf.nl"
                    className="fl-input"
                    style={{ paddingLeft: 34 }}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <label
                    htmlFor="password"
                    style={{ fontSize: "var(--fs-12)", color: "var(--fg-2)", fontWeight: 500 }}
                  >
                    Wachtwoord
                  </label>
                  <a
                    href="#"
                    style={{
                      fontSize: 11,
                      color: "var(--fg-2)",
                      textDecoration: "none",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Wachtwoord vergeten?
                  </a>
                </div>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <Lock
                    size={14}
                    style={{
                      position: "absolute",
                      left: 10,
                      color: "var(--fg-3)",
                      pointerEvents: "none",
                    }}
                  />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="fl-input"
                    style={{ paddingLeft: 34, paddingRight: 38 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: 6,
                      width: 26,
                      height: 26,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "none",
                      background: "transparent",
                      color: "var(--fg-3)",
                      cursor: "pointer",
                      borderRadius: 4,
                    }}
                    aria-label={showPassword ? "Verberg wachtwoord" : "Toon wachtwoord"}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: "var(--fs-12)",
                  color: "var(--fg-2)",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <button
                  type="button"
                  onClick={() => setRememberMe(!rememberMe)}
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    border: rememberMe ? "1px solid #5B5BD6" : "1px solid var(--border-strong)",
                    background: rememberMe ? "#5B5BD6" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    cursor: "pointer",
                  }}
                  aria-label="Onthoud mij"
                >
                  {rememberMe && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                Onthoud mij op dit apparaat
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="fl-btn-primary"
              style={{ width: "100%" }}
            >
              {loading ? (
                <span
                  style={{
                    width: 14,
                    height: 14,
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#fff",
                    borderRadius: "50%",
                    display: "inline-block",
                    animation: "spin 0.6s linear infinite",
                  }}
                />
              ) : null}
              {loading ? "Inloggen..." : "Inloggen"}
              {!loading && <ChevronRight size={14} />}
            </button>
          </form>
        </div>
      </div>

      {/* Spinner animation */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 880px) {
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
