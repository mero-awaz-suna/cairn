// Cairn shared constants and types

export const ACADEMIC_STAGES = [
  "just_arrived",
  "in_the_middle",
  "finding_footing",
  "helping_others",
] as const;

export const PRIMARY_BURDENS = [
  "career",
  "family",
  "belonging",
  "all_of_it",
] as const;

export const PERSONAS = ["storm", "ground", "through_it"] as const;

export const CULTURAL_CONTEXTS = [
  "nepali",
  "south_asian",
  "international",
  "universal",
] as const;

export type AcademicStage = (typeof ACADEMIC_STAGES)[number];
export type PrimaryBurden = (typeof PRIMARY_BURDENS)[number];
export type Persona = (typeof PERSONAS)[number];
export type CulturalContext = (typeof CULTURAL_CONTEXTS)[number];
