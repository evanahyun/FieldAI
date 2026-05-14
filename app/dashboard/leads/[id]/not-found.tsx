import Link from "next/link";

export default function LeadNotFound() {
  return (
    <div className="mx-auto max-w-lg space-y-4 px-6 py-16 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Lead not found</h1>
      <p className="text-sm text-slate-600">This lead does not exist or is not part of your company.</p>
      <Link href="/dashboard/leads" className="inline-flex text-sm font-semibold text-accent hover:underline">
        Back to leads
      </Link>
    </div>
  );
}
