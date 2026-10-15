import { getResendClient } from "@/lib/email/client";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<void> {
  const resend = getResendClient();
  const from = process.env.EMAIL_FROM || "notifications@docapprove.app";

  if (!resend) {
    console.log(`[email:dev] would send "${subject}" to ${[to].flat().join(", ")}`);
    return;
  }

  try {
    const { error } = await resend.emails.send({ from, to, subject, html });
    if (error) {
      console.error("[email] send failed:", error);
    }
  } catch (err) {
    console.error("[email] send threw:", err);
  }
}
