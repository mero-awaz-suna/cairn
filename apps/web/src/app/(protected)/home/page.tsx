import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/bottom-nav";
import { HomeClient } from "./client";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("supabase_auth_id", user.id)
    .single();

  if (!profile) redirect("/onboarding");

  // Fetch recent journal entries
  const { data: entries } = await supabase
    .from("journal_entries")
    .select("id, assigned_persona, recognition_message, stress_level, created_at, input_type, transcription_ms, ai_processing_ms")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(3);

  // Community activity — entries in last 24 hours across all users
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: communityActive } = await supabase
    .from("journal_entries")
    .select("*", { count: "exact", head: true })
    .gte("created_at", oneDayAgo);

  // Total users
  const { count: totalUsers } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("is_suspended", false);

  const displayName = user.user_metadata?.full_name?.split(" ")[0] || "there";

  return (
    <div className="min-h-screen bg-[#F5F0EA] pb-24">
      <HomeClient
        displayName={displayName}
        profile={profile}
        entries={entries || []}
        communityActive={communityActive || 0}
        totalUsers={totalUsers || 0}
      />
      <BottomNav />
    </div>
  );
}
