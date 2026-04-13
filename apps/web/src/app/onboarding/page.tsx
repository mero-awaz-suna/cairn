"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const STAGES = [
  { value: "just_arrived", icon: "🧳", label: "Just arrived somewhere new" },
  { value: "in_the_middle", icon: "🌊", label: "In the middle of something hard" },
  { value: "finding_footing", icon: "🌱", label: "Finding my footing" },
  { value: "helping_others", icon: "🤝", label: "Trying to help others find theirs" },
] as const;

const BURDENS: readonly { value: string; icon: string; label: string; bold?: boolean }[] = [
  { value: "career", icon: "💼", label: "Career & what comes next" },
  { value: "family", icon: "👨‍👩‍👧", label: "Family & what they expect" },
  { value: "belonging", icon: "🧭", label: "Belonging & where I fit" },
  { value: "all_of_it", icon: "🌀", label: "All of it, honestly", bold: true },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [academicStage, setAcademicStage] = useState("");
  const [primaryBurden, setPrimaryBurden] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleComplete() {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) { router.push("/login"); return; }

    const { error } = await supabase
      .from("users")
      .update({
        academic_stage: academicStage,
        primary_burden: primaryBurden,
        consented_to_terms_at: new Date().toISOString(),
        consented_to_ai_at: new Date().toISOString(),
      })
      .eq("supabase_auth_id", user.id);

    if (error) { console.error("Onboarding error:", error); setSaving(false); return; }
    router.push("/home");
  }

  return (
    <div className="min-h-screen bg-warm-cream flex flex-col">
      {/* Progress dots */}
      <div className="flex justify-center gap-2 pt-[60px] pb-10">
        <div className={`w-8 h-[3px] rounded-full transition-all duration-500 ${step >= 1 ? "bg-moss" : "bg-sand"}`} />
        <div className={`w-8 h-[3px] rounded-full transition-all duration-500 ${step >= 2 ? "bg-moss" : "bg-sand"}`} />
      </div>

      <div className="flex-1 px-6 max-w-[400px] mx-auto w-full">
        {/* Step 1: Where are you? */}
        {step === 1 && (
          <div className="animate-[cardEnter_450ms_var(--ease-enter)_both]">
            <h2 className="font-display text-[26px] text-stone leading-[1.2] mb-3">
              Where are you right now?
            </h2>
            <p className="text-[14px] text-dusk font-normal mb-10 leading-[1.5]">
              No wrong answers. Just where you stand today.
            </p>

            <div className="flex flex-col gap-3">
              {STAGES.map((stage, i) => {
                const selected = academicStage === stage.value;
                return (
                  <button
                    key={stage.value}
                    onClick={() => {
                      setAcademicStage(stage.value);
                      setTimeout(() => setStep(2), 450);
                    }}
                    className={`w-full text-left rounded-[16px] transition-all duration-300 flex items-center gap-4 ${
                      selected
                        ? "bg-[var(--moss-soft)] border-l-[3px] border-l-moss border-y border-r border-y-transparent border-r-transparent shadow-[0_2px_12px_rgba(44,40,37,0.05)] px-[17px] py-[18px]"
                        : "bg-white border border-sand hover:border-cloud-light hover:shadow-[0_2px_12px_rgba(44,40,37,0.05)] px-5 py-[18px]"
                    }`}
                    style={{
                      animationDelay: `${i * 60}ms`,
                    }}
                  >
                    <span className={`text-[22px] w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 ${
                      selected ? "bg-moss" : "bg-sand-light"
                    } transition-colors duration-300`}>
                      {stage.icon}
                    </span>
                    <span className={`text-[15px] font-semibold leading-[1.3] ${
                      selected ? "text-moss-deep" : "text-stone"
                    } transition-colors duration-300`}>
                      {stage.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: What weighs the most? */}
        {step === 2 && (
          <div className="animate-[cardEnter_450ms_var(--ease-enter)_both]">
            <h2 className="font-display text-[26px] text-stone leading-[1.2] mb-3">
              What carries the most weight?
            </h2>
            <p className="text-[14px] text-dusk font-normal mb-10 leading-[1.5]">
              The thing that sits with you even when everything else is fine.
            </p>

            <div className="flex flex-col gap-3">
              {BURDENS.map((burden, i) => {
                const selected = primaryBurden === burden.value;
                return (
                  <button
                    key={burden.value}
                    onClick={() => setPrimaryBurden(burden.value)}
                    className={`w-full text-left rounded-[16px] transition-all duration-300 flex items-center gap-4 ${
                      selected
                        ? "bg-[var(--moss-soft)] border-l-[3px] border-l-moss border-y border-r border-y-transparent border-r-transparent shadow-[0_2px_12px_rgba(44,40,37,0.05)] px-[17px] py-[18px]"
                        : "bg-white border border-sand hover:border-cloud-light hover:shadow-[0_2px_12px_rgba(44,40,37,0.05)] px-5 py-[18px]"
                    }`}
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <span className={`text-[22px] w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 ${
                      selected ? "bg-moss" : "bg-sand-light"
                    } transition-colors duration-300`}>
                      {burden.icon}
                    </span>
                    <span className={`text-[15px] leading-[1.3] transition-colors duration-300 ${
                      selected ? "text-moss-deep font-semibold" : `text-stone ${burden.bold ? "font-bold" : "font-semibold"}`
                    }`}>
                      {burden.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Bottom actions */}
            <div className="mt-10 flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-[14px] rounded-full border border-sand text-[14px] font-medium text-dusk hover:border-cloud-light active:scale-[0.97] transition-all duration-200"
              >
                Back
              </button>
              <button
                onClick={handleComplete}
                disabled={!primaryBurden || saving}
                className="flex-1 px-6 py-[14px] rounded-full bg-moss text-white text-[15px] font-semibold shadow-[0_4px_20px_rgba(107,143,113,0.4)] hover:bg-moss-deep active:scale-[0.97] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? "Setting up..." : "Enter Cairn"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="h-[60px] flex-shrink-0" />
    </div>
  );
}
