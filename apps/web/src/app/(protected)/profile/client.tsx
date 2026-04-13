"use client";

import { useState } from "react";
import { signOut } from "../actions";

export function ProfileClient() {
  const [confirming, setConfirming] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  return (
    <div className="space-y-3 mb-6">
      {/* Sign out */}
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="w-full text-center py-[14px] rounded-full border border-sand text-[14px] font-medium text-dusk hover:border-cloud-light active:scale-[0.97] transition-all duration-200"
        >
          Sign out
        </button>
      ) : (
        <div className="bg-white rounded-[16px] p-5 shadow-[0_2px_12px_rgba(44,40,37,0.05)] text-center">
          <p className="text-[14px] text-stone font-medium mb-4">
            Your space will be here when you come back.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirming(false)}
              className="flex-1 py-3 rounded-full border border-sand text-[14px] font-medium text-dusk hover:border-cloud-light active:scale-[0.97] transition-all duration-200"
            >
              Stay
            </button>
            <button
              onClick={async () => {
                setSigningOut(true);
                await signOut();
              }}
              disabled={signingOut}
              className="flex-1 py-3 rounded-full bg-stone text-white text-[14px] font-semibold active:scale-[0.97] transition-all duration-200 disabled:opacity-50"
            >
              {signingOut ? "Leaving..." : "Sign out"}
            </button>
          </div>
        </div>
      )}

      {/* Data & privacy */}
      <p className="text-[11px] text-cloud text-center leading-[1.5]">
        Your journal entries and burden drops are encrypted.
        <br />
        You can request full data deletion in Settings.
      </p>
    </div>
  );
}
