import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// This runs automatically every day (see vercel.json for the schedule).
// It finds files whose version was approved 2+ days ago and are still
// sitting on the server, deletes the actual file from storage, and marks
// the database row so the UI shows "file no longer available" instead of
// a broken video player. The text record (title, version, approval date,
// remarks) is never touched — only the file itself is removed.

export async function GET(request: Request) {
  // Simple protection so random people on the internet can't trigger this
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const { data: versionsToClean } = await admin
    .from("work_versions")
    .select("id, file_path")
    .eq("file_deleted", false)
    .not("approved_at", "is", null)
    .lte("approved_at", twoDaysAgo.toISOString());

  if (!versionsToClean || versionsToClean.length === 0) {
    return NextResponse.json({ deleted: 0 });
  }

  const paths = versionsToClean.map((v) => v.file_path).filter(Boolean) as string[];
  if (paths.length > 0) {
    await admin.storage.from("work-files").remove(paths);
  }

  await admin
    .from("work_versions")
    .update({ file_deleted: true, file_deleted_at: new Date().toISOString() })
    .in("id", versionsToClean.map((v) => v.id));

  return NextResponse.json({ deleted: versionsToClean.length });
}
