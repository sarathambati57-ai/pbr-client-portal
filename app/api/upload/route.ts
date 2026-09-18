import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendClientNewWorkEmail } from "@/lib/email";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: callerProfile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (callerProfile?.role !== "admin") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const formData = await request.formData();
  const clientId = formData.get("clientId") as string;
  let projectId = formData.get("projectId") as string;
  const newProjectName = formData.get("newProjectName") as string;
  const title = formData.get("title") as string;
  const workType = formData.get("workType") as string;
  const description = formData.get("description") as string;
  const dueDate = formData.get("dueDate") as string;
  const file = formData.get("file") as File;
  const existingWorkItemId = formData.get("workItemId") as string | null; // set when uploading a revised version

  if ((!clientId && !existingWorkItemId) || !title || !workType || !file) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const admin = createAdminClient();

  // === REVISED VERSION UPLOAD (an existing work item that had changes requested) ===
  if (existingWorkItemId) {
    const { data: existingItem } = await admin
      .from("work_items").select("id, current_version, client_id").eq("id", existingWorkItemId).single();
    if (!existingItem) return NextResponse.json({ error: "Work item not found" }, { status: 404 });

    // Delete the previous (rejected) file from storage before uploading the new one
    const { data: prevVersion } = await admin
      .from("work_versions")
      .select("id, file_path")
      .eq("work_item_id", existingWorkItemId)
      .eq("version_number", existingItem.current_version)
      .single();

    if (prevVersion?.file_path) {
      await admin.storage.from("work-files").remove([prevVersion.file_path]);
      await admin.from("work_versions").update({
        file_deleted: true, file_deleted_at: new Date().toISOString(),
      }).eq("id", prevVersion.id);
    }

    const newVersionNumber = existingItem.current_version + 1;
    const fileExt = file.name.split(".").pop();
    const filePath = `${existingItem.client_id}/${existingWorkItemId}/v${newVersionNumber}-${Date.now()}.${fileExt}`;
    const fileBuffer = await file.arrayBuffer();

    const { error: uploadError } = await admin.storage
      .from("work-files").upload(filePath, fileBuffer, { contentType: file.type });
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

    await admin.from("work_versions").insert({
      work_item_id: existingWorkItemId,
      version_number: newVersionNumber,
      file_path: filePath,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
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
      } catch { /* logged via notifications table in production; kept minimal here */ }
    }

    return NextResponse.json({ success: true, workItemId: existingWorkItemId });
  }

  // Create the project if a new one was typed instead of selected
  if (!projectId && newProjectName) {
    const { data: newProject, error: projectError } = await admin
      .from("projects")
      .insert({ client_id: clientId, name: newProjectName })
      .select()
      .single();
    if (projectError) return NextResponse.json({ error: projectError.message }, { status: 500 });
    projectId = newProject.id;
  }

  // Create the work item
  const { data: workItem, error: workItemError } = await admin
    .from("work_items")
    .insert({
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
    if (workItemError.message.includes("duplicate") || workItemError.message.includes("unique")) {
      return NextResponse.json({ error: "A work item with this title already exists in this project. Please use a different title." }, { status: 409 });
    }
    return NextResponse.json({ error: workItemError.message }, { status: 500 });
  }

  // Upload the file to storage
  const fileExt = file.name.split(".").pop();
  const filePath = `${clientId}/${workItem.id}/v1-${Date.now()}.${fileExt}`;
  const fileBuffer = await file.arrayBuffer();

  const { error: uploadError } = await admin.storage
    .from("work-files")
    .upload(filePath, fileBuffer, { contentType: file.type });

  if (uploadError) {
    await admin.from("work_items").delete().eq("id", workItem.id);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Record the version
  const { error: versionError } = await admin.from("work_versions").insert({
    work_item_id: workItem.id,
    version_number: 1,
    file_path: filePath,
    file_name: file.name,
    file_type: file.type,
    file_size: file.size,
  });

  if (versionError) return NextResponse.json({ error: versionError.message }, { status: 500 });

  // Notify the client by email (only if they have an email on file —
  // phone-only clients won't get this until SMS/WhatsApp notifications exist)
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
