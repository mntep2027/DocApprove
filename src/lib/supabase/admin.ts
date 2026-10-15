import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

// Bypasses RLS with the service-role key — only for server-side code that
// legitimately needs to read across org boundaries (e.g. resolving email
// notification recipients in another org). Never import this from
// client-side code or expose SUPABASE_SERVICE_ROLE_KEY as NEXT_PUBLIC_*.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
