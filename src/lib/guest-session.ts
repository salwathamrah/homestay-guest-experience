import { createAdminClient } from "@/lib/supabase/admin";
import { endOfDayUTC } from "@/lib/dates";
import { generateSessionToken, hashToken } from "@/lib/tokens";

const MAX_TOKEN_GENERATION_ATTEMPTS = 5;
const UNIQUE_VIOLATION = "23505";

export type GuestSession = {
  id: string;
  guestId: string;
  bookingId: string;
  expiresAt: string;
  isActive: boolean;
};

// Creates a guest_sessions row for a guest's booking and returns the raw
// token. The token is shown/sent to the guest exactly once — only its hash
// is stored. expires_at is derived from the booking's check_out date.
export async function createGuestSession(
  guestId: string,
  bookingId: string,
): Promise<string> {
  const supabase = createAdminClient();

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("check_out")
    .eq("id", bookingId)
    .single();

  if (bookingError || !booking) {
    throw new Error(`Booking not found: ${bookingId}`);
  }

  const expiresAt = endOfDayUTC(booking.check_out);

  for (let attempt = 0; attempt < MAX_TOKEN_GENERATION_ATTEMPTS; attempt++) {
    const token = generateSessionToken();

    const { error } = await supabase.from("guest_sessions").insert({
      guest_id: guestId,
      booking_id: bookingId,
      token_hash: hashToken(token),
      expires_at: expiresAt,
    });

    if (!error) return token;
    if (error.code !== UNIQUE_VIOLATION) throw new Error(error.message);
  }

  throw new Error("Could not generate a unique session token");
}

export async function getSessionByToken(
  token: string,
): Promise<GuestSession | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("guest_sessions")
    .select("id, guest_id, booking_id, expires_at, is_active")
    .eq("token_hash", hashToken(token))
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    guestId: data.guest_id,
    bookingId: data.booking_id,
    expiresAt: data.expires_at,
    isActive: data.is_active,
  };
}

// True only if the token exists, hasn't expired, and hasn't been manually
// disabled. This is the single check that gates access to /stay/[token].
export async function isSessionActive(token: string): Promise<boolean> {
  const session = await getSessionByToken(token);
  if (!session || !session.isActive) return false;

  return new Date(session.expiresAt).getTime() > Date.now();
}
