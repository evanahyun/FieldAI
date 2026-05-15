"use client";

import { useRouter } from "next/navigation";
import { tryCreateBrowserClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    const r = tryCreateBrowserClient();
    if (r.ok) {
      await r.client.auth.signOut();
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
    >
      Log out
    </button>
  );
}
