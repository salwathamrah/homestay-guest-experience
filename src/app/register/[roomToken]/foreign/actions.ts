"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveRoomByQrToken } from "@/lib/rooms";
import { guestFilePath, uploadGuestFile } from "@/lib/storage";
import {
  sendForeignGuestAdminEmail,
  sendForeignGuestConfirmationEmail,
} from "@/lib/email";
import { generateCFormPdf } from "@/lib/c-form-pdf";

const PHONE_PATTERN = /^[+]?[0-9\s-]{7,20}$/;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);
const VISA_TYPES = new Set(["tourist", "business", "medical", "other"]);

export type RegisterForeignGuestState = {
  error: string | null;
};

type AdditionalGuestInput = {
  fullName: string;
  age: number;
  sex: string;
  address: string | null;
  passportNumber: string | null;
};

function validFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function parseAdditionalGuests(raw: string): AdditionalGuestInput[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw || "[]");
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;

  const guests: AdditionalGuestInput[] = [];
  for (const entry of parsed) {
    if (typeof entry !== "object" || entry === null) return null;
    const e = entry as Record<string, unknown>;
    const fullName = typeof e.fullName === "string" ? e.fullName.trim() : "";
    if (!fullName) continue;

    const age = Number(e.age);
    const sex = typeof e.sex === "string" ? e.sex.trim() : "";
    if (!Number.isInteger(age) || age <= 0 || age > 120 || !sex) return null;

    guests.push({
      fullName,
      age,
      sex,
      address: typeof e.address === "string" && e.address.trim() ? e.address.trim() : null,
      passportNumber:
        typeof e.passportNumber === "string" && e.passportNumber.trim()
          ? e.passportNumber.trim()
          : null,
    });
  }

  return guests;
}

export async function registerForeignGuest(
  roomToken: string,
  _prevState: RegisterForeignGuestState,
  formData: FormData,
): Promise<RegisterForeignGuestState> {
  const room = await getActiveRoomByQrToken(roomToken);
  if (!room) {
    return { error: "This registration link is no longer valid." };
  }

  const firstName = field(formData, "firstName");
  const lastName = field(formData, "lastName");
  const nationality = field(formData, "nationality");
  const countryOfOrigin = field(formData, "countryOfOrigin");
  const cellPhone = field(formData, "cellPhone");
  const email = field(formData, "email");
  const homeAddress = field(formData, "homeAddress");
  const purposeOfVisit = field(formData, "purposeOfVisit");
  const arrivalDate = field(formData, "arrivalDate");
  const arrivalTime = field(formData, "arrivalTime");
  const departureDate = field(formData, "departureDate");
  const departureTime = field(formData, "departureTime");
  const vehicleNumber = field(formData, "vehicleNumber") || null;

  const passportNumber = field(formData, "passportNumber");
  const passportExpiryDate = field(formData, "passportExpiryDate");
  const visaType = field(formData, "visaType");
  const visaNumber = field(formData, "visaNumber");
  const visaExpiryDate = field(formData, "visaExpiryDate");
  const portOfEntry = field(formData, "portOfEntry");
  const dateOfArrivalInIndia = field(formData, "dateOfArrivalInIndia");
  const froRegistrationNumber = field(formData, "froRegistrationNumber") || null;

  const agreedToHouseRules = formData.get("agreedToHouseRules") === "on";
  const passportFile = formData.get("passportFile");
  const visaFile = formData.get("visaFile");
  const additionalGuests = parseAdditionalGuests(
    field(formData, "additionalGuestsJson"),
  );

  if (!firstName || !lastName) return { error: "Please enter your full name." };
  if (!nationality) return { error: "Please enter your nationality." };
  if (!countryOfOrigin) return { error: "Please enter your country of origin." };
  if (!PHONE_PATTERN.test(cellPhone)) {
    return { error: "Please enter a valid cell phone number." };
  }
  if (!email.includes("@")) return { error: "Please enter a valid email address." };
  if (!homeAddress) return { error: "Please enter your home address." };
  if (!purposeOfVisit) return { error: "Please enter the purpose of your visit." };
  if (!arrivalDate || !arrivalTime || !departureDate || !departureTime) {
    return { error: "Please enter your arrival and departure date/time." };
  }
  if (departureDate < arrivalDate) {
    return { error: "Departure date cannot be before the arrival date." };
  }
  if (!passportNumber) return { error: "Please enter your passport number." };
  if (!passportExpiryDate) return { error: "Please enter your passport expiry date." };
  if (!VISA_TYPES.has(visaType)) return { error: "Please select a visa type." };
  if (!visaNumber) return { error: "Please enter your visa number." };
  if (!visaExpiryDate) return { error: "Please enter your visa expiry date." };
  if (!portOfEntry) return { error: "Please enter your port of entry into India." };
  if (!dateOfArrivalInIndia) {
    return { error: "Please enter your date of arrival in India." };
  }
  if (!agreedToHouseRules) {
    return { error: "Please agree to the house rules to continue." };
  }
  if (!validFile(passportFile)) {
    return { error: "Please upload the photo page of your passport." };
  }
  if (!validFile(visaFile)) {
    return { error: "Please upload your visa." };
  }
  for (const file of [passportFile, visaFile]) {
    if (file.size > MAX_FILE_BYTES) return { error: "Each file must be under 8MB." };
    if (!ALLOWED_FILE_TYPES.has(file.type)) {
      return { error: "Files must be a JPG, PNG, WEBP, or PDF." };
    }
  }
  if (additionalGuests === null) {
    return { error: "Please check the additional guest details and try again." };
  }

  const supabase = createAdminClient();
  const fullName = `${firstName} ${lastName}`;

  const { data: guest, error: insertError } = await supabase
    .from("guests")
    .insert({
      full_name: fullName,
      phone: cellPhone,
      email,
      nationality: "foreign",
      id_doc_type: "passport",
      id_doc_number: passportNumber,
      agreed_to_house_rules: true,
    })
    .select("id")
    .single();

  if (insertError || !guest) {
    return { error: "Something went wrong saving your details. Please try again." };
  }

  try {
    const { error: detailsError } = await supabase.from("foreign_guest_details").insert({
      guest_id: guest.id,
      room_id: room.id,
      first_name: firstName,
      last_name: lastName,
      nationality,
      country_of_origin: countryOfOrigin,
      home_address: homeAddress,
      purpose_of_visit: purposeOfVisit,
      arrival_date: arrivalDate,
      arrival_time: arrivalTime,
      departure_date: departureDate,
      departure_time: departureTime,
      vehicle_number: vehicleNumber,
      passport_expiry_date: passportExpiryDate,
      visa_type: visaType,
      visa_number: visaNumber,
      visa_expiry_date: visaExpiryDate,
      port_of_entry: portOfEntry,
      date_of_arrival_in_india: dateOfArrivalInIndia,
      fro_registration_number: froRegistrationNumber,
    });
    if (detailsError) throw new Error(detailsError.message);

    if (additionalGuests.length > 0) {
      const { error: guestsError } = await supabase.from("additional_guests").insert(
        additionalGuests.map((g) => ({
          guest_id: guest.id,
          full_name: g.fullName,
          age: g.age,
          sex: g.sex,
          address: g.address,
          id_document_number: g.passportNumber,
        })),
      );
      if (guestsError) throw new Error(guestsError.message);
    }

    const passportPath = guestFilePath(guest.id, "passport", passportFile.type);
    const visaPath = guestFilePath(guest.id, "visa", visaFile.type);

    await Promise.all([
      uploadGuestFile(passportPath, passportFile),
      uploadGuestFile(visaPath, visaFile),
    ]);

    const { error: docsError } = await supabase.from("guest_documents").upsert(
      [
        { guest_id: guest.id, doc_type: "passport", storage_path: passportPath },
        { guest_id: guest.id, doc_type: "visa", storage_path: visaPath },
      ],
      { onConflict: "guest_id,doc_type" },
    );
    if (docsError) throw new Error(docsError.message);
  } catch {
    return { error: "We couldn't save your documents. Please try again." };
  }

  const cFormPdf = await generateCFormPdf({
    fullName,
    nationality,
    countryOfOrigin,
    cellPhone,
    email,
    homeAddress,
    purposeOfVisit,
    arrivalDate,
    arrivalTime,
    departureDate,
    departureTime,
    vehicleNumber,
    passportNumber,
    passportExpiryDate,
    visaType,
    visaNumber,
    visaExpiryDate,
    portOfEntry,
    dateOfArrivalInIndia,
    froRegistrationNumber,
    roomLabel: room.label,
    additionalGuests: additionalGuests.map((g) => ({
      fullName: g.fullName,
      age: g.age,
      sex: g.sex,
      address: g.address,
      passportNumber: g.passportNumber,
    })),
  });

  const [passportBuffer, visaBuffer] = await Promise.all([
    passportFile.arrayBuffer(),
    visaFile.arrayBuffer(),
  ]);

  await Promise.allSettled([
    sendForeignGuestAdminEmail({
      fullName,
      nationality,
      cellPhone,
      email,
      passportNumber,
      visaNumber,
      roomLabel: room.label,
      attachments: [
        { filename: `passport-${passportFile.name}`, content: Buffer.from(passportBuffer) },
        { filename: `visa-${visaFile.name}`, content: Buffer.from(visaBuffer) },
        { filename: "c-form.pdf", content: cFormPdf },
      ],
    }),
    sendForeignGuestConfirmationEmail({ fullName, email }),
  ]);

  redirect(`/register/${roomToken}/plan?guest=${guest.id}&cform=1`);
}
