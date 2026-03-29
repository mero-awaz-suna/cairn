"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Sign Out ──
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ── Get current user's profile ID ──
async function getProfileId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("id")
    .eq("supabase_auth_id", user.id)
    .single();

  return profile?.id || null;
}

// ── Get Supabase access token for backend API calls ──
async function getAccessToken(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

// ── Submit Journal Entry (text or audio) ──
export async function submitJournalEntry(formData: FormData) {
  let text = (formData.get("text") as string) || "";
  const audioFile = formData.get("audio") as File | null;
  const audioMimeType = (formData.get("mimeType") as string) || "";
  const inputType = audioFile ? "audio" : "text";
  let transcriptionMs: number | null = null;
  let audioStoragePath: string | null = null;

  const supabase = await createClient();
  const profileId = await getProfileId();
  if (!profileId) return { error: "Not authenticated" };

  const token = await getAccessToken();

  // If audio, upload to Supabase Storage first, then transcribe
  if (audioFile && audioFile.size > 0) {
    try {
      // Upload audio to Supabase Storage
      const audioBytes = Buffer.from(await audioFile.arrayBuffer());
      const storagePath = `${profileId}/${Date.now()}.webm`;
      await supabase.storage
        .from("journal-audio")
        .upload(storagePath, audioBytes, { contentType: audioMimeType || "audio/webm" });
      audioStoragePath = storagePath;

      // Transcribe via Groq Whisper (keep local for speed)
      const { transcribeAudio } = await import("@/lib/ai/transcribe");
      const result = await transcribeAudio(audioFile, audioMimeType);
      text = result.text;
      transcriptionMs = result.durationMs;
    } catch (err) {
      console.error("[Journal] Audio processing failed:", err);
      return { error: "Audio processing failed. Try typing instead." };
    }
  }

  if (!text?.trim()) return { error: "No text provided" };

  // ── Call FastAPI backend for persona analysis ──
  let backendResult: {
    stage: string;
    stress_score: number;
    stage_confidence: number;
    stressor_breakdown: Record<string, number>;
    crisis_flag: boolean;
    crisis_reason: string | null;
    is_improving: boolean;
    entry_count: number;
  } | null = null;

  if (token) {
    try {
      // Get entry count for day_number
      const { count } = await supabase
        .from("journal_entries")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profileId);

      const res = await fetch(`${API_URL}/persona/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          transcript: text,
          audio_path: audioStoragePath || "text-only",
          day_number: (count || 0) + 1,
        }),
      });

      if (res.ok) {
        backendResult = await res.json();
      }
    } catch (err) {
      console.warn("[Journal] Backend persona call failed, falling back to heuristics:", err);
    }
  }

  // ── Map backend result to our schema (or fall back to heuristics) ──
  const STAGE_MAP: Record<string, string> = {
    "In the storm": "storm",
    "Finding ground": "ground",
    "Through it": "through_it",
  };

  let persona: string;
  let stressLevel: number;
  let personaConfidence: number;
  let recognitionMessage: string;
  let microIntervention: string;
  let burdenThemes: string[];

  if (backendResult) {
    persona = STAGE_MAP[backendResult.stage] || "ground";
    stressLevel = Math.round(backendResult.stress_score * 10);
    personaConfidence = backendResult.stage_confidence;
    burdenThemes = Object.entries(backendResult.stressor_breakdown)
      .filter(([, v]) => v > 0.15)
      .map(([k]) => k);
    recognitionMessage = backendResult.crisis_flag
      ? "We see you. This is heavy, and you don't have to carry it alone."
      : backendResult.is_improving
        ? "You're moving through this. That takes real strength."
        : "Just showing up here takes courage. We see you.";
    microIntervention = backendResult.crisis_flag
      ? "Consider reaching out to someone you trust right now."
      : "Take three slow breaths. You've already done something brave by being here.";
  } else {
    // Heuristic fallback (same as before)
    const { processJournalEntry } = await import("@/lib/ai/persona-engine");
    const { count: communityCount } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("is_suspended", false);
    const aiResult = await processJournalEntry(text, communityCount || 42);
    persona = aiResult.persona;
    stressLevel = aiResult.stress_level;
    personaConfidence = aiResult.persona_confidence;
    recognitionMessage = aiResult.recognition_message;
    microIntervention = aiResult.micro_intervention;
    burdenThemes = aiResult.burden_themes;
  }

  // ── Insert journal entry (frontend still owns this write) ──
  const startTime = Date.now();
  const { data: entry, error } = await supabase
    .from("journal_entries")
    .insert({
      user_id: profileId,
      input_type: inputType,
      raw_transcript: text,
      assigned_persona: persona,
      persona_confidence: personaConfidence,
      stress_level: stressLevel,
      burden_themes: burdenThemes,
      recognition_message: recognitionMessage,
      micro_intervention: microIntervention,
      ai_model_used: backendResult ? "gemini-persona-pipeline" : "heuristic-v1",
      ai_processing_ms: Date.now() - startTime,
      transcription_ms: transcriptionMs,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // Update user profile with latest persona + streak
  const today = new Date().toISOString().split("T")[0];

  const { data: lastEntry } = await supabase
    .from("journal_entries")
    .select("created_at")
    .eq("user_id", profileId)
    .order("created_at", { ascending: false })
    .range(1, 1)
    .single();

  let newStreak = 1;
  if (lastEntry) {
    const lastDate = new Date(lastEntry.created_at).toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    if (lastDate === yesterday || lastDate === today) {
      const { data: profile } = await supabase
        .from("users")
        .select("journal_streak")
        .eq("id", profileId)
        .single();
      newStreak = (profile?.journal_streak || 0) + (lastDate === yesterday ? 1 : 0);
      if (newStreak < 1) newStreak = 1;
    }
  }

  await supabase
    .from("users")
    .update({
      current_persona: persona,
      persona_confidence: personaConfidence,
      current_stress_level: stressLevel,
      last_journal_at: new Date().toISOString(),
      journal_streak: newStreak,
    })
    .eq("id", profileId);

  // Insert persona history
  await supabase.from("user_persona_history").insert({
    user_id: profileId,
    persona,
    stress_level: stressLevel,
    journal_entry_id: entry.id,
  });

  revalidatePath("/home");
  revalidatePath("/profile");

  return {
    success: true,
    entry: {
      persona,
      stress_level: stressLevel,
      recognition_message: recognitionMessage,
      micro_intervention: microIntervention,
    },
  };
}

// ── Drop a Burden ──
export async function dropBurden(formData: FormData) {
  const text = formData.get("text") as string;
  if (!text?.trim()) return { error: "No text provided" };

  const supabase = await createClient();
  const profileId = await getProfileId();
  if (!profileId) return { error: "Not authenticated" };

  // Simple theme extraction (placeholder for AI)
  const lowerText = text.toLowerCase();
  let theme = "performance_of_okayness";

  const themeMap: [RegExp, string][] = [
    [/job|career|interview|rejection|resume|hired|fired|layoff|salary/, "job_search_rejection"],
    [/impostor|fraud|belong.*work|don't deserve/, "impostor_syndrome_professional"],
    [/visa|opt|h1b|deporta|status|immigration/, "visa_career_intersection_anxiety"],
    [/first.*(gen|generation)|nobody.*family.*college/, "first_gen_professional_pressure"],
    [/family.*expect|parent.*disappoint|let.*down/, "family_expectation_gap"],
    [/sacrifice|debt.*family|owe.*parent|gave up/, "invisible_debt"],
    [/identity|culture.*clash|between.*world/, "cultural_identity_friction"],
    [/belong|fit.*in|nowhere.*home/, "belonging_nowhere"],
    [/grade|gpa|exam|academic|study/, "academic_performance_weight"],
    [/lonely|alone.*success|no one.*understand/, "loneliness_in_success"],
    [/money|financial|afford|rent|broke/, "financial_stress_hidden"],
    [/relationship|dating|partner.*culture/, "relationship_cultural_clash"],
    [/parent.*sacrifice|mom.*dad.*gave/, "parental_sacrifice_guilt"],
    [/fine|okay|pretend|mask|perform/, "performance_of_okayness"],
    [/opt|h1b|timeline|clock.*tick/, "opt_h1b_anxiety"],
    [/burnout|exhausted|tired|depleted/, "burnout_silent"],
    [/home.*sick|miss.*home|back.*home/, "homesickness_complex"],
    [/grief|loss|death|miss.*someone/, "grief_distance"],
  ];

  for (const [pattern, t] of themeMap) {
    if (pattern.test(lowerText)) {
      theme = t;
      break;
    }
  }

  // Insert burden drop
  const { error } = await supabase.from("burden_drops").insert({
    user_id: profileId,
    raw_burden_text: text,
    extracted_theme: theme,
    theme_confidence: 0.75,
  });

  if (error) return { error: error.message };

  // Increment user's burden count (atomic)
  const { error: rpcError } = await supabase.rpc("increment_burdens_dropped", { profile_id: profileId });
  if (rpcError) {
    const { data: u } = await supabase.from("users").select("burdens_dropped").eq("id", profileId).single();
    if (u) await supabase.from("users").update({ burdens_dropped: u.burdens_dropped + 1 }).eq("id", profileId);
  }

  // Get the count of others with same theme
  const { count } = await supabase
    .from("burden_drops")
    .select("*", { count: "exact", head: true })
    .eq("extracted_theme", theme);

  // Get a related memory if one exists
  const { data: relatedMemory } = await supabase
    .from("memories")
    .select("quote_text")
    .eq("is_approved", true)
    .limit(1)
    .single();

  revalidatePath("/home");
  revalidatePath("/profile");

  const { data: taxonomy } = await supabase
    .from("burden_taxonomy")
    .select("display_label")
    .eq("theme_key", theme)
    .single();

  return {
    success: true,
    theme: taxonomy?.display_label || theme.replace(/_/g, " "),
    count: count || 1,
    relatedQuote: relatedMemory?.quote_text || null,
  };
}

// ── Increment Helped Count on Memory ──
export async function incrementHelped(memoryId: string) {
  const supabase = await createClient();

  const { error: rpcErr } = await supabase.rpc("increment_helped_count", { memory_id: memoryId });
  if (rpcErr) {
    const { data } = await supabase.from("memories").select("helped_count").eq("id", memoryId).single();
    if (data) {
      await supabase.from("memories").update({ helped_count: data.helped_count + 1 }).eq("id", memoryId);
    }
  }
}
