import { createAdminClient } from "@/lib/supabase/admin";
import type { CFormData } from "@/lib/c-form-pdf";

// Reassembles everything the C-Form PDF needs from storage, so the PDF
// can be regenerated on demand (download link) without re-sending the
// original form payload.
export async function getCFormDataByGuestId(
  guestId: string,
): Promise<CFormData | null> {
  const supabase = createAdminClient();

  const { data: guest, error: guestError } = await supabase
    .from("guests")
    .select("full_name, phone, email, id_doc_number")
    .eq("id", guestId)
    .single();

  if (guestError || !guest) return null;

  const { data: details, error: detailsError } = await supabase
    .from("foreign_guest_details")
    .select(
      "nationality, country_of_origin, home_address, purpose_of_visit, arrival_date, arrival_time, departure_date, departure_time, vehicle_number, passport_expiry_date, visa_type, visa_number, visa_expiry_date, port_of_entry, date_of_arrival_in_india, fro_registration_number, room_id, rooms(label)",
    )
    .eq("guest_id", guestId)
    .single();

  if (detailsError || !details) return null;

  const { data: additionalGuests } = await supabase
    .from("additional_guests")
    .select("full_name, age, sex, address, id_document_number")
    .eq("guest_id", guestId);

  const room = details.rooms as unknown as { label: string } | null;

  return {
    fullName: guest.full_name,
    nationality: details.nationality,
    countryOfOrigin: details.country_of_origin,
    cellPhone: guest.phone ?? "",
    email: guest.email ?? "",
    homeAddress: details.home_address,
    purposeOfVisit: details.purpose_of_visit,
    arrivalDate: details.arrival_date,
    arrivalTime: details.arrival_time.slice(0, 5),
    departureDate: details.departure_date,
    departureTime: details.departure_time.slice(0, 5),
    vehicleNumber: details.vehicle_number,
    passportNumber: guest.id_doc_number,
    passportExpiryDate: details.passport_expiry_date,
    visaType: details.visa_type,
    visaNumber: details.visa_number,
    visaExpiryDate: details.visa_expiry_date,
    portOfEntry: details.port_of_entry,
    dateOfArrivalInIndia: details.date_of_arrival_in_india,
    froRegistrationNumber: details.fro_registration_number,
    roomLabel: room?.label ?? "-",
    additionalGuests: (additionalGuests ?? []).map((g) => ({
      fullName: g.full_name,
      age: g.age,
      sex: g.sex,
      address: g.address,
      passportNumber: g.id_document_number,
    })),
  };
}
