// Placeholder — plan selection (CP/EP/MAP/AP) and Razorpay payment land
// here in a later session. Registration already completed by this point.
export default async function PlanSelectionPage({
  searchParams,
}: {
  searchParams: Promise<{ guest?: string; cform?: string }>;
}) {
  const { guest, cform } = await searchParams;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-cream px-6 text-center">
      <h1 className="text-2xl font-semibold text-walnut">You&apos;re registered!</h1>
      <p className="max-w-md text-walnut/70">
        Thanks for registering with Highway Heaven. Plan selection and payment
        are coming next — we&apos;ll notify you once that&apos;s ready.
      </p>
      {cform === "1" && guest && (
        <a
          href={`/api/c-form/${guest}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl bg-saffron px-5 py-3 text-sm font-semibold text-white shadow-sm"
        >
          Download Your C-Form (PDF)
        </a>
      )}
      {guest && <p className="text-xs text-walnut/40">Reference: {guest}</p>}
    </div>
  );
}
