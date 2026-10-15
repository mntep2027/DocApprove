const BRAND_DARK = "#c92873";
const FOREGROUND = "#181617";
const SURFACE = "#f2f4f7";
const SURFACE_BORDER = "#e4e7ec";
const MUTED = "#6b7280";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function baseLayout(title: string, bodyHtml: string): string {
  return `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:${SURFACE};font-family:Arial,Helvetica,sans-serif;color:${FOREGROUND};">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid ${SURFACE_BORDER};border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:20px 24px;border-bottom:1px solid ${SURFACE_BORDER};font-size:16px;font-weight:bold;">
                Doc<span style="color:${BRAND_DARK};">Approve</span>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <h1 style="margin:0 0 12px;font-size:18px;">${escapeHtml(title)}</h1>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px;border-top:1px solid ${SURFACE_BORDER};font-size:12px;color:${MUTED};">
                You're receiving this because of activity on a document in DocApprove.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function ctaButton(url: string, label: string): string {
  return `<a href="${url}" style="display:inline-block;margin-top:16px;padding:10px 20px;background:${BRAND_DARK};color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:bold;">${escapeHtml(label)}</a>`;
}

export function newApprovalEmail({
  documentTitle,
  fromOrgName,
  url,
}: {
  documentTitle: string;
  fromOrgName: string;
  url: string;
}): { subject: string; html: string } {
  const subject = `New document for your approval: ${documentTitle}`;
  const body = `
    <p style="margin:0 0 8px;font-size:14px;line-height:1.5;">
      <strong>${escapeHtml(fromOrgName)}</strong> sent <strong>${escapeHtml(documentTitle)}</strong> to your organization for approval.
    </p>
    ${ctaButton(url, "Review document")}
  `;
  return { subject, html: baseLayout("New approval needed", body) };
}

const STATUS_LABELS: Record<string, string> = {
  approved: "approved",
  rejected: "rejected",
  on_hold: "put on hold",
};

export function statusChangeEmail({
  documentTitle,
  status,
  actorName,
  comment,
  url,
}: {
  documentTitle: string;
  status: "approved" | "rejected" | "on_hold";
  actorName: string;
  comment?: string | null;
  url: string;
}): { subject: string; html: string } {
  const statusLabel = STATUS_LABELS[status] ?? status;
  const subject = `${documentTitle} was ${statusLabel}`;
  const body = `
    <p style="margin:0 0 8px;font-size:14px;line-height:1.5;">
      <strong>${escapeHtml(actorName)}</strong> ${escapeHtml(statusLabel)} <strong>${escapeHtml(documentTitle)}</strong>.
    </p>
    ${comment ? `<p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:${MUTED};">"${escapeHtml(comment)}"</p>` : ""}
    ${ctaButton(url, "View document")}
  `;
  return { subject, html: baseLayout("Status update", body) };
}
