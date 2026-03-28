import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsClient, SignOutButton } from "./client";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("cultural_context, academic_stage, primary_burden, data_deletion_requested, created_at")
    .eq("supabase_auth_id", user.id)
    .single();

  if (!profile) redirect("/onboarding");

  return (
    <div className="min-h-screen bg-warm-cream">
      <div className="h-[52px] flex-shrink-0" />

      {/* Header */}
      <div className="px-6 flex items-center gap-3 mb-8">
        <a
          href="/profile"
          className="w-9 h-9 rounded-full bg-white border border-sand flex items-center justify-center hover:border-cloud-light transition-colors duration-200"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-stone)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </a>
        <h2 className="font-display text-[24px] text-stone">Settings</h2>
      </div>

      <div className="px-6 space-y-4 pb-12">
        {/* Account info */}
        <div className="bg-white rounded-[16px] p-5 shadow-[0_2px_12px_rgba(44,40,37,0.05)]">
          <div className="text-[13px] font-bold text-stone mb-4 flex items-center gap-[6px]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-moss)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Account
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[13px] text-dusk">Email</span>
              <span className="text-[13px] text-stone font-medium">{user.email}</span>
            </div>
            <div className="h-px bg-sand" />
            <div className="flex justify-between items-center">
              <span className="text-[13px] text-dusk">Joined</span>
              <span className="text-[13px] text-stone font-medium">
                {new Date(profile.created_at).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                })}
              </span>
            </div>
            <div className="h-px bg-sand" />
            <div className="flex justify-between items-center">
              <span className="text-[13px] text-dusk">Auth provider</span>
              <span className="text-[13px] text-stone font-medium">Google</span>
            </div>
          </div>
        </div>

        {/* Cultural context */}
        <SettingsClient
          currentCulturalContext={profile.cultural_context || ""}
          deletionRequested={profile.data_deletion_requested || false}
        />

        {/* About Cairn */}
        <div className="bg-white rounded-[16px] p-5 shadow-[0_2px_12px_rgba(44,40,37,0.05)]">
          <div className="text-[13px] font-bold text-stone mb-4 flex items-center gap-[6px]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-moss)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            About Cairn
          </div>
          <p className="text-[13px] text-dusk font-light leading-[1.6]">
            Cairn is not therapy. It is not a crisis line. It is a place where people who understand what you&apos;re carrying can sit alongside you. If you are in immediate danger, please contact 988 (Suicide & Crisis Lifeline) or text HOME to 741741.
          </p>
          <div className="h-px bg-sand my-4" />
          <div className="flex justify-between items-center">
            <span className="text-[13px] text-dusk">Version</span>
            <span className="text-[13px] text-cloud font-medium">0.1.0</span>
          </div>
        </div>
        {/* Sign out */}
        <SignOutButton />
      </div>
    </div>
  );
}
