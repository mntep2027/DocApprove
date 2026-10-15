import { Resend } from "resend";

let client: Resend | null | undefined;

// undefined = not checked yet, null = no API key configured (dev fallback)
export function getResendClient(): Resend | null {
  if (client === undefined) {
    const apiKey = process.env.RESEND_API_KEY;
    client = apiKey ? new Resend(apiKey) : null;
  }
  return client;
}
