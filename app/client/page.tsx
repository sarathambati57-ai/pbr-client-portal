import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function ClientDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles").select("client_id").eq("id", user!.id).single();

  const { data: workItems } = await supabase
    .from("work_items")
    .select("id, title, work_type, status, created_at, projects(name)")
    .eq("client_id", profile!.client_id)
    .order("created_at", { ascending: false });

  const statusLabel: Record<string, string> = {
    draft: "Draft", pending_review: "Pending Review", approved: "Approved", changes_requested: "Changes Requested",
  };
  const statusColor: Record<string, string> = {
    draft: "text-neutral-400", pending_review: "text-amber-400", approved: "text-green-400", changes_requested: "text-red-400",
  };

  const pendingCount = workItems?.filter((w) => w.status === "pending_review").length ?? 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold">Welcome back</h1>

      {pendingCount > 0 && (
        <div className="bg-amber-400/10 border border-amber-400/30 text-amber-300 rounded-xl px-5 py-3 text-sm">
          You have {pendingCount} item{pendingCount > 1 ? "s" : ""} waiting for your review.
        </div>
      )}

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl divide-y divide-neutral-800">
        {workItems?.length ? (
          workItems.map((item: any) => (
            <Link
              key={item.id}
              href={`/client/work/${item.id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-neutral-800/50 transition"
            >
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-neutral-400">{item.projects?.name} · {item.work_type}</p>
              </div>
              <span className={`text-sm font-medium ${statusColor[item.status]}`}>
                {statusLabel[item.status]}
              </span>
            </Link>
          ))
        ) : (
          <p className="px-5 py-8 text-center text-neutral-500">No work uploaded yet.</p>
        )}
      </div>
    </div>
  );
}
