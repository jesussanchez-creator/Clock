"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LogoutLink() {
  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-slate-600 hover:text-slate-900 underline underline-offset-4"
    >
      Cerrar sesión
    </button>
  );
}
