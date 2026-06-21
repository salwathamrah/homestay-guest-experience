export default function InvalidStayPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold">This link isn&apos;t working</h1>
      <p className="max-w-md text-zinc-600">
        Your stay link has expired, been deactivated, or doesn&apos;t exist.
        Please contact the property and we&apos;ll get you a new one.
      </p>
    </div>
  );
}
