import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAdminApprovalEmail, sendAdminChangesRequestedEmail } from "@/lib/email";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: callerProfile } = await supabase
    .from("profiles").select("role, client_id, full_name, email").eq("id", user.id).single();
  if (callerProfile?.role !== "client") {
    return NextResponse.json({ error: "Clients only" }, { status: 403 });
  }

  const { workItemId, versionId, decision, remarks } = await request.json();

  if (!workItemId || !versionId || !decision) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (decision === "changes_requested" && !remarks?.trim()) {
    return NextResponse.json({ error: "Remarks are required to request changes" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Confirm this work item actually belongs to this client (defense in depth — RLS also enforces this)
  const { data: workItem } = await admin
    .from("work_items")
    .select("id, title, client_id, current_version, clients(company_name), projects(name)")
    .eq("id", workItemId)
    .single();

  if (!workItem || workItem.client_id !== callerProfile.client_id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Insert the review (insert-only audit trail — never edited afterward)
  const { error: reviewError } = await admin.from("reviews").insert({
    work_item_id: workItemId,
    work_version_id: versionId,
    reviewed_by: user.id,
    decision,
    remarks: remarks || null,
  });
  if (reviewError) return NextResponse.json({ error: reviewError.message }, { status: 500 });

  // Update the work item's overall status
  await admin.from("work_items").update({ status: decision }).eq("id", workItemId);

  if (decision === "approved") {
    // Mark approved_at — a scheduled job (see /api/cleanup) deletes the file
    // 2 days after this timestamp. We do NOT delete it immediately.
    await admin.from("work_versions").update({ approved_at: new Date().toISOString() }).eq("id", versionId);
  }
  // Note: on "changes_requested", the file is intentionally left alone.
  // It gets deleted automatically the moment the admin uploads the next version
  // (that logic lives in /api/upload, which deletes the previous version's file).

  // Email the admin
  const clientName = (workItem.clients as any)?.company_name ?? "Client";
  const projectName = (workItem.projects as any)?.name ?? "";
  const adminEmail = process.env.ADMIN_EMAIL!;
  const workLink = `${process.env.NEXT_PUBLIC_SITE_URL}/admin/work/${workItemId}`;

  try {
    if (decision === "approved") {
      await sendAdminApprovalEmail({
        adminEmail,
        clientName,
        projectName,
        workTitle: workItem.title,
        version: workItem.current_version,
        approvedBy: callerProfile.full_name || callerProfile.email,
        remarks,
        workLink,
      });
    } else {
      await sendAdminChangesRequestedEmail({
        adminEmail,
        clientName,
        projectName,
        workTitle: workItem.title,
        version: workItem.current_version,
        requestedBy: callerProfile.full_name || callerProfile.email,
        remarks,
        workLink,
      });
    }
    await admin.from("notifications").insert({
      recipient_email: adminEmail,
      type: decision === "approved" ? "approval" : "changes_requested",
      work_item_id: workItemId,
      status: "sent",
    });
  } catch (e: any) {
    await admin.from("notifications").insert({
      recipient_email: adminEmail,
      type: decision === "approved" ? "approval" : "changes_requested",
      work_item_id: workItemId,
      status: "failed",
      error: e.message,
    });
  }

  return NextResponse.json({ success: true });
}
