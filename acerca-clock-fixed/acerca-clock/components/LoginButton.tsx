"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const allowedDomain = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // Pista a Google para preferir cuentas del dominio corporativo (Workspace).
        queryParams: allowedDomain ? { hd: allowedDomain, prompt: "select_account" } : { prompt: "select_account" },
      },
    });

    if (error) {
      console.error("Google login error:", error.message);
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="w-full inline-flex items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-5 py-3 text-slate-800 font-medium shadow-sm hover:bg-slate-50 transition disabled:opacity-60"
    >
      <GoogleLogo />
      {loading ? "Conectando..." : "Entrar con Google"}
    </button>
  );
}

function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.5 29.6 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.9 29.6 4.9 24 4.9 16 4.9 9.2 9.6 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 43.5c5.5 0 10.4-1.9 14.1-5.1l-6.5-5.5c-2 1.4-4.6 2.1-7.6 2.1-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.1 38.6 16 43.5 24 43.5z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.4 5.6l6.5 5.5C40.6 36.6 43.5 30.7 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
    </svg>
  );
}
