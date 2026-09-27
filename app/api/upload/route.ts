import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendClientNewWorkEmail } from "@/lib/email";

// IMPORTANT: this endpoint no longer receives the actual video/image file.
// The browser uploads the file directly to Supabase Storage first (bypassing
// our server entirely, since Vercel's free plan caps request bodies at
// ~4.5MB — far too small for real video files). This endpoint only receives
// small text metadata (title, description, the storage path the file was
// already uploaded to, etc.) and writes the matching database rows.

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: callerProfile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (callerProfile?.role !== "admin") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const body = await request.json();
  const {
    clientId, projectId: incomingProjectId, newProjectName, title, workType,
    description, dueDate, filePath, fileName, fileType, fileSize,
    workItemId, existingWorkItemId,
  } = body;

  const admin = createAdminClient();
  let projectId = incomingProjectId;

  // === REVISED VERSION (an existing work item that had changes requested) ===
  if (existingWorkItemId) {
    const { data: existingItem } = await admin
      .from("work_items").select("id, current_version, client_id").eq("id", existingWorkItemId).single();
    if (!existingItem) return NextResponse.json({ error: "Work item not found" }, { status: 404 });

    // The browser already deleted the old file from storage and uploaded the
    // new one before calling this — we just record what happened.
    const { data: prevVersion } = await admin
      .from("work_versions")
      .select("id")
      .eq("work_item_id", existingWorkItemId)
      .eq("version_number", existingItem.current_version)
      .single();

    if (prevVersion) {
      await admin.from("work_versions").update({
        file_deleted: true, file_deleted_at: new Date().toISOString(),
      }).eq("id", prevVersion.id);
    }

    const newVersionNumber = existingItem.current_version + 1;

    await admin.from("work_versions").insert({
      work_item_id: existingWorkItemId,
      version_number: newVersionNumber,
      file_path: filePath,
      file_name: fileName,
      file_type: fileType,
      file_size: fileSize,
    });

    await admin.from("work_items").update({
      current_version: newVersionNumber, status: "pending_review",
    }).eq("id", existingWorkItemId);

    const { data: client } = await admin.from("clients").select("company_name, email").eq("id", existingItem.client_id).single();
    if (client?.email) {
      try {
        await sendClientNewWorkEmail({
          to: client.email, clientName: client.company_name, workTitle: title,
          workLink: `${process.env.NEXT_PUBLIC_SITE_URL}/client/work/${existingWorkItemId}`,
        });
      } catch { /* failure is non-fatal here; notifications table covers the primary upload path */ }
    }

    return NextResponse.json({ success: true, workItemId: existingWorkItemId });
  }

  // === NEW WORK ITEM ===
  if (!clientId || !title || !workType || !filePath || !workItemId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!projectId && newProjectName) {
    const { data: newProject, error: projectError } = await admin
      .from("projects")
      .insert({ client_id: clientId, name: newProjectName })
      .select()
      .single();
    if (projectError) return NextResponse.json({ error: projectError.message }, { status: 500 });
    projectId = newProject.id;
  }

  // The file was already uploaded to storage at `filePath` by the browser
  // using this exact workItemId (generated client-side) — we now create the
  // matching database rows using that same id.
  const { data: workItem, error: workItemError } = await admin
    .from("work_items")
    .insert({
      id: workItemId,
      project_id: projectId,
      client_id: clientId,
      title,
      work_type: workType,
      description: description || null,
      due_date: dueDate || null,
      status: "pending_review",
      current_version: 1,
    })
    .select()
    .single();

  if (workItemError) {
    // Clean up the orphaned file since the DB row failed
    await admin.storage.from("work-files").remove([filePath]);
    if (workItemError.message.includes("duplicate") || workItemError.message.includes("unique")) {
      return NextResponse.json({ error: "A work item with this title already exists in this project. Please use a different title." }, { status: 409 });
    }
    return NextResponse.json({ error: workItemError.message }, { status: 500 });
  }

  const { error: versionError } = await admin.from("work_versions").insert({
    work_item_id: workItem.id,
    version_number: 1,
    file_path: filePath,
    file_name: fileName,
    file_type: fileType,
    file_size: fileSize,
  });

  if (versionError) return NextResponse.json({ error: versionError.message }, { status: 500 });

  const { data: client } = await admin.from("clients").select("company_name, email").eq("id", clientId).single();
  if (client?.email) {
    try {
      await sendClientNewWorkEmail({
        to: client.email,
        clientName: client.company_name,
        workTitle: title,
        workLink: `${process.env.NEXT_PUBLIC_SITE_URL}/client/work/${workItem.id}`,
      });
      await admin.from("notifications").insert({
        recipient_email: client.email, type: "new_work", work_item_id: workItem.id, status: "sent",
      });
    } catch (e: any) {
      await admin.from("notifications").insert({
        recipient_email: client.email, type: "new_work", work_item_id: workItem.id, status: "failed", error: e.message,
      });
    }
  }

  return NextResponse.json({ success: true, workItem });
}
