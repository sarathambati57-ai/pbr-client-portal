import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ReviewPanel from "./ReviewPanel";

export default async function WorkReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: workItem } = await supabase
    .from("work_items")
    .select(`
      id, title, work_type, description, status, current_version, due_date,
      clients(company_name),
      projects(name),
      work_versions(id, version_number, file_path, file_name, file_type, file_deleted, uploaded_at),
      reviews(id, decision, remarks, created_at, reviewed_by),
      comments(id, body, created_at, author_id, profiles(full_name, role))
    `)
    .eq("id", id)
    .single();

  if (!workItem) notFound();

  // Get a temporary signed URL for the current version's file, if it still exists
  const currentVersion = (workItem.work_versions as any[])
    .sort((a, b) => b.version_number - a.version_number)[0];

  let fileUrl: string | null = null;
  if (currentVersion && !currentVersion.file_deleted && currentVersion.file_path) {
    const { data } = await supabase.storage
      .from("work-files")
      .createSignedUrl(currentVersion.file_path, 60 * 60); // 1 hour link
    fileUrl = data?.signedUrl ?? null;
  }

  return (
    <ReviewPanel
      workItem={workItem as any}
      currentVersion={currentVersion}
      fileUrl={fileUrl}
    />
  );
}
