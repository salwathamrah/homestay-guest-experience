import { redirect } from "next/navigation";
import { getActiveRoomByQrToken } from "@/lib/rooms";
import { createClient } from "@/lib/supabase/server";
import { IndianRegistrationForm } from "./registration-form";

export const metadata = {
  title: "Guest Registration — Highway Heaven",
};

type Plan = { code: string; name: string; description: string };

export default async function IndianRegisterPage({
  params,
}: {
  params: Promise<{ roomToken: string }>;
}) {
  const { roomToken } = await params;
  const room = await getActiveRoomByQrToken(roomToken);

  if (!room) {
    redirect("/stay/invalid");
  }

  const supabase = await createClient();
  const [{ data: plansData }, { data: settingsRow }] = await Promise.all([
    supabase
      .from("plans")
      .select("code, name, description")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase.from("settings").select("whatsapp_number").maybeSingle(),
  ]);

  const plans: Plan[] = plansData ?? [];
  const whatsappNumber = settingsRow?.whatsapp_number ?? "8082091213";

  return (
    <div className="flex flex-1 bg-cream">
      <IndianRegistrationForm
        roomToken={roomToken}
        roomLabel={room.label}
        plans={plans}
        whatsappNumber={whatsappNumber}
      />
    </div>
  );
}
