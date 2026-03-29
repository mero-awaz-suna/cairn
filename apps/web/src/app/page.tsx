import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LandingPage from "@/components/landing/LandingPage";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Check if user has completed onboarding (consented = completed)
    const { data: profile } = await supabase
      .from("users")
      .select("consented_to_terms_at")
      .eq("supabase_auth_id", user.id)
      .single();

    if (!profile || !profile.consented_to_terms_at) {
      redirect("/onboarding");
    }

    redirect("/home");
  }

  // Not authenticated — show landing page
  return <LandingPage />;
}
