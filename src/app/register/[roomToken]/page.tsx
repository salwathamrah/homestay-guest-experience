import { redirect } from "next/navigation";
import { getActiveRoomByQrToken } from "@/lib/rooms";
import { RegistrationForm } from "./registration-form";

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
    <div className="flex flex-1 bg-cream">
      <RegistrationForm roomToken={roomToken} roomLabel={room.label} />
    </div>
  );
}
