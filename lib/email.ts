import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Using Resend's shared test address for now — it can only deliver to the
// email address you signed up to Resend with. Once you verify your own
// domain in Resend, change this to something like:
// "PBR Digital Services <notifications@yourdomain.com>"
const FROM = "PBR Client Portal <onboarding@resend.dev>";

// Resend's SDK does NOT throw an error when a send fails — it returns
// { data, error } instead. If we don't check `error` ourselves, a failed
// send looks identical to a successful one. This helper checks it for us
// and throws, so the calling code's try/catch and notifications log
// actually reflect what really happened.
function throwIfFailed(result: { data: any; error: any }) {
  if (result.error) {
    throw new Error(result.error.message || JSON.stringify(result.error));
  }
  return result;
}

export async function sendClientNewWorkEmail(opts: {
  to: string;
  clientName: string;
  workTitle: string;
  workLink: string;
}) {
  const result = await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `New work uploaded — ${opts.workTitle}`,
    html: `
      <p>Hello ${opts.clientName},</p>
      <p>New work has been uploaded for your review:</p>
      <p><strong>${opts.workTitle}</strong></p>
      <p><a href="${opts.workLink}">Click here to review and respond</a></p>
      <p>— PBR Digital Services</p>
    `,
  });
  return throwIfFailed(result);
}

export async function sendAdminApprovalEmail(opts: {
  adminEmail: string;
  clientName: string;
  projectName: string;
  workTitle: string;
  version: number;
  approvedBy: string;
  remarks?: string;
  workLink: string;
}) {
  const result = await resend.emails.send({
    from: FROM,
    to: opts.adminEmail,
    subject: `Client Approved Your Work — ${opts.clientName} — ${opts.workTitle}`,
    html: `
      <p>Hello,</p>
      <p>Your client has approved the following work.</p>
      <ul>
        <li><strong>Client:</strong> ${opts.clientName}</li>
        <li><strong>Project:</strong> ${opts.projectName}</li>
        <li><strong>Work:</strong> ${opts.workTitle}</li>
        <li><strong>Version:</strong> ${opts.version}</li>
        <li><strong>Status:</strong> Approved</li>
        <li><strong>Approved by:</strong> ${opts.approvedBy}</li>
        <li><strong>Approved on:</strong> ${new Date().toLocaleString()}</li>
      </ul>
      ${opts.remarks ? `<p><strong>Client remarks:</strong><br/>${opts.remarks}</p>` : ""}
      <p><a href="${opts.workLink}">View work in dashboard</a></p>
    `,
  });
  return throwIfFailed(result);
}

export async function sendAdminChangesRequestedEmail(opts: {
  adminEmail: string;
  clientName: string;
  projectName: string;
  workTitle: string;
  version: number;
  requestedBy: string;
  remarks: string;
  workLink: string;
}) {
  const result = await resend.emails.send({
    from: FROM,
    to: opts.adminEmail,
    subject: `Changes Requested — ${opts.clientName} — ${opts.workTitle}`,
    html: `
      <p>Hello,</p>
      <p>Your client has requested changes to the following work.</p>
      <ul>
        <li><strong>Client:</strong> ${opts.clientName}</li>
        <li><strong>Project:</strong> ${opts.projectName}</li>
        <li><strong>Work:</strong> ${opts.workTitle}</li>
        <li><strong>Version:</strong> ${opts.version}</li>
        <li><strong>Status:</strong> Changes Requested</li>
        <li><strong>Requested by:</strong> ${opts.requestedBy}</li>
        <li><strong>Date and time:</strong> ${new Date().toLocaleString()}</li>
      </ul>
      <p><strong>Client remarks:</strong><br/>${opts.remarks}</p>
      <p><a href="${opts.workLink}">View work in dashboard</a></p>
    `,
  });
  return throwIfFailed(result);
}
