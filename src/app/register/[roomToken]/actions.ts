"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveRoomByQrToken } from "@/lib/rooms";
import { extensionForFileType, guestFilePath, uploadGuestFile } from "@/lib/storage";
import { sendAdminRegistrationEmail, sendGuestConfirmationEmail } from "@/lib/email";

const AADHAAR_PATTERN = /^\d{12}$/;
const INDIAN_MOBILE_PATTERN = /^[6-9]\d{9}$/;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export type RegisterGuestState = {
  error: string | null;
};

type AdditionalGuestEntry = {
  fullName: string;
  age: string;
  sex: string;
  address: string;
  aadhaarNumber: string;
};

type ValidatedAdditionalGuest = {
  fullName: string;
  age: number;
  sex: string;
  address: string | null;
  aadhaarNumber: string;
  frontFile: File;
  backFile: File;
};

function validFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}

function validFileTypeAndSize(file: File): boolean {
  return file.size <= MAX_FILE_BYTES && ALLOWED_FILE_TYPES.has(file.type);
}

// Raw shape only — does not validate field contents, so indices stay
// aligned with the additionalGuestFront_<i>/additionalGuestBack_<i> file
// inputs even if a row is left blank.
function parseAdditionalGuestEntries(raw: string): AdditionalGuestEntry[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw || "[]");
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;

  const entries: AdditionalGuestEntry[] = [];
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) return null;
    const e = item as Record<string, unknown>;
    entries.push({
      fullName: typeof e.fullName === "string" ? e.fullName.trim() : "",
      age: typeof e.age === "string" ? e.age : "",
      sex: typeof e.sex === "string" ? e.sex.trim() : "",
      address: typeof e.address === "string" ? e.address.trim() : "",
      aadhaarNumber: typeof e.aadhaarNumber === "string" ? e.aadhaarNumber.trim() : "",
    });
  }
  return entries;
}

export async function registerGuest(
  roomToken: string,
  _prevState: RegisterGuestState,
  formData: FormData,
): Promise<RegisterGuestState> {
  const room = await getActiveRoomByQrToken(roomToken);
  if (!room) {
    return { error: "This registration link is no longer valid." };
  }

  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const aadhaarNumber = String(formData.get("aadhaarNumber") ?? "").trim();
  const agreedToHouseRules = formData.get("agreedToHouseRules") === "on";
  const aadhaarFile = formData.get("aadhaarFile");
  const photoFile = formData.get("photoFile");

  if (!fullName) return { error: "Please enter your full name." };
  if (!INDIAN_MOBILE_PATTERN.test(phone)) {
    return { error: "Please enter a valid 10-digit Indian mobile number." };
  }
  if (!email.includes("@")) return { error: "Please enter a valid email address." };
  if (!AADHAAR_PATTERN.test(aadhaarNumber)) {
    return { error: "Aadhaar number must be exactly 12 digits." };
  }
  if (!agreedToHouseRules) {
    return { error: "Please agree to the house rules to continue." };
  }
  if (!validFile(aadhaarFile)) {
    return { error: "Please upload a photo of your Aadhaar card." };
  }
  if (!validFile(photoFile)) {
    return { error: "Please upload your photo." };
  }
  for (const file of [aadhaarFile, photoFile]) {
    if (!validFileTypeAndSize(file)) {
      return { error: "Each file must be a JPG, PNG, WEBP, or PDF under 8MB." };
    }
  }

  const additionalGuestEntries = parseAdditionalGuestEntries(
    String(formData.get("additionalGuestsJson") ?? ""),
  );
  if (additionalGuestEntries === null) {
    return { error: "Please check the additional guest details and try again." };
  }

  // Validate every non-blank additional guest row up front, before any DB
  // writes — a single bad row should fail the whole submission cleanly.
  const validatedAdditionalGuests: ValidatedAdditionalGuest[] = [];
  for (let i = 0; i < additionalGuestEntries.length; i++) {
    const entry = additionalGuestEntries[i];
    if (!entry.fullName) continue;

    const age = Number(entry.age);
    if (!Number.isInteger(age) || age <= 0 || age > 120) {
      return { error: `Please enter a valid age for guest ${i + 1}.` };
    }
    if (!entry.sex) return { error: `Please select a sex for guest ${i + 1}.` };
    if (!AADHAAR_PATTERN.test(entry.aadhaarNumber)) {
      return { error: `Aadhaar number for guest ${i + 1} must be exactly 12 digits.` };
    }

    const frontFile = formData.get(`additionalGuestFront_${i}`);
    const backFile = formData.get(`additionalGuestBack_${i}`);
    if (!validFile(frontFile)) {
      return { error: `Please upload the front of the Aadhaar card for guest ${i + 1}.` };
    }
    if (!validFile(backFile)) {
      return { error: `Please upload the back of the Aadhaar card for guest ${i + 1}.` };
    }
    if (!validFileTypeAndSize(frontFile) || !validFileTypeAndSize(backFile)) {
      return { error: `Aadhaar files for guest ${i + 1} must be a JPG, PNG, WEBP, or PDF under 8MB.` };
    }

    validatedAdditionalGuests.push({
      fullName: entry.fullName,
      age,
      sex: entry.sex,
      address: entry.address || null,
      aadhaarNumber: entry.aadhaarNumber,
      frontFile,
      backFile,
    });
  }

  const supabase = createAdminClient();

  const { data: guest, error: insertError } = await supabase
    .from("guests")
    .insert({
      full_name: fullName,
      phone,
      email,
      nationality: "indian",
      id_doc_type: "aadhaar",
      id_doc_number: aadhaarNumber,
      agreed_to_house_rules: true,
    })
    .select("id")
    .single();

  if (insertError || !guest) {
    return { error: "Something went wrong saving your details. Please try again." };
  }

  try {
    const aadhaarPath = guestFilePath(guest.id, "aadhaar", aadhaarFile.type);
    const photoPath = guestFilePath(guest.id, "photo", photoFile.type);

    await Promise.all([
      uploadGuestFile(aadhaarPath, aadhaarFile),
      uploadGuestFile(photoPath, photoFile),
    ]);

    const { error: updateError } = await supabase
      .from("guests")
      .update({ id_doc_url: aadhaarPath, photo_url: photoPath })
      .eq("id", guest.id);

    if (updateError) throw new Error(updateError.message);

    for (const additionalGuest of validatedAdditionalGuests) {
      const { data: addlRow, error: addlError } = await supabase
        .from("additional_guests")
        .insert({
          guest_id: guest.id,
          full_name: additionalGuest.fullName,
          age: additionalGuest.age,
          sex: additionalGuest.sex,
          address: additionalGuest.address,
          id_document_number: additionalGuest.aadhaarNumber,
        })
        .select("id")
        .single();

      if (addlError || !addlRow) throw new Error(addlError?.message ?? "Insert failed");

      const frontExt = extensionForFileType(additionalGuest.frontFile.type) ?? "bin";
      const backExt = extensionForFileType(additionalGuest.backFile.type) ?? "bin";
      const frontPath = `${guest.id}/additional/${addlRow.id}/front.${frontExt}`;
      const backPath = `${guest.id}/additional/${addlRow.id}/back.${backExt}`;

      await Promise.all([
        uploadGuestFile(frontPath, additionalGuest.frontFile),
        uploadGuestFile(backPath, additionalGuest.backFile),
      ]);

      const { error: addlUpdateError } = await supabase
        .from("additional_guests")
        .update({ id_doc_front_url: frontPath, id_doc_back_url: backPath })
        .eq("id", addlRow.id);

      if (addlUpdateError) throw new Error(addlUpdateError.message);
    }
  } catch {
    return { error: "We couldn't upload your documents. Please try again." };
  }

  const [aadhaarBuffer, photoBuffer] = await Promise.all([
    aadhaarFile.arrayBuffer(),
    photoFile.arrayBuffer(),
  ]);

  await Promise.allSettled([
    sendAdminRegistrationEmail({
      fullName,
      phone,
      email,
      aadhaarNumber,
      roomLabel: room.label,
      attachments: [
        { filename: `aadhaar-${aadhaarFile.name}`, content: Buffer.from(aadhaarBuffer) },
        { filename: `photo-${photoFile.name}`, content: Buffer.from(photoBuffer) },
      ],
    }),
    sendGuestConfirmationEmail({ fullName, email }),
  ]);

  redirect(`/register/${roomToken}/plan?guest=${guest.id}`);
}
