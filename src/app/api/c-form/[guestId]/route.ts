import { NextResponse } from "next/server";
import { getCFormDataByGuestId } from "@/lib/foreign-guests";
import { generateCFormPdf } from "@/lib/c-form-pdf";

// Regenerates the C-Form PDF from stored registration data, so the
// download link works any time after registration (not just at submit).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ guestId: string }> },
) {
  const { guestId } = await params;
  const data = await getCFormDataByGuestId(guestId);

  if (!data) {
    return NextResponse.json({ error: "C-Form not found" }, { status: 404 });
  }

  const pdf = await generateCFormPdf(data);

  return new NextResponse(new Blob([Uint8Array.from(pdf)]), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="c-form-${guestId}.pdf"`,
    },
  });
}
