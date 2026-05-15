export function SupabaseEnvBanner() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (url && anon) {
    return null;
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-950">
      <strong>Supabase environment variables are missing on the server.</strong> For local dev, add{" "}
      <code className="rounded bg-amber-100 px-1 py-0.5">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
      <code className="rounded bg-amber-100 px-1 py-0.5">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
      <code className="rounded bg-amber-100 px-1 py-0.5">.env.local</code> and restart{" "}
      <code className="rounded bg-amber-100 px-1 py-0.5">npm run dev</code>. On{" "}
      <strong>Vercel</strong>, set the same variables for <strong>Production</strong> (and Preview if needed), then{" "}
      <strong>Redeploy</strong> so the <code className="rounded bg-amber-100 px-1 py-0.5">NEXT_PUBLIC_*</code> values
      are included in the build. Webhooks need{" "}
      <code className="rounded bg-amber-100 px-1 py-0.5">SUPABASE_SERVICE_ROLE_KEY</code> (server only).
    </div>
  );
}
