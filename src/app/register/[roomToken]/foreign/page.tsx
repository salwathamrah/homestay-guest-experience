import { redirect } from "next/navigation";
import { getActiveRoomByQrToken } from "@/lib/rooms";
import { ForeignRegistrationForm } from "./registration-form";

export const metadata = {
  title: "Foreign Guest Registration — Highway Heaven",
};

export default async function ForeignRegisterPage({
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
      <ForeignRegistrationForm roomToken={roomToken} roomLabel={room.label} />
    </div>
  );
}
