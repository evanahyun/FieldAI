export function SupabaseEnvBanner() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anon) {
    return null;
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-950">
      <strong>Supabase environment variables are missing.</strong> Add{" "}
      <code className="rounded bg-amber-100 px-1 py-0.5">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
      <code className="rounded bg-amber-100 px-1 py-0.5">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
      <code className="rounded bg-amber-100 px-1 py-0.5">.env.local</code>, then restart{" "}
      <code className="rounded bg-amber-100 px-1 py-0.5">npm run dev</code>. The webhook also needs{" "}
      <code className="rounded bg-amber-100 px-1 py-0.5">SUPABASE_SERVICE_ROLE_KEY</code> on the server.
    </div>
  );
}
