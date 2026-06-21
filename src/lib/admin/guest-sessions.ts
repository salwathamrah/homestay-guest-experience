import { createAdminClient } from "@/lib/supabase/admin";
import { endOfDayUTC } from "@/lib/dates";

// These use the service-role client and bypass RLS — only call them after
// verifying the caller is an authenticated admin (see admin_users / is_admin()).

// Extends (or shortens) a booking's checkout date and keeps its guest
// session(s) in sync so access doesn't expire before the new checkout.
export async function extendCheckout(
  bookingId: string,
  newCheckoutDate: string,
): Promise<void> {
  const supabase = createAdminClient();

  const { error: bookingError } = await supabase
    .from("bookings")
    .update({ check_out: newCheckoutDate })
    .eq("id", bookingId);

  if (bookingError) throw new Error(bookingError.message);

  const { error: sessionError } = await supabase
    .from("guest_sessions")
    .update({ expires_at: endOfDayUTC(newCheckoutDate) })
    .eq("booking_id", bookingId);

  if (sessionError) throw new Error(sessionError.message);
}

// Manually revoke or reinstate a specific session, independent of expiry.
export async function setSessionActive(
  sessionId: string,
  isActive: boolean,
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("guest_sessions")
    .update({ is_active: isActive })
    .eq("id", sessionId);

  if (error) throw new Error(error.message);
}
