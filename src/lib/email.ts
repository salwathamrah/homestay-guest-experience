import { Resend } from "resend";

const ADMIN_EMAIL =
  process.env.ADMIN_NOTIFICATION_EMAIL ?? "jkhighwayheaven@gmail.com";
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "Highway Heaven <onboarding@resend.dev>";

function getResend(): Resend {
  return new Resend(process.env.RESEND_API_KEY!);
}

// Minimal escaping for guest-supplied strings interpolated into email HTML.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type EmailAttachment = { filename: string; content: Buffer };

export async function sendAdminRegistrationEmail(details: {
  fullName: string;
  phone: string;
  email: string;
  aadhaarNumber: string;
  roomLabel: string;
  attachments: EmailAttachment[];
}): Promise<void> {
  const resend = getResend();

  await resend.emails.send({
    from: FROM_EMAIL,
    to: ADMIN_EMAIL,
    subject: `New guest registration — ${details.fullName} (${details.roomLabel})`,
    html: `
      <h2>New Guest Registration</h2>
      <p><strong>Room:</strong> ${escapeHtml(details.roomLabel)}</p>
      <p><strong>Name:</strong> ${escapeHtml(details.fullName)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(details.phone)}</p>
      <p><strong>Email:</strong> ${escapeHtml(details.email)}</p>
      <p><strong>Aadhaar Number:</strong> ${escapeHtml(details.aadhaarNumber)}</p>
      <p>Aadhaar copy and guest photo are attached.</p>
    `,
    attachments: details.attachments,
  });
}

export async function sendGuestConfirmationEmail(details: {
  fullName: string;
  email: string;
}): Promise<void> {
  const resend = getResend();

  await resend.emails.send({
    from: FROM_EMAIL,
    to: details.email,
    subject: "Welcome to Highway Heaven — Registration Received",
    html: `
      <h2>Namaste ${escapeHtml(details.fullName)},</h2>
      <p>Thank you for registering with Highway Heaven. We've received your details and look forward to hosting you.</p>
      <p>Next, please continue to select your stay plan to complete your booking.</p>
    `,
  });
}

export async function sendForeignGuestAdminEmail(details: {
  fullName: string;
  nationality: string;
  cellPhone: string;
  email: string;
  passportNumber: string;
  visaNumber: string;
  roomLabel: string;
  attachments: EmailAttachment[];
}): Promise<void> {
  const resend = getResend();

  await resend.emails.send({
    from: FROM_EMAIL,
    to: ADMIN_EMAIL,
    subject: `New foreign guest registration — ${details.fullName} (${details.roomLabel})`,
    html: `
      <h2>New Foreign Guest Registration</h2>
      <p><strong>Room:</strong> ${escapeHtml(details.roomLabel)}</p>
      <p><strong>Name:</strong> ${escapeHtml(details.fullName)}</p>
      <p><strong>Nationality:</strong> ${escapeHtml(details.nationality)}</p>
      <p><strong>Cell Phone:</strong> ${escapeHtml(details.cellPhone)}</p>
      <p><strong>Email:</strong> ${escapeHtml(details.email)}</p>
      <p><strong>Passport Number:</strong> ${escapeHtml(details.passportNumber)}</p>
      <p><strong>Visa Number:</strong> ${escapeHtml(details.visaNumber)}</p>
      <p>Passport copy, visa copy, and the completed C-Form PDF are attached. Please submit the C-Form to the local police station within 24 hours.</p>
    `,
    attachments: details.attachments,
  });
}

export async function sendForeignGuestConfirmationEmail(details: {
  fullName: string;
  email: string;
}): Promise<void> {
  const resend = getResend();

  await resend.emails.send({
    from: FROM_EMAIL,
    to: details.email,
    subject: "Welcome to Highway Heaven — Registration Received",
    html: `
      <h2>Dear ${escapeHtml(details.fullName)},</h2>
      <p>Thank you for registering with Highway Heaven. We've received your passport, visa, and C-Form details and look forward to hosting you.</p>
      <p>Next, please continue to select your stay plan to complete your booking.</p>
    `,
  });
}

export async function sendIndianGuestBookingSummaryEmail(details: {
  fullName: string;
  phone: string;
  email: string;
  aadhaarNumber: string;
  address: string;
  city: string;
  country: string;
  purposeOfVisit: string;
  roomLabel: string;
  roomType: string;
  checkinDate: string;
  checkoutDate: string;
  paymentMode: string;
  additionalServices: string[];
  numGuests: number;
  stayUrl: string;
  attachments: EmailAttachment[];
}): Promise<void> {
  const resend = getResend();

  const paymentDisplay: Record<string, string> = {
    online: "Online (Razorpay)",
    cash: "Cash at property",
    credit_card: "Card at property",
  };
  const pm = paymentDisplay[details.paymentMode] ?? details.paymentMode;

  const svcHtml =
    details.additionalServices.length > 0
      ? `<ul>${details.additionalServices.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>`
      : "<p>None</p>";

  await resend.emails.send({
    from: FROM_EMAIL,
    to: ADMIN_EMAIL,
    subject: `New booking — ${escapeHtml(details.fullName)} (${escapeHtml(details.roomLabel)})`,
    html: `
      <h2>New Indian Guest Booking</h2>
      <h3>Guest Details</h3>
      <p><strong>Room:</strong> ${escapeHtml(details.roomLabel)}</p>
      <p><strong>Name:</strong> ${escapeHtml(details.fullName)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(details.phone)}</p>
      <p><strong>Email:</strong> ${escapeHtml(details.email || "—")}</p>
      <p><strong>Aadhaar:</strong> ${escapeHtml(details.aadhaarNumber)}</p>
      <p><strong>Address:</strong> ${escapeHtml(details.address)}, ${escapeHtml(details.city)}, ${escapeHtml(details.country)}</p>
      <p><strong>Purpose of visit:</strong> ${escapeHtml(details.purposeOfVisit)}</p>
      <p><strong>Total guests:</strong> ${details.numGuests}</p>
      <h3>Stay Details</h3>
      <p><strong>Room plan:</strong> ${escapeHtml(details.roomType)}</p>
      <p><strong>Arrival:</strong> ${escapeHtml(details.checkinDate)}</p>
      <p><strong>Departure:</strong> ${escapeHtml(details.checkoutDate)}</p>
      <p><strong>Payment:</strong> ${escapeHtml(pm)}</p>
      <h3>Service Requests</h3>
      ${svcHtml}
      <h3>Stay Dashboard</h3>
      <p><a href="${escapeHtml(details.stayUrl)}">${escapeHtml(details.stayUrl)}</a></p>
      <p>Aadhaar front and back scans are attached.</p>
    `,
    attachments: details.attachments,
  });
}

export async function sendGuestStayTokenEmail(details: {
  fullName: string;
  email: string;
  token: string;
  roomLabel: string;
  checkinDate: string;
  stayUrl: string;
}): Promise<void> {
  const resend = getResend();

  await resend.emails.send({
    from: FROM_EMAIL,
    to: details.email,
    subject: "Your stay is confirmed — Highway Heaven",
    html: `
      <h2>Namaste ${escapeHtml(details.fullName)},</h2>
      <p>Your registration at Highway Heaven is complete. We look forward to hosting you!</p>
      <p><strong>Room:</strong> ${escapeHtml(details.roomLabel)}</p>
      <p><strong>Arrival:</strong> ${escapeHtml(details.checkinDate)}</p>
      <p>Access your stay dashboard using the link below:</p>
      <p>
        <a href="${escapeHtml(details.stayUrl)}"
           style="background:#c27615;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;">
          Go to Stay Dashboard
        </a>
      </p>
      <p style="color:#888;font-size:13px;">Your access code: <strong>${escapeHtml(details.token)}</strong></p>
    `,
  });
}
