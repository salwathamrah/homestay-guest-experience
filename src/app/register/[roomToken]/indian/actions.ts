"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveRoomByQrToken } from "@/lib/rooms";
import { extensionForFileType, uploadGuestFile } from "@/lib/storage";
import { createGuestSession } from "@/lib/guest-session";
import {
  sendIndianGuestBookingSummaryEmail,
  sendGuestStayTokenEmail,
} from "@/lib/email";

const AADHAAR = /^\d{12}$/;
const MOBILE = /^[6-9]\d{9}$/;
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);
const VALID_PLANS = new Set(["CP", "EP", "MAP", "AP"]);
const VALID_PAYMENTS = new Set(["online", "cash", "credit_card"]);

export type RegisterIndianGuestState = {
  error: string | null;
  success?: {
    token: string;
    guestName: string;
    roomType: string;
    checkinDate: string;
    paymentMode: string;
    phone: string;
  };
};

type AddlEntry = {
  fullName: string;
  age: string;
  sex: string;
  address: string;
  aadhaarNumber: string;
  phone: string;
  email: string;
};

type ValidAddl = {
  fullName: string;
  age: number;
  sex: string;
  address: string | null;
  aadhaarNumber: string;
  phone: string | null;
  email: string | null;
  frontFile: File;
  backFile: File;
};

function f(fd: FormData, name: string): string {
  return String(fd.get(name) ?? "").trim();
}

function isFile(v: FormDataEntryValue | null): v is File {
  return v instanceof File && v.size > 0;
}

function fileOk(file: File): boolean {
  return file.size <= MAX_BYTES && ALLOWED_TYPES.has(file.type);
}

function parseAddlEntries(raw: string): AddlEntry[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw || "[]");
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;

  const result: AddlEntry[] = [];
  for (const item of parsed) {
    if (typeof item !== "object" || !item) return null;
    const e = item as Record<string, unknown>;
    result.push({
      fullName: typeof e.fullName === "string" ? e.fullName.trim() : "",
      age: typeof e.age === "string" ? e.age : "",
      sex: typeof e.sex === "string" ? e.sex.trim() : "",
      address: typeof e.address === "string" ? e.address.trim() : "",
      aadhaarNumber:
        typeof e.aadhaarNumber === "string" ? e.aadhaarNumber.trim() : "",
      phone: typeof e.phone === "string" ? e.phone.trim() : "",
      email: typeof e.email === "string" ? e.email.trim() : "",
    });
  }
  return result;
}

export async function registerIndianGuest(
  roomToken: string,
  _prev: RegisterIndianGuestState,
  formData: FormData,
): Promise<RegisterIndianGuestState> {
  try {
    // ── Room validation ───────────────────────────────────────────────────────
    console.log("[register] start — roomToken:", roomToken);
    const room = await getActiveRoomByQrToken(roomToken);
    if (!room) {
      return { error: "This registration link is no longer valid." };
    }
    console.log("[register] room ok:", room.id, room.label);

    // ── Collect fields ────────────────────────────────────────────────────────
    const fullName = f(formData, "fullName");
    const address = f(formData, "address");
    const city = f(formData, "city");
    const country = f(formData, "country");
    const phone = f(formData, "phone");
    const ageRaw = f(formData, "age");
    const gender = f(formData, "gender");
    const aadhaarNumber = f(formData, "aadhaarNumber");
    const purposeOfVisit = f(formData, "purposeOfVisit");
    const email = f(formData, "email") || null;
    const selectedPlan = f(formData, "selectedPlan");
    const paymentMode = f(formData, "paymentMode");
    const checkinDate = f(formData, "checkinDate");
    const checkinTime = f(formData, "checkinTime");
    const checkoutDate = f(formData, "checkoutDate");
    const agreedToHouseRules = formData.get("agreedToHouseRules") === "on";
    const aadhaarFront = formData.get("aadhaarFront");
    const aadhaarBack = formData.get("aadhaarBack");

    console.log("[register] fields collected —", {
      fullName,
      phone,
      ageRaw,
      gender,
      aadhaarNumber,
      selectedPlan,
      paymentMode,
      checkinDate,
      checkoutDate,
      agreedToHouseRules,
      aadhaarFrontSize: aadhaarFront instanceof File ? aadhaarFront.size : null,
      aadhaarBackSize: aadhaarBack instanceof File ? aadhaarBack.size : null,
    });

    // ── Validate ──────────────────────────────────────────────────────────────
    if (!fullName) return { error: "Please enter your full name." };
    if (!address) return { error: "Please enter your address." };
    if (!city) return { error: "Please enter your city." };
    if (!country) return { error: "Please enter your country." };
    if (!MOBILE.test(phone)) {
      return { error: "Please enter a valid 10-digit Indian mobile number." };
    }
    const age = Number(ageRaw);
    if (!ageRaw || !Number.isInteger(age) || age < 1 || age > 120) {
      return { error: "Please enter a valid age." };
    }
    if (!gender) {
      return { error: "Please select your gender." };
    }
    if (!AADHAAR.test(aadhaarNumber)) {
      return { error: "Aadhaar number must be exactly 12 digits." };
    }
    if (!purposeOfVisit) {
      return { error: "Please enter your purpose of visit." };
    }
    if (!VALID_PLANS.has(selectedPlan)) {
      return { error: "Please select a valid room plan." };
    }
    if (!checkinDate) return { error: "Please select your arrival date." };
    if (!checkinTime) return { error: "Please select your arrival time." };
    if (!checkoutDate) return { error: "Please select your departure date." };
    if (checkoutDate <= checkinDate) {
      return { error: "Departure date must be after arrival date." };
    }
    if (!agreedToHouseRules) {
      return { error: "Please agree to the house rules to continue." };
    }
    if (!VALID_PAYMENTS.has(paymentMode)) {
      return { error: "Please select a payment method." };
    }
    if (!isFile(aadhaarFront)) {
      return { error: "Please upload the front of your Aadhaar card." };
    }
    if (!isFile(aadhaarBack)) {
      return { error: "Please upload the back of your Aadhaar card." };
    }
    if (!fileOk(aadhaarFront)) {
      return { error: "Aadhaar front must be a JPG, PNG, WEBP, or PDF under 8 MB." };
    }
    if (!fileOk(aadhaarBack)) {
      return { error: "Aadhaar back must be a JPG, PNG, WEBP, or PDF under 8 MB." };
    }

    console.log("[register] validation passed");

    // ── Parse additional services ─────────────────────────────────────────────
    let additionalServices: string[] = [];
    try {
      const parsed = JSON.parse(f(formData, "servicesJson") || "[]");
      if (Array.isArray(parsed)) {
        additionalServices = parsed.filter((s) => typeof s === "string");
      }
    } catch {
      // optional — ignore parse failure
    }
    console.log("[register] additionalServices:", additionalServices);

    // ── Parse & validate additional guests ────────────────────────────────────
    const addlEntries = parseAddlEntries(f(formData, "additionalGuestsJson"));
    if (addlEntries === null) {
      return { error: "Please check the additional guest details." };
    }

    const validAddl: ValidAddl[] = [];
    for (let i = 0; i < addlEntries.length; i++) {
      const e = addlEntries[i];
      if (!e.fullName) continue;

      const addlAge = Number(e.age);
      if (!Number.isInteger(addlAge) || addlAge < 1 || addlAge > 120) {
        return { error: `Please enter a valid age for guest ${i + 2}.` };
      }
      if (!e.sex) {
        return { error: `Please select a sex for guest ${i + 2}.` };
      }
      if (!AADHAAR.test(e.aadhaarNumber)) {
        return {
          error: `Aadhaar number for guest ${i + 2} must be exactly 12 digits.`,
        };
      }

      const front = formData.get(`addlFront_${i}`);
      const back = formData.get(`addlBack_${i}`);
      if (!isFile(front)) {
        return { error: `Please upload the Aadhaar front for guest ${i + 2}.` };
      }
      if (!isFile(back)) {
        return { error: `Please upload the Aadhaar back for guest ${i + 2}.` };
      }
      if (!fileOk(front) || !fileOk(back)) {
        return {
          error: `Aadhaar files for guest ${i + 2} must be JPG, PNG, WEBP, or PDF under 8 MB.`,
        };
      }

      validAddl.push({
        fullName: e.fullName,
        age: addlAge,
        sex: e.sex,
        address: e.address || null,
        aadhaarNumber: e.aadhaarNumber,
        phone: e.phone || null,
        email: e.email || null,
        frontFile: front,
        backFile: back,
      });
    }
    console.log("[register] additional guests validated:", validAddl.length);

    const supabase = createAdminClient();

    // ── Insert primary guest ──────────────────────────────────────────────────
    console.log("[register] inserting guest row...");
    const guestPayload = {
      full_name: fullName,
      phone,
      email,
      nationality: "indian",
      id_doc_type: "aadhaar",
      id_doc_number: aadhaarNumber,
      agreed_to_house_rules: true,
      address,
      city,
      country,
      age,
      gender,
      purpose_of_visit: purposeOfVisit,
      checkin_date: checkinDate,
      checkin_time: checkinTime,
      checkout_date: checkoutDate,
      room_type: selectedPlan,
      payment_mode: paymentMode,
      additional_services: additionalServices,
    };
    console.log("[register] guest payload:", guestPayload);

    const { data: guest, error: guestErr } = await supabase
      .from("guests")
      .insert(guestPayload)
      .select("id")
      .single();

    if (guestErr || !guest) {
      console.error("[register] guest insert failed:", guestErr);
      return {
        error: "Something went wrong saving your details. Please try again.",
      };
    }
    console.log("[register] guest inserted:", guest.id);

    // ── Upload primary guest Aadhaar ──────────────────────────────────────────
    console.log("[register] uploading Aadhaar documents...");
    const frontExt = extensionForFileType(aadhaarFront.type) ?? "bin";
    const backExt = extensionForFileType(aadhaarBack.type) ?? "bin";
    const frontPath = `${guest.id}/aadhaar-front.${frontExt}`;
    const backPath = `${guest.id}/aadhaar-back.${backExt}`;

    await Promise.all([
      uploadGuestFile(frontPath, aadhaarFront),
      uploadGuestFile(backPath, aadhaarBack),
    ]);
    console.log("[register] documents uploaded:", frontPath, backPath);

    const { error: updateErr } = await supabase
      .from("guests")
      .update({ id_doc_url: frontPath, id_doc_back_url: backPath })
      .eq("id", guest.id);
    if (updateErr) throw new Error(`guests update failed: ${updateErr.message}`);

    // ── Insert additional guests ──────────────────────────────────────────────
    for (let i = 0; i < validAddl.length; i++) {
      const g = validAddl[i];
      console.log(`[register] inserting additional guest ${i + 1}:`, g.fullName);

      const { data: addlRow, error: addlErr } = await supabase
        .from("additional_guests")
        .insert({
          guest_id: guest.id,
          full_name: g.fullName,
          age: g.age,
          sex: g.sex,
          address: g.address,
          id_document_number: g.aadhaarNumber,
          phone: g.phone,
          email: g.email,
        })
        .select("id")
        .single();

      if (addlErr || !addlRow) {
        throw new Error(
          `additional_guests insert failed: ${addlErr?.message ?? "no row returned"}`,
        );
      }

      const aFrontExt = extensionForFileType(g.frontFile.type) ?? "bin";
      const aBackExt = extensionForFileType(g.backFile.type) ?? "bin";
      const aFrontPath = `${guest.id}/additional/${addlRow.id}/front.${aFrontExt}`;
      const aBackPath = `${guest.id}/additional/${addlRow.id}/back.${aBackExt}`;

      await Promise.all([
        uploadGuestFile(aFrontPath, g.frontFile),
        uploadGuestFile(aBackPath, g.backFile),
      ]);

      const { error: addlUpdateErr } = await supabase
        .from("additional_guests")
        .update({ id_doc_front_url: aFrontPath, id_doc_back_url: aBackPath })
        .eq("id", addlRow.id);
      if (addlUpdateErr) {
        throw new Error(
          `additional_guests update failed: ${addlUpdateErr.message}`,
        );
      }
      console.log(`[register] additional guest ${i + 1} done:`, addlRow.id);
    }

    // ── Create booking ────────────────────────────────────────────────────────
    console.log("[register] inserting booking...");
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .insert({
        guest_id: guest.id,
        room_id: room.id,
        plan: selectedPlan,
        check_in: checkinDate,
        check_out: checkoutDate,
        num_guests: validAddl.length + 1,
        total_amount: 0,
        payment_status: "pending",
      })
      .select("id")
      .single();

    if (bookingErr || !booking) {
      throw new Error(
        `bookings insert failed: ${bookingErr?.message ?? "no row returned"}`,
      );
    }
    console.log("[register] booking inserted:", booking.id);

    // ── Create guest session ──────────────────────────────────────────────────
    console.log("[register] creating guest session...");
    const token = await createGuestSession(guest.id, booking.id);
    console.log("[register] session created, token:", token);

    // ── Emails (fire-and-forget) ──────────────────────────────────────────────
    console.log("[register] sending emails (best-effort)...");
    const siteBase =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
    const stayUrl = `${siteBase}/stay/${token}`;

    try {
      const [frontBuffer, backBuffer] = await Promise.all([
        aadhaarFront.arrayBuffer(),
        aadhaarBack.arrayBuffer(),
      ]);

      await Promise.allSettled([
        sendIndianGuestBookingSummaryEmail({
          fullName,
          phone,
          email: email ?? "",
          aadhaarNumber,
          address,
          city,
          country,
          purposeOfVisit,
          roomLabel: room.label,
          roomType: selectedPlan,
          checkinDate,
          checkoutDate,
          paymentMode,
          additionalServices,
          numGuests: validAddl.length + 1,
          stayUrl,
          attachments: [
            {
              filename: `aadhaar-front-${aadhaarFront.name}`,
              content: Buffer.from(frontBuffer),
            },
            {
              filename: `aadhaar-back-${aadhaarBack.name}`,
              content: Buffer.from(backBuffer),
            },
          ],
        }),
        ...(email
          ? [
              sendGuestStayTokenEmail({
                fullName,
                email,
                token,
                roomLabel: room.label,
                checkinDate,
                stayUrl,
              }),
            ]
          : []),
        ...validAddl
          .filter((g) => g.email)
          .map((g) =>
            sendGuestStayTokenEmail({
              fullName: g.fullName,
              email: g.email!,
              token,
              roomLabel: room.label,
              checkinDate,
              stayUrl,
            }),
          ),
      ]);
      console.log("[register] emails dispatched");
    } catch (emailErr) {
      console.error("[register] email error (ignored):", emailErr);
    }

    // ── Done ──────────────────────────────────────────────────────────────────
    console.log("[register] registration complete for guest:", guest.id);
    return {
      error: null,
      success: {
        token,
        guestName: fullName,
        roomType: selectedPlan,
        checkinDate,
        paymentMode,
        phone,
      },
    };
  } catch (err) {
    console.error("[register] UNHANDLED ERROR:", err);
    return {
      error:
        "Something went wrong completing your registration. Please try again.",
    };
  }
}
