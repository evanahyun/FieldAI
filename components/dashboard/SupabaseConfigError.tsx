export function SupabaseConfigError({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
      <p className="font-semibold">Supabase is not configured</p>
      <p className="mt-2 text-amber-900">{message}</p>
      <p className="mt-3 text-xs text-amber-900/80">
        Copy <code className="rounded bg-amber-100 px-1 py-0.5 font-mono">.env.example</code> to{" "}
        <code className="rounded bg-amber-100 px-1 py-0.5 font-mono">.env.local</code>, add your project keys, then restart{" "}
        <code className="rounded bg-amber-100 px-1 py-0.5 font-mono">npm run dev</code>.
      </p>
    </div>
  );
}
