import PDFDocument from "pdfkit";

export type CFormAdditionalGuest = {
  fullName: string;
  age: number;
  sex: string;
  address: string | null;
  passportNumber: string | null;
};

export type CFormData = {
  fullName: string;
  nationality: string;
  countryOfOrigin: string;
  cellPhone: string;
  email: string;
  homeAddress: string;
  purposeOfVisit: string;
  arrivalDate: string;
  arrivalTime: string;
  departureDate: string;
  departureTime: string;
  vehicleNumber: string | null;
  passportNumber: string;
  passportExpiryDate: string;
  visaType: string;
  visaNumber: string;
  visaExpiryDate: string;
  portOfEntry: string;
  dateOfArrivalInIndia: string;
  froRegistrationNumber: string | null;
  roomLabel: string;
  additionalGuests: CFormAdditionalGuest[];
};

// Renders the foreigner registration (C-Form) as a printable A4 PDF.
// Used both as an email attachment at registration time and for the
// guest/owner download link, so it must be fully derivable from stored
// data (no values captured only in the request).
export function generateCFormPdf(data: CFormData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const section = (title: string) => {
      doc.moveDown(0.6);
      doc.fontSize(13).fillColor("#7c2d12").font("Helvetica-Bold").text(title);
      doc.moveDown(0.2);
    };

    const row = (label: string, value: string | null | undefined) => {
      doc
        .fontSize(10)
        .fillColor("#5b3a29")
        .font("Helvetica-Bold")
        .text(`${label}: `, { continued: true })
        .font("Helvetica")
        .fillColor("#111")
        .text(value && value.length > 0 ? value : "-");
    };

    doc
      .fontSize(20)
      .fillColor("#7c2d12")
      .font("Helvetica-Bold")
      .text("Highway Heaven", { align: "center" });
    doc
      .fontSize(12)
      .fillColor("#5b3a29")
      .font("Helvetica")
      .text("Foreigner Registration Form (C-Form)", { align: "center" });
    doc
      .fontSize(9)
      .fillColor("#888")
      .text(`Generated: ${new Date().toISOString()}`, { align: "center" });

    section("Guest Details");
    row("Full Name", data.fullName);
    row("Nationality", data.nationality);
    row("Country of Origin", data.countryOfOrigin);
    row("Cell Phone", data.cellPhone);
    row("Email", data.email);
    row("Home Address", data.homeAddress);
    row("Purpose of Visit", data.purposeOfVisit);
    row("Room", data.roomLabel);

    section("Stay Dates");
    row("Date of Arrival", data.arrivalDate);
    row("Time of Arrival", data.arrivalTime);
    row("Date of Departure", data.departureDate);
    row("Time of Departure", data.departureTime);
    row("Vehicle Number", data.vehicleNumber);

    section("Passport & Visa (C-Form)");
    row("Passport Number", data.passportNumber);
    row("Passport Expiry Date", data.passportExpiryDate);
    row("Visa Type", data.visaType);
    row("Visa Number", data.visaNumber);
    row("Visa Expiry Date", data.visaExpiryDate);
    row("Port of Entry into India", data.portOfEntry);
    row("Date of Arrival in India", data.dateOfArrivalInIndia);
    row("FRO Registration Number", data.froRegistrationNumber);

    if (data.additionalGuests.length > 0) {
      section("Additional Guests");
      data.additionalGuests.forEach((guest, index) => {
        doc
          .fontSize(10)
          .fillColor("#111")
          .font("Helvetica-Bold")
          .text(
            `${index + 1}. ${guest.fullName} — Age ${guest.age}, ${guest.sex}`,
          );
        doc
          .fontSize(9)
          .fillColor("#555")
          .font("Helvetica")
          .text(
            `   ${guest.address ?? "-"}${guest.passportNumber ? ` — Passport: ${guest.passportNumber}` : ""}`,
          );
      });
    }

    doc.moveDown(1);
    doc
      .fontSize(8)
      .fillColor("#888")
      .text(
        "To be submitted to the local police station within 24 hours of guest arrival, as required under the Foreigners Act / Registration of Foreigners Rules.",
        { align: "center" },
      );

    doc.end();
  });
}
