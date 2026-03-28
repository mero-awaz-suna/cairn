/**
 * CAIRN — Persona Engine
 *
 * The emotional intelligence core. Takes a journal transcript,
 * returns persona assignment + culturally-intelligent recognition.
 *
 * Uses whichever LLM is configured (Groq/Gemini/Claude).
 * Falls back to heuristics if no API key is available.
 */

import { llmCall, hasAnyKey } from "./llm";

const SYSTEM_PROMPT = `You are the emotional intelligence core of Cairn, a peer wellness platform for South Asian and Nepali individuals navigating high-pressure transitions — immigration, career uncertainty, family expectation, identity displacement.

CULTURAL INTELLIGENCE — encode this into every response without stating it:

THE INVISIBLE DEBT: Many users were raised with the implicit understanding that their family sacrificed enormously for their opportunity. This makes struggle feel like ingratitude. When someone describes pressure, understand it is often 3x amplified by the sense that failing themselves means failing everyone who bet on them.

THE OKAYNESS PERFORMANCE: These users are expert performers of fine-ness. They have optimized for presenting success. The journal is the only place this mask is off. Honor that. Never perform back at them.

THE COLLECTIVIST-INDIVIDUALIST COLLISION: They were raised for collective identity (family, community, culture first) but are operating in a system that rewards individual performance and self-promotion. They often feel fraudulent doing either.

THE VISA PRECARITY AMPLIFIER: For those on student or work visas, every setback (job rejection, semester failure) carries existential weight. A job rejection is not a career setback — it is a potential deportation risk. Understand this force multiplier.

THE SILENCE NORM: In high-expectation cultures, expressing struggle is not catharsis — it is risk. Admitting difficulty can mean shaming the family, losing status, losing the role of "the one who made it." The journal entry you receive is an act of courage.

RESPONSE RULES:
- Write in second person, present tense, one unified paragraph
- Name the specific experience — not the category. Not "you're stressed about work" but "the gap between where you are and where everyone expects you to be by now"
- Never use: resilient, journey, healing, self-care, wellness, mental health, okay, resilience
- Never give advice — you are witnessing, not fixing
- Never use clinical language
- End with a number: "X people in this community are standing in this exact place with you" (pull X from the community_count parameter passed to you)
- Maximum 3 sentences for recognition message
- The micro_intervention must be one specific, non-clinical 5-7 minute action. Not "take a walk" — "Step outside for 5 minutes without your phone. Stand somewhere and let the air hit your face." Be that specific.

Return ONLY valid JSON matching this schema:
{
  "persona": "storm" | "ground" | "through_it",
  "persona_confidence": 0.0-1.0,
  "stress_level": 1-10,
  "burden_themes": ["string"],
  "recognition_message": "string",
  "micro_intervention": "string",
  "crisis_detected": false,
  "crisis_keywords": []
}`;

const BURDEN_TAXONOMY = [
  "job_search_rejection", "impostor_syndrome_professional", "visa_career_intersection_anxiety",
  "first_gen_professional_pressure", "family_expectation_gap", "invisible_debt",
  "cultural_identity_friction", "belonging_nowhere", "academic_performance_weight",
  "loneliness_in_success", "financial_stress_hidden", "relationship_cultural_clash",
  "parental_sacrifice_guilt", "performance_of_okayness", "opt_h1b_anxiety",
  "burnout_silent", "homesickness_complex", "grief_distance",
];

export interface PersonaEngineOutput {
  persona: "storm" | "ground" | "through_it";
  persona_confidence: number;
  stress_level: number;
  burden_themes: string[];
  recognition_message: string;
  micro_intervention: string;
  crisis_detected: boolean;
  crisis_keywords: string[];
}

export async function processJournalEntry(
  transcript: string,
  communityCount: number
): Promise<PersonaEngineOutput> {
  if (!hasAnyKey()) {
    return heuristicFallback(transcript, communityCount);
  }

  try {
    const response = await llmCall({
      system: SYSTEM_PROMPT,
      user: `Journal entry transcript:
"${transcript}"

Context:
- community_count: ${communityCount}
- Available burden themes: ${BURDEN_TAXONOMY.join(", ")}

Analyze this journal entry and return the JSON response.`,
      maxTokens: 512,
      temperature: 0.7,
    });

    // Parse JSON from response
    const jsonStr = response.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(jsonStr) as PersonaEngineOutput;

    // Validate and clamp
    const validPersonas = ["storm", "ground", "through_it"] as const;
    if (!validPersonas.includes(parsed.persona)) parsed.persona = "ground";
    parsed.persona_confidence = Math.max(0, Math.min(1, parsed.persona_confidence || 0.7));
    parsed.stress_level = Math.max(1, Math.min(10, parsed.stress_level || 5));
    parsed.burden_themes = (parsed.burden_themes || []).filter((t) => BURDEN_TAXONOMY.includes(t));
    if (parsed.burden_themes.length === 0) parsed.burden_themes = ["performance_of_okayness"];

    console.log(`[Persona Engine] ${response.provider}/${response.model} | ${response.latencyMs}ms | persona=${parsed.persona} stress=${parsed.stress_level}`);

    return parsed;
  } catch (error) {
    console.error("[Persona Engine] LLM failed, falling back to heuristics:", error);
    return heuristicFallback(transcript, communityCount);
  }
}

// ── Graceful fallback when all LLMs are unavailable ────────────────────────

function heuristicFallback(transcript: string, communityCount: number): PersonaEngineOutput {
  const lower = transcript.toLowerCase();

  const stormWords = ["drowning", "can't", "failing", "panic", "scared", "lost", "alone", "hopeless", "stuck", "overwhelming", "exhausted", "rejected", "ashamed", "broken", "crying", "desperate", "numb", "hate"];
  const throughWords = ["better", "learned", "grateful", "realized", "grew", "helped", "finally", "proud", "clarity", "peaceful", "progress", "stronger", "moved on", "looking back", "made it"];

  const stormScore = stormWords.filter((w) => lower.includes(w)).length;
  const throughScore = throughWords.filter((w) => lower.includes(w)).length;

  let persona: "storm" | "ground" | "through_it" = "ground";
  let stressLevel = 5;

  if (stormScore > throughScore && stormScore > 0) {
    persona = "storm";
    stressLevel = Math.min(9, 5 + stormScore);
  } else if (throughScore > stormScore && throughScore > 0) {
    persona = "through_it";
    stressLevel = Math.max(2, 5 - throughScore);
  }

  const messages: Record<string, string> = {
    storm: `The weight you're describing — between what you're performing and what you're actually feeling — that distance is exhausting. You're not failing at being okay. ${communityCount} people in this community are standing in this exact place with you.`,
    ground: `You're in the middle of something that doesn't have a name yet — not a crisis, not fine, somewhere in the unnamed space between. That space is real, and you're not imagining it. ${communityCount} people in this community are standing in this exact place with you.`,
    through_it: `You've been through something and you're looking at it with more clarity now. That doesn't make the past lighter — but it means you know something about yourself that no one can take. ${communityCount} people in this community are standing in this exact place with you.`,
  };

  const interventions: Record<string, string> = {
    storm: "Step outside for 5 minutes. Don't bring your phone. Just stand somewhere and let the air hit your face. Don't try to feel better — just let the air be the only thing happening.",
    ground: "Open a blank page — paper or screen. Write the one sentence you're most afraid to say out loud. Then close it. You don't have to do anything with it. The act of writing it is the thing.",
    through_it: "Text one person who has been where you are. Not to vent, not to catch up — just to say 'I was thinking about you.' Send it before you overthink it.",
  };

  return {
    persona,
    persona_confidence: 0.6,
    stress_level: stressLevel,
    burden_themes: ["performance_of_okayness"],
    recognition_message: messages[persona],
    micro_intervention: interventions[persona],
    crisis_detected: false,
    crisis_keywords: [],
  };
}
