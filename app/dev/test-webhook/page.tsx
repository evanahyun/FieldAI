import { notFound } from "next/navigation";
import Link from "next/link";
import WebhookTester from "./WebhookTester";

export default function DevWebhookTestPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-xl space-y-4">
        <Link href="/dashboard/settings" className="text-sm font-semibold text-accent hover:underline">
          ← Back to settings
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Test webhook</h1>
          <p className="mt-1 text-sm text-slate-600">
            Development-only helper. Posts a sample payload to <code className="font-mono text-xs">/api/calls/webhook</code>.
          </p>
        </div>
        <WebhookTester />
      </div>
    </div>
  );
}
