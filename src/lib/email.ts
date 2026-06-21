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
