import { redirect } from "next/navigation";
import Link from "next/link";
import { getActiveRoomByQrToken } from "@/lib/rooms";

export const metadata = {
  title: "Guest Registration — Highway Heaven",
};

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ roomToken: string }>;
}) {
  const { roomToken } = await params;
  const room = await getActiveRoomByQrToken(roomToken);

  if (!room) {
    redirect("/stay/invalid");
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-cream px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="font-serif text-2xl font-bold text-walnut">Welcome to Highway Heaven</h1>
          <p className="mt-2 text-sm text-walnut/60">
            {room.label} — please select your guest type to begin
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href={`/register/${roomToken}/indian`}
            className="flex w-full items-center justify-between rounded-2xl border-2 border-saffron/30 bg-white p-6 shadow-sm transition hover:border-saffron hover:shadow-md"
          >
            <div>
              <p className="text-lg font-semibold text-walnut">Indian Guest</p>
              <p className="mt-0.5 text-sm text-walnut/60">Register with Aadhaar card</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-saffron/10 text-sm font-bold text-saffron-dark">
              IN
            </div>
          </Link>

          <Link
            href={`/register/${roomToken}/foreign`}
            className="flex w-full items-center justify-between rounded-2xl border-2 border-walnut/15 bg-white p-6 shadow-sm transition hover:border-walnut/30 hover:shadow-md"
          >
            <div>
              <p className="text-lg font-semibold text-walnut">Foreign Guest</p>
              <p className="mt-0.5 text-sm text-walnut/60">Register with passport &amp; visa</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-walnut/10 text-xs font-bold text-walnut/60">
              INTL
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
