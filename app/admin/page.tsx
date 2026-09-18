import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const STATUS_META: Record<string, { label: string; heading: string }> = {
  pending_review: { label: "Pending", heading: "Work pending client approval" },
  approved: { label: "Approved", heading: "Approved work" },
  changes_requested: { label: "Changes Requested", heading: "Work needing revisions" },
  draft: { label: "Draft", heading: "Draft work" },
};

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await createClient();

  const [{ count: totalClients }, { count: pending }, { count: approved }, { count: revisions }] =
    await Promise.all([
      supabase.from("clients").select("*", { count: "exact", head: true }),
      supabase.from("work_items").select("*", { count: "exact", head: true }).eq("status", "pending_review"),
      supabase.from("work_items").select("*", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("work_items").select("*", { count: "exact", head: true }).eq("status", "changes_requested"),
    ]);

  // When a stat card is clicked, filter by that status and show everything
  // matching it. Otherwise, just show the 8 most recent items across all statuses.
  let workQuery = supabase
    .from("work_items")
    .select("id, title, work_type, status, created_at, clients(company_name)")
    .order("created_at", { ascending: false });

  workQuery = status ? workQuery.eq("status", status) : workQuery.limit(8);

  const { data: recentWork } = await workQuery;

  const statusLabel: Record<string, string> = {
    draft: "Draft",
    pending_review: "Pending",
    approved: "Approved",
    changes_requested: "Changes Requested",
  };

  const statusColor: Record<string, string> = {
    draft: "text-neutral-400",
    pending_review: "text-amber-400",
    approved: "text-green-400",
    changes_requested: "text-red-400",
  };

  const cards = [
    { key: null, label: "Total clients", value: totalClients ?? 0, icon: "🏢", href: "/admin/clients" },
    { key: "pending_review", label: "Pending approval", value: pending ?? 0, icon: "⏳", href: "/admin?status=pending_review" },
    { key: "approved", label: "Approved", value: approved ?? 0, icon: "✅", href: "/admin?status=approved" },
    { key: "changes_requested", label: "Revisions", value: revisions ?? 0, icon: "✏️", href: "/admin?status=changes_requested" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <h1 className="text-xl font-semibold">Overview of all client work</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`bg-neutral-900 border rounded-xl p-5 hover:border-amber-400/50 transition block ${
              status === card.key ? "border-amber-400/60" : "border-neutral-800"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-neutral-400 text-sm">{card.label}</p>
              <span className="text-lg opacity-60">{card.icon}</span>
            </div>
            <p className="text-3xl font-semibold mt-1">{card.value}</p>
          </Link>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium">
            {status ? STATUS_META[status]?.heading ?? "Filtered work" : "Recent client work"}
          </h2>
          {status && (
            <Link href="/admin" className="text-sm text-neutral-400 hover:text-white transition">
              ← Back to all
            </Link>
          )}
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl divide-y divide-neutral-800">
          {recentWork?.length ? (
            recentWork.map((item: any) => (
              <Link
                key={item.id}
                href={`/admin/work/${item.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-neutral-800/50 transition"
              >
                <div>
                  <p className="font-medium">
                    {item.clients?.company_name} — {item.title}
                  </p>
                  <p className="text-sm text-neutral-400 capitalize">{item.work_type}</p>
                </div>
                <span className={`text-sm font-medium ${statusColor[item.status]}`}>
                  {statusLabel[item.status]}
                </span>
              </Link>
            ))
          ) : (
            <div className="px-5 py-16 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-neutral-800 flex items-center justify-center text-neutral-500 text-xl mb-3">
                📁
              </div>
              <p className="text-neutral-400 font-medium">
                {status ? "Nothing here right now" : "No work uploaded yet"}
              </p>
              <p className="text-neutral-600 text-sm mt-1">
                {status ? "Check back once something matches this status." : "Upload your first reel, poster, or design to get started."}
              </p>
              {!status && (
                <Link href="/admin/upload" className="inline-block mt-4 rounded-lg bg-amber-400 text-neutral-950 font-medium px-4 py-2 hover:bg-amber-300 transition text-sm">
                  Upload work
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
