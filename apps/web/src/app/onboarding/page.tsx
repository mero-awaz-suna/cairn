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

const AGE_GROUPS = [
  { value: "high_school", label: "High school" },
  { value: "college", label: "College / University" },
  { value: "early_career", label: "Early career (22-30)" },
  { value: "mid_career", label: "Mid career (30+)" },
] as const;

const OCCUPATIONS = [
  { value: "student", label: "Student" },
  { value: "engineer", label: "Engineer / Tech" },
  { value: "healthcare", label: "Healthcare" },
  { value: "business", label: "Business / Finance" },
  { value: "creative", label: "Creative / Arts" },
  { value: "service", label: "Service industry" },
  { value: "other", label: "Other" },
] as const;

const LIVING_SITUATIONS = [
  { value: "alone", icon: "🏠", label: "Living alone" },
  { value: "roommates", icon: "🏘️", label: "With roommates" },
  { value: "family", icon: "👪", label: "With family" },
  { value: "partner", icon: "💑", label: "With partner" },
] as const;

// ── Reusable option button (outside component to avoid re-creation) ──
function OptionButton({
  selected, onClick, icon, label, bold, delay,
}: {
  selected: boolean; onClick: () => void; icon: string; label: string; bold?: boolean; delay: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-[16px] transition-all duration-300 flex items-center gap-4 ${
        selected
          ? "bg-[var(--moss-soft)] border-l-[3px] border-l-moss border-y border-r border-y-transparent border-r-transparent shadow-[0_2px_12px_rgba(44,40,37,0.05)] px-[17px] py-[18px]"
          : "bg-white border border-sand hover:border-cloud-light hover:shadow-[0_2px_12px_rgba(44,40,37,0.05)] px-5 py-[18px]"
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className={`text-[22px] w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 ${
        selected ? "bg-moss" : "bg-sand-light"
      } transition-colors duration-300`}>
        {icon}
      </span>
      <span className={`text-[15px] leading-[1.3] transition-colors duration-300 ${
        selected ? "text-moss-deep font-semibold" : `text-stone ${bold ? "font-bold" : "font-semibold"}`
      }`}>
        {label}
      </span>
    </button>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [academicStage, setAcademicStage] = useState("");
  const [primaryBurden, setPrimaryBurden] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [occupation, setOccupation] = useState("");
  const [livingSituation, setLivingSituation] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const totalSteps = 4;

  async function handleComplete() {
    setSaving(true);
    setErrorMsg("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) { router.push("/login"); return; }

    // Use upsert to handle missing profile edge case
    const { error } = await supabase
      .from("users")
      .upsert(
        {
          supabase_auth_id: user.id,
          academic_stage: academicStage,
          primary_burden: primaryBurden,
          consented_to_terms_at: new Date().toISOString(),
          consented_to_ai_at: new Date().toISOString(),
        },
        { onConflict: "supabase_auth_id" }
      );

    if (error) {
      console.error("Onboarding error:", error);
      setErrorMsg("Something went wrong. Please try again.");
      setSaving(false);
      return;
    }

    // Call backend to create persona with demographics (non-blocking)
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        await fetch(`${apiUrl}/persona/onboard`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            age_group: ageGroup || "college",
            occupation: occupation || "student",
            industry: "",
            language_code: "en",
            region_code: "US",
            living_situation: livingSituation || "alone",
          }),
        });
      }
    } catch (err) {
      console.warn("Persona onboarding call failed (non-blocking):", err);
    }

    router.push("/home");
  }

  return (
    <div className="min-h-screen bg-warm-cream flex flex-col">
      {/* Progress dots */}
      <div className="flex justify-center gap-2 pt-[60px] pb-10">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`w-8 h-[3px] rounded-full transition-all duration-500 ${
              step >= i + 1 ? "bg-moss" : "bg-sand"
            }`}
          />
        ))}
      </div>

      <div className="flex-1 px-6 max-w-[400px] mx-auto w-full">
        {/* Error banner */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-[12px] bg-red-soft/10 border border-red-soft/30 text-red-soft text-[13px] text-center">
            {errorMsg}
          </div>
        )}

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
              {STAGES.map((stage, i) => (
                <OptionButton
                  key={stage.value}
                  selected={academicStage === stage.value}
                  onClick={() => {
                    setAcademicStage(stage.value);
                    setTimeout(() => setStep(2), 450);
                  }}
                  icon={stage.icon}
                  label={stage.label}
                  delay={i * 60}
                />
              ))}
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
              {BURDENS.map((burden, i) => (
                <OptionButton
                  key={burden.value}
                  selected={primaryBurden === burden.value}
                  onClick={() => {
                    setPrimaryBurden(burden.value);
                    setTimeout(() => setStep(3), 450);
                  }}
                  icon={burden.icon}
                  label={burden.label}
                  bold={burden.bold}
                  delay={i * 60}
                />
              ))}
            </div>

            <button
              onClick={() => setStep(1)}
              className="mt-6 px-6 py-[14px] rounded-full border border-sand text-[14px] font-medium text-dusk hover:border-cloud-light active:scale-[0.97] transition-all duration-200"
            >
              Back
            </button>
          </div>
        )}

        {/* Step 3: About you */}
        {step === 3 && (
          <div className="animate-[cardEnter_450ms_var(--ease-enter)_both]">
            <h2 className="font-display text-[26px] text-stone leading-[1.2] mb-3">
              A little about you
            </h2>
            <p className="text-[14px] text-dusk font-normal mb-8 leading-[1.5]">
              This helps us match you with the right people.
            </p>

            <div className="mb-6">
              <label className="text-[13px] font-semibold text-dusk mb-2 block">Age group</label>
              <div className="flex flex-wrap gap-2">
                {AGE_GROUPS.map((ag) => (
                  <button
                    key={ag.value}
                    onClick={() => setAgeGroup(ag.value)}
                    className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all duration-200 ${
                      ageGroup === ag.value
                        ? "bg-moss text-white"
                        : "bg-white border border-sand text-stone hover:border-cloud-light"
                    }`}
                  >
                    {ag.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="text-[13px] font-semibold text-dusk mb-2 block">What do you do?</label>
              <div className="flex flex-wrap gap-2">
                {OCCUPATIONS.map((occ) => (
                  <button
                    key={occ.value}
                    onClick={() => setOccupation(occ.value)}
                    className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all duration-200 ${
                      occupation === occ.value
                        ? "bg-moss text-white"
                        : "bg-white border border-sand text-stone hover:border-cloud-light"
                    }`}
                  >
                    {occ.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-[14px] rounded-full border border-sand text-[14px] font-medium text-dusk hover:border-cloud-light active:scale-[0.97] transition-all duration-200"
              >
                Back
              </button>
              <button
                onClick={() => { if (ageGroup && occupation) setStep(4); }}
                disabled={!ageGroup || !occupation}
                className="flex-1 px-6 py-[14px] rounded-full bg-moss text-white text-[15px] font-semibold shadow-[0_4px_20px_rgba(107,143,113,0.4)] hover:bg-moss-deep active:scale-[0.97] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Living situation */}
        {step === 4 && (
          <div className="animate-[cardEnter_450ms_var(--ease-enter)_both]">
            <h2 className="font-display text-[26px] text-stone leading-[1.2] mb-3">
              Your living situation
            </h2>
            <p className="text-[14px] text-dusk font-normal mb-10 leading-[1.5]">
              Last one. This helps us understand your support network.
            </p>
            <div className="flex flex-col gap-3">
              {LIVING_SITUATIONS.map((ls, i) => (
                <OptionButton
                  key={ls.value}
                  selected={livingSituation === ls.value}
                  onClick={() => setLivingSituation(ls.value)}
                  icon={ls.icon}
                  label={ls.label}
                  delay={i * 60}
                />
              ))}
            </div>

            <div className="mt-10 flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="px-6 py-[14px] rounded-full border border-sand text-[14px] font-medium text-dusk hover:border-cloud-light active:scale-[0.97] transition-all duration-200"
              >
                Back
              </button>
              <button
                onClick={handleComplete}
                disabled={!livingSituation || saving}
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
