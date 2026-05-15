import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold tracking-tight text-slate-900">FieldAI</span>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-600"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="max-w-3xl space-y-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">Field service, front desk AI</p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Never miss another emergency call.
          </h1>
          <p className="text-lg leading-relaxed text-slate-600">
            FieldAI is an AI front desk and lead workspace for local service businesses: plumbers, HVAC, electrical,
            roofing, landscaping, cleaners, contractors, med spas, auto shops, wellness studios, and more. It answers
            calls, captures structured job details, flags true emergencies, and routes qualified leads to your
            dashboard.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/signup"
              className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-600"
            >
              Create your workspace
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              View dashboard
            </Link>
          </div>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {[
            {
              title: "AI-qualified leads",
              body: "Structured intake with transcripts, summaries, and urgency so dispatch knows what to do first.",
            },
            {
              title: "Built for multi-tenant teams",
              body: "Each company has its own data, settings, and call history — safely isolated with Supabase RLS.",
            },
            {
              title: "Ready for voice providers",
              body: "Webhook-friendly API designed for Vapi or Retell, with SMS follow-up via Twilio as a next step.",
            },
          ].map((card) => (
            <div key={card.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
