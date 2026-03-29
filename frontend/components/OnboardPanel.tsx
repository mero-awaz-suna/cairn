"use client";

import { FormEvent, useState } from "react";
import { getStoredToken } from "@/lib/auth-client";
import { buildApiUrl } from "@/lib/api-base";
import styles from "./OnboardPanel.module.css";

const AGE_GROUPS = [
  { value: "early_20s", label: "18–23 years old" },
  { value: "late_20s", label: "24–29 years old" },
  { value: "thirties", label: "30–39 years old" },
  { value: "forties", label: "40–49 years old" },
  { value: "older", label: "50+ years old" },
];

const OCCUPATIONS = [
  { value: "student", label: "Student" },
  { value: "early_career", label: "Early Career" },
  { value: "mid_career", label: "Mid Career" },
  { value: "leadership", label: "Leadership" },
  { value: "freelance", label: "Freelance" },
  { value: "other", label: "Other" },
];

const LIVING_SITUATIONS = [
  { value: "alone", label: "Living alone" },
  { value: "partner", label: "Living with a partner" },
  { value: "family", label: "Living with family" },
  { value: "roommates", label: "Living with roommates" },
];

type OnboardFormData = {
  age_group: string;
  occupation: string;
  industry: string;
  language_code: string;
  region_code: string;
  living_situation: string;
};

type OnboardPanelProps = {
  onOnboardingComplete: () => void;
};

export default function OnboardPanel({ onOnboardingComplete }: OnboardPanelProps) {
  const [formData, setFormData] = useState<OnboardFormData>({
    age_group: "",
    occupation: "",
    industry: "",
    language_code: "en",
    region_code: "US",
    living_situation: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  function handleChange(field: keyof OnboardFormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Validate all required fields
    if (
      !formData.age_group ||
      !formData.occupation ||
      !formData.industry.trim() ||
      !formData.language_code.trim() ||
      !formData.region_code.trim() ||
      !formData.living_situation
    ) {
      setError("Please fill in all fields.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const token = getStoredToken();
      if (!token) {
        throw new Error("Authentication required. Please log in again.");
      }

      const response = await fetch(buildApiUrl("/users/me/persona/onboard"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = (await response.json().catch(() => null)) as {
        user_id?: string;
        status?: string;
        message?: string;
        detail?: string;
      } | null;

      if (!response.ok) {
        throw new Error(data?.message ?? data?.detail ?? "Onboarding failed. Please try again.");
      }

      // Success or existing persona — proceed to main app.
      onOnboardingComplete();
    } catch (apiError) {
      const message = apiError instanceof Error ? apiError.message : "Onboarding failed. Please try again.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.card}>
          <p className={styles.eyebrow}>Step 1 of 1</p>
          <h2 className={styles.title}>Welcome to Cairn</h2>
          <p className={styles.sub}>
            Tell us a bit about yourself so we can personalize your experience.
          </p>
          <div className={styles.metaRow}>
            <span className={styles.metaPill}>Required profile setup</span>
            <span className={styles.metaPill}>Takes less than a minute</span>
          </div>

          <form onSubmit={handleSubmit} noValidate className={styles.form}>
            <div className={styles.twoCol}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="age-group">
                  Age Group *
                </label>
                <select
                  id="age-group"
                  className={styles.select}
                  value={formData.age_group}
                  onChange={(e) => handleChange("age_group", e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="">Select your age group</option>
                  {AGE_GROUPS.map((group) => (
                    <option key={group.value} value={group.value}>
                      {group.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="occupation">
                  Occupation *
                </label>
                <select
                  id="occupation"
                  className={styles.select}
                  value={formData.occupation}
                  onChange={(e) => handleChange("occupation", e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="">Select your occupation</option>
                  {OCCUPATIONS.map((occ) => (
                    <option key={occ.value} value={occ.value}>
                      {occ.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Industry */}
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="industry">
                Industry or Field *
              </label>
              <input
                id="industry"
                type="text"
                className={styles.input}
                placeholder="e.g., software, healthcare, education"
                value={formData.industry}
                onChange={(e) => handleChange("industry", e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className={styles.twoCol}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="language">
                  Language Code *
                </label>
                <input
                  id="language"
                  type="text"
                  className={styles.input}
                  placeholder="e.g., en, es, fr"
                  value={formData.language_code}
                  onChange={(e) => handleChange("language_code", e.target.value)}
                  disabled={isSubmitting}
                />
                <p className={styles.hint}>ISO 639-1 code (e.g., en, ne, hi)</p>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="region">
                  Region Code *
                </label>
                <input
                  id="region"
                  type="text"
                  className={styles.input}
                  placeholder="e.g., US, NP, IN"
                  value={formData.region_code}
                  onChange={(e) => handleChange("region_code", e.target.value)}
                  disabled={isSubmitting}
                />
                <p className={styles.hint}>ISO 3166-1 code (e.g., US, NP, IN)</p>
              </div>
            </div>

            {/* Living Situation */}
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="living-situation">
                Living Situation *
              </label>
              <select
                id="living-situation"
                className={styles.select}
                value={formData.living_situation}
                onChange={(e) => handleChange("living_situation", e.target.value)}
                disabled={isSubmitting}
              >
                <option value="">Select your living situation</option>
                {LIVING_SITUATIONS.map((sit) => (
                  <option key={sit.value} value={sit.value}>
                    {sit.label}
                  </option>
                ))}
              </select>
            </div>

            {error ? <p className={styles.error}>{error}</p> : null}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Setting up your profile..." : "Complete Setup"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
