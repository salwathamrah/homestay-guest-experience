import { createAdminClient } from "@/lib/supabase/admin";

export type ActiveRoom = {
  id: string;
  label: string;
};

// True only if the QR token corresponds to a room that exists and hasn't
// been deactivated by the owner. This is the gate for the registration flow,
// the same way isSessionActive() gates /stay/[token] post-payment.
export async function getActiveRoomByQrToken(
  qrToken: string,
): Promise<ActiveRoom | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("rooms")
    .select("id, label, is_active")
    .eq("qr_token", qrToken)
    .single();

  if (error || !data || !data.is_active) return null;

  return { id: data.id, label: data.label };
}
