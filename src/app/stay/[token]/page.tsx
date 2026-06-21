// Placeholder — the proxy guard already verified this token is active.
// The real guest dashboard (food ordering, local contacts, requests) lands
// here in a later session.
export default async function StayPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
      <h1 className="text-2xl font-semibold">Welcome to Highway Heaven</h1>
      <p className="text-zinc-600">Session token: {token}</p>
    </div>
  );
}
