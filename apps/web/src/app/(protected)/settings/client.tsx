"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
      <div className="bg-white rounded-[16px] p-5" style={{ boxShadow: "0 2px 12px rgba(44,40,37,0.05)" }}>
        <div className="text-[13px] font-bold mb-4 flex items-center justify-between" style={{ color: "#2C2825" }}>
          <span className="flex items-center gap-[6px]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B8F71" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            Cultural Context
          </span>
          <AnimatePresence mode="wait">
            {saving && (
              <motion.span
                key="saving"
                className="text-[11px] font-normal"
                style={{ color: "#8B7E74" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Saving...
              </motion.span>
            )}
            {saved && (
              <motion.span
                key="saved"
                className="text-[11px] font-normal"
                style={{ color: "#6B8F71" }}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.3 }}
              >
                Saved
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <p className="text-[12px] font-light mb-4 leading-[1.5]" style={{ color: "#8B7E74" }}>
          This helps us match you with people who share your cultural context. Completely optional.
        </p>
        <div className="flex flex-wrap gap-2">
          {CULTURAL_OPTIONS.map((opt) => (
            <motion.button
              key={opt.value}
              onClick={() => handleSaveCulturalContext(opt.value)}
              className="rounded-full px-[14px] py-[6px] text-[12px] font-medium transition-colors duration-200"
              style={
                culturalContext === opt.value
                  ? { backgroundColor: "#6B8F71", borderWidth: 1, borderStyle: "solid", borderColor: "#6B8F71", color: "#FFFFFF" }
                  : { backgroundColor: "#FFFFFF", borderWidth: 1, borderStyle: "solid", borderColor: "#E8DFD3", color: "#8B7E74" }
              }
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {opt.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Data & privacy */}
      <div className="bg-white rounded-[16px] p-5" style={{ boxShadow: "0 2px 12px rgba(44,40,37,0.05)" }}>
        <div className="text-[13px] font-bold mb-4 flex items-center gap-[6px]" style={{ color: "#2C2825" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B8F71" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Data & Privacy
        </div>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full mt-[7px] flex-shrink-0" style={{ backgroundColor: "#6B8F71" }} />
            <p className="text-[13px] font-light leading-[1.5]" style={{ color: "#8B7E74" }}>
              Your journal entries are encrypted at rest
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full mt-[7px] flex-shrink-0" style={{ backgroundColor: "#6B8F71" }} />
            <p className="text-[13px] font-light leading-[1.5]" style={{ color: "#8B7E74" }}>
              Burden text is never shown to other people — only theme counts
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full mt-[7px] flex-shrink-0" style={{ backgroundColor: "#6B8F71" }} />
            <p className="text-[13px] font-light leading-[1.5]" style={{ color: "#8B7E74" }}>
              Circle messages are purged 30 days after session close
            </p>
          </div>
        </div>

        <div className="h-px my-4" style={{ backgroundColor: "#E8DFD3" }} />

        <AnimatePresence mode="wait">
          {deletionRequested ? (
            <motion.div
              key="requested"
              className="rounded-[10px] px-4 py-3"
              style={{ backgroundColor: "rgba(212,132,90,0.18)" }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-[13px] font-medium" style={{ color: "#D4845A" }}>
                Data deletion requested. Your data will be removed within 30 days.
              </p>
            </motion.div>
          ) : !showDeleteConfirm ? (
            <motion.button
              key="delete-btn"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-[13px] font-medium hover:underline transition-all duration-200"
              style={{ color: "#D45A5A" }}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.97 }}
            >
              Request data deletion
            </motion.button>
          ) : (
            <motion.div
              key="confirm"
              className="rounded-[10px] p-4"
              style={{ backgroundColor: "#F5F0EA" }}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as const }}
            >
              <p className="text-[13px] font-medium mb-3" style={{ color: "#2C2825" }}>
                This will permanently delete all your journal entries, burden drops, and circle history within 30 days. This cannot be undone.
              </p>
              <div className="flex gap-3">
                <motion.button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-[10px] rounded-full text-[13px] font-medium"
                  style={{ border: "1px solid #E8DFD3", color: "#8B7E74" }}
                  whileHover={{ borderColor: "#C9BFB2" }}
                  whileTap={{ scale: 0.97 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={handleRequestDeletion}
                  disabled={deleting}
                  className="flex-1 py-[10px] rounded-full text-white text-[13px] font-semibold disabled:opacity-50"
                  style={{ backgroundColor: "#D45A5A" }}
                  whileHover={{ backgroundColor: "#C04E4E" }}
                  whileTap={{ scale: 0.97 }}
                >
                  {deleting ? "Processing..." : "Delete my data"}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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

  return (
    <AnimatePresence mode="wait">
      {!confirming ? (
        <motion.button
          key="signout-btn"
          onClick={() => setConfirming(true)}
          className="w-full py-[14px] rounded-full text-[14px] font-medium transition-all duration-200"
          style={{ border: "1px solid #E8DFD3", color: "#8B7E74" }}
          whileHover={{ borderColor: "#C9BFB2" }}
          whileTap={{ scale: 0.97 }}
          exit={{ opacity: 0, scale: 0.95 }}
        >
          Sign out
        </motion.button>
      ) : (
        <motion.div
          key="signout-confirm"
          className="bg-white rounded-[16px] p-5 text-center"
          style={{ boxShadow: "0 2px 12px rgba(44,40,37,0.05)" }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] as const }}
        >
          <p className="text-[14px] font-medium mb-4" style={{ color: "#2C2825" }}>
            Your space will be here when you come back.
          </p>
          <div className="flex gap-3">
            <motion.button
              onClick={() => setConfirming(false)}
              className="flex-1 py-3 rounded-full text-[14px] font-medium transition-all duration-200"
              style={{ border: "1px solid #E8DFD3", color: "#8B7E74" }}
              whileTap={{ scale: 0.97 }}
            >
              Stay
            </motion.button>
            <motion.button
              onClick={handleSignOut}
              disabled={loading}
              className="flex-1 py-3 rounded-full text-white text-[14px] font-semibold transition-all duration-200 disabled:opacity-50"
              style={{ backgroundColor: "#2C2825" }}
              whileTap={{ scale: 0.97 }}
            >
              {loading ? "Leaving..." : "Sign out"}
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
