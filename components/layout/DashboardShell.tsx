import Link from "next/link";
import { LogoutButton } from "@/components/layout/LogoutButton";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/leads", label: "Leads" },
  { href: "/dashboard/calls", label: "Calls" },
  { href: "/dashboard/settings", label: "Settings" },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-8 lg:px-8">
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-8 space-y-6">
            <div>
              <Link href="/" className="text-lg font-semibold tracking-tight text-slate-900">
                FieldAI
              </Link>
              <p className="mt-1 text-xs text-slate-500">AI front desk</p>
            </div>
            <nav className="space-y-1">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white hover:shadow-sm"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
            <LogoutButton />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <Link href="/dashboard" className="text-lg font-semibold text-slate-900">
              FieldAI
            </Link>
            <LogoutButton />
          </div>
          <div className="mb-6 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                {l.label}
              </Link>
            ))}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
