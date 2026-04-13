import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user has completed onboarding
  const { data: profile } = await supabase
    .from("users")
    .select("academic_stage")
    .eq("supabase_auth_id", user.id)
    .single();

  if (!profile?.academic_stage) {
    redirect("/onboarding");
  }

  redirect("/home");
}
