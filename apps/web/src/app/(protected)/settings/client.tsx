"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const CULTURAL_OPTIONS = [
  { value: "", label: "Not specified" },
  { value: "nepali", label: "Nepali" },
  { value: "south_asian", label: "South Asian" },
  { value: "international", label: "International" },
  { value: "universal", label: "Universal" },
];

export function SettingsClient({
  currentCulturalContext,
  deletionRequested,
}: {
  currentCulturalContext: string;
  deletionRequested: boolean;
}) {
  const [culturalContext, setCulturalContext] = useState(currentCulturalContext);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSaveCulturalContext(value: string) {
    setCulturalContext(value);
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("users")
      .update({ cultural_context: value || null })
      .eq("supabase_auth_id", user.id);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleRequestDeletion() {
    setDeleting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("users")
      .update({
        data_deletion_requested: true,
        deletion_requested_at: new Date().toISOString(),
      })
      .eq("supabase_auth_id", user.id);

    setDeleting(false);
    setShowDeleteConfirm(false);
    window.location.reload();
  }

  return (
    <>
      {/* Cultural context preference */}
      <div className="bg-white rounded-[16px] p-5 shadow-[0_2px_12px_rgba(44,40,37,0.05)]">
        <div className="text-[13px] font-bold text-stone mb-4 flex items-center justify-between">
          <span className="flex items-center gap-[6px]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-moss)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            Cultural Context
          </span>
          {saving && <span className="text-[11px] text-dusk font-normal">Saving...</span>}
          {saved && <span className="text-[11px] text-moss font-normal">Saved</span>}
        </div>
        <p className="text-[12px] text-dusk font-light mb-4 leading-[1.5]">
          This helps us match you with people who share your cultural context. Completely optional.
        </p>
        <div className="flex flex-wrap gap-2">
          {CULTURAL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleSaveCulturalContext(opt.value)}
              className={`rounded-full px-[14px] py-[6px] text-[12px] font-medium transition-all duration-200 ${
                culturalContext === opt.value
                  ? "bg-moss border border-moss text-white"
                  : "bg-white border border-sand text-dusk hover:border-cloud-light"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Data & privacy */}
      <div className="bg-white rounded-[16px] p-5 shadow-[0_2px_12px_rgba(44,40,37,0.05)]">
        <div className="text-[13px] font-bold text-stone mb-4 flex items-center gap-[6px]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-moss)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Data & Privacy
        </div>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-moss mt-[7px] flex-shrink-0" />
            <p className="text-[13px] text-dusk font-light leading-[1.5]">
              Your journal entries are encrypted at rest
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-moss mt-[7px] flex-shrink-0" />
            <p className="text-[13px] text-dusk font-light leading-[1.5]">
              Burden text is never shown to other people — only theme counts
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-moss mt-[7px] flex-shrink-0" />
            <p className="text-[13px] text-dusk font-light leading-[1.5]">
              Circle messages are purged 30 days after session close
            </p>
          </div>
        </div>

        <div className="h-px bg-sand my-4" />

        {deletionRequested ? (
          <div className="bg-[var(--ember-glow)] rounded-[10px] px-4 py-3">
            <p className="text-[13px] text-ember font-medium">
              Data deletion requested. Your data will be removed within 30 days.
            </p>
          </div>
        ) : !showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-[13px] text-red-soft font-medium hover:underline transition-all duration-200"
          >
            Request data deletion
          </button>
        ) : (
          <div className="bg-sand-light rounded-[10px] p-4">
            <p className="text-[13px] text-stone font-medium mb-3">
              This will permanently delete all your journal entries, burden drops, and circle history within 30 days. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-[10px] rounded-full border border-sand text-[13px] font-medium text-dusk"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestDeletion}
                disabled={deleting}
                className="flex-1 py-[10px] rounded-full bg-red-soft text-white text-[13px] font-semibold disabled:opacity-50"
              >
                {deleting ? "Processing..." : "Delete my data"}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export function SignOutButton() {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    const { signOut } = await import("../actions");
    await signOut();
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="w-full py-[14px] rounded-full border border-sand text-[14px] font-medium text-dusk hover:border-cloud-light active:scale-[0.97] transition-all duration-200"
      >
        Sign out
      </button>
    );
  }

  return (
    <div className="bg-white rounded-[16px] p-5 shadow-[0_2px_12px_rgba(44,40,37,0.05)] text-center">
      <p className="text-[14px] text-stone font-medium mb-4">
        Your space will be here when you come back.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => setConfirming(false)}
          className="flex-1 py-3 rounded-full border border-sand text-[14px] font-medium text-dusk active:scale-[0.97] transition-all duration-200"
        >
          Stay
        </button>
        <button
          onClick={handleSignOut}
          disabled={loading}
          className="flex-1 py-3 rounded-full bg-stone text-white text-[14px] font-semibold active:scale-[0.97] transition-all duration-200 disabled:opacity-50"
        >
          {loading ? "Leaving..." : "Sign out"}
        </button>
      </div>
    </div>
  );
}
