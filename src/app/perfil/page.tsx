import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/queries";
import { BottomNav } from "@/components/bottom-nav";
import { PerfilForm } from "@/components/perfil-form";

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getProfile(supabase, user.id);
  if (!profile || !profile.onboarding_completo) redirect("/onboarding");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-8">
      <h1 className="mb-5 text-xl font-bold">Perfil</h1>
      <PerfilForm profile={profile} email={user.email ?? ""} />
      <BottomNav />
    </main>
  );
}
