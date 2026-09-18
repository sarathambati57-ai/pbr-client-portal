import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ReviseForm from "./ReviseForm";

export default async function AdminWorkDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: workItem } = await supabase
    .from("work_items")
    .select(`
      id, title, work_type, description, status, current_version,
      clients(id, company_name), projects(name),
      work_versions(id, version_number, file_path, file_deleted, uploaded_at),
      reviews(id, decision, remarks, created_at)
    `)
    .eq("id", id)
    .single();

  if (!workItem) notFound();

  const currentVersion = (workItem.work_versions as any[])
    .sort((a, b) => b.version_number - a.version_number)[0];

  let fileUrl: string | null = null;
  if (currentVersion && !currentVersion.file_deleted && currentVersion.file_path) {
    const { data } = await supabase.storage
      .from("work-files").createSignedUrl(currentVersion.file_path, 60 * 60);
    fileUrl = data?.signedUrl ?? null;
  }

  const statusLabel: Record<string, string> = {
    draft: "Draft", pending_review: "Pending Review", approved: "Approved", changes_requested: "Changes Requested",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <p className="text-amber-400 text-sm font-medium uppercase tracking-wide">
          {(workItem.clients as any)?.company_name} · {(workItem.projects as any)?.name}
        </p>
        <h1 className="text-xl font-semibold mt-1">
          {workItem.title} — Version {currentVersion?.version_number}
        </h1>
        <p className="text-neutral-400 text-sm mt-1">{statusLabel[workItem.status]}</p>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        {fileUrl ? (
          workItem.work_type === "reel" || workItem.work_type === "video" ? (
            <video src={fileUrl} controls className="w-full rounded-lg max-h-[480px]" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fileUrl} alt={workItem.title} className="w-full rounded-lg max-h-[480px] object-contain" />
          )
        ) : (
          <p className="text-neutral-500 text-sm">File no longer on server — send from your device if needed.</p>
        )}
      </div>

      {workItem.reviews?.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-neutral-300">Client feedback</h2>
          {(workItem.reviews as any[]).map((r) => (
            <div key={r.id} className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-sm">
              <p className={r.decision === "approved" ? "text-green-400" : "text-red-400"}>
                {r.decision === "approved" ? "Approved" : "Changes requested"} · {new Date(r.created_at).toLocaleString()}
              </p>
              {r.remarks && <p className="text-neutral-300 mt-1">{r.remarks}</p>}
            </div>
          ))}
        </div>
      )}

      {workItem.status === "changes_requested" && (
        <ReviseForm workItemId={workItem.id} title={workItem.title} />
      )}
    </div>
  );
}
