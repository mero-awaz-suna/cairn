"""
cairn/core/persona.py

The Persona Engine — heart of the Cairn system.

Takes a processed EntryFeatures object and updates a UserPersona in place.
All the math lives in utils.py; this module is pure orchestration.

Update order per entry:
    1. Encode identity vector from demographics (first entry only, or if demos change)
    2. Update PersonaBaseline running stats (Welford)
    3. Normalize raw features against per-user baseline
    4. EMA-update acoustic_short, acoustic_long, linguistic_short, linguistic_long
    5. EMA-update behavioral vector
    6. EMA-update stressor_dist (separate from linguistic EMA — kept clean)

Usage:
    engine = PersonaEngine()
    engine.update(persona, features, projected_acoustic)
"""

from __future__ import annotations
import sys
import json
from pathlib import Path
import hashlib
import numpy as np
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from persona.core.models import (
    AgeGroup,
    Dims,
    EntryFeatures,
    LinguisticFeatures,
    OccupationCategory,
    PersonaBaseline,
    PersonaVectors,
    UserDemographics,
    UserPersona,
)
from persona.core.config import CONFIG
from persona.core.utils import (
    ema_update,
    normalize_to_unit,
    per_user_normalize,
    update_running_stats,
    encode_hour_of_day,
    encode_memo_length,
    clip_normalize,
    softmax,
)


# ─────────────────────────────────────────────────────────────────────────────
# Identity encoding
# Fixed lookup tables — no training needed.
# Replace with learned embeddings once you have real user data.
# ─────────────────────────────────────────────────────────────────────────────

# Each entry is a 4-dim vector. Values are hand-designed to place similar
# age groups close together in embedding space, not just one-hot.
# Format: age_group → [dim0, dim1, dim2, dim3]
_AGE_GROUP_EMBEDDINGS: dict[AgeGroup, list[float]] = {
    AgeGroup.EARLY_20S: [1.0, 0.5, 0.0, 0.0],
    AgeGroup.LATE_20S: [0.6, 1.0, 0.3, 0.0],
    AgeGroup.THIRTIES: [0.2, 0.6, 1.0, 0.3],
    AgeGroup.FORTIES: [0.0, 0.2, 0.7, 1.0],
    AgeGroup.OLDER: [0.0, 0.0, 0.3, 1.0],
}

# Occupation embeddings: 4 dims.
# Axis 0: seniority (low→high), Axis 1: structure (structured→autonomous),
# Axis 2: income-stability (low→high), Axis 3: identity-investment (low→high)
_OCCUPATION_EMBEDDINGS: dict[OccupationCategory, list[float]] = {
    OccupationCategory.STUDENT: [0.0, 0.3, 0.0, 1.0],
    OccupationCategory.EARLY_CAREER: [0.2, 0.6, 0.4, 0.8],
    OccupationCategory.MID_CAREER: [0.6, 0.5, 0.7, 0.6],
    OccupationCategory.LEADERSHIP: [1.0, 0.4, 1.0, 0.7],
    OccupationCategory.FREELANCE: [0.5, 1.0, 0.3, 0.5],
    OccupationCategory.OTHER: [0.3, 0.5, 0.5, 0.3],
}

# Industry clusters — map free-text industry to one of 10 buckets, then embed.
# Bucket assignment uses a hash of the lowercased industry string so it's
# deterministic without a lookup table. Adjust the keyword map as you grow.
_INDUSTRY_KEYWORDS: dict[str, int] = {
    "tech": 0,
    "software": 0,
    "engineering": 0,
    "it": 0,
    "finance": 1,
    "banking": 1,
    "investment": 1,
    "accounting": 1,
    "health": 2,
    "medical": 2,
    "hospital": 2,
    "pharma": 2,
    "education": 3,
    "school": 3,
    "university": 3,
    "teaching": 3,
    "creative": 4,
    "design": 4,
    "media": 4,
    "art": 4,
    "retail": 5,
    "sales": 5,
    "commerce": 5,
    "shop": 5,
    "legal": 6,
    "law": 6,
    "government": 6,
    "policy": 6,
    "nonprofit": 7,
    "ngo": 7,
    "social": 7,
    "community": 7,
    "construction": 8,
    "real estate": 8,
    "logistics": 8,
    "transport": 8,
}

# 10 industry buckets → 4-dim embeddings.
# Axes: 0=stability, 1=prestige-perception, 2=autonomy, 3=social-impact
_INDUSTRY_BUCKET_EMBEDDINGS: list[list[float]] = [
    [0.6, 1.0, 0.8, 0.4],  # 0: tech
    [0.9, 0.8, 0.5, 0.3],  # 1: finance
    [0.7, 0.7, 0.6, 1.0],  # 2: health
    [0.7, 0.5, 0.5, 0.9],  # 3: education
    [0.3, 0.6, 1.0, 0.6],  # 4: creative
    [0.6, 0.3, 0.4, 0.4],  # 5: retail/sales
    [0.8, 0.8, 0.5, 0.5],  # 6: legal/gov
    [0.4, 0.4, 0.5, 1.0],  # 7: nonprofit
    [0.7, 0.4, 0.5, 0.3],  # 8: construction/logistics
    [0.5, 0.5, 0.5, 0.5],  # 9: other (catch-all)
]

# language_code → scalar in [0, 1].
# Not arbitrary — loosely clusters by writing system / script family
# so users of the same language sit close in the identity space.
_LANGUAGE_SCALARS: dict[str, float] = {
    "en": 0.10,
    "fr": 0.15,
    "de": 0.18,
    "es": 0.12,
    "pt": 0.13,
    "it": 0.16,
    "nl": 0.17,
    "ru": 0.40,
    "uk": 0.41,
    "pl": 0.38,
    "zh": 0.60,
    "ja": 0.65,
    "ko": 0.62,
    "vi": 0.63,
    "th": 0.64,
    "ar": 0.75,
    "fa": 0.76,
    "ur": 0.77,
    "hi": 0.70,
    "ne": 0.71,
    "bn": 0.72,
    "ta": 0.73,
    "sw": 0.80,
    "am": 0.82,
}

# region_code → scalar in [0, 1].
# Loosely clusters by geographic region. Not cultural judgement —
# just ensures users from the same region have similar identity vectors.
_REGION_SCALARS: dict[str, float] = {
    "US": 0.10,
    "CA": 0.11,
    "GB": 0.20,
    "AU": 0.21,
    "NZ": 0.22,
    "DE": 0.30,
    "FR": 0.31,
    "IT": 0.32,
    "ES": 0.33,
    "NL": 0.34,
    "IN": 0.50,
    "NP": 0.51,
    "BD": 0.52,
    "PK": 0.53,
    "LK": 0.54,
    "CN": 0.60,
    "JP": 0.61,
    "KR": 0.62,
    "SG": 0.63,
    "TH": 0.64,
    "NG": 0.70,
    "KE": 0.71,
    "GH": 0.72,
    "ET": 0.73,
    "ZA": 0.74,
    "BR": 0.80,
    "MX": 0.81,
    "AR": 0.82,
    "CO": 0.83,
    "CL": 0.84,
}

# living_situation → 2-dim vector.
# Axis 0: social density (alone=0, crowded=1)
# Axis 1: relational intimacy (strangers=0, family=1)
_LIVING_SITUATION_EMBEDDINGS: dict[str, list[float]] = {
    "alone": [0.0, 0.0],
    "partner": [0.4, 1.0],
    "family": [0.8, 1.0],
    "roommates": [0.7, 0.2],
}


# ─────────────────────────────────────────────────────────────────────────────
# Identity encoder
# ─────────────────────────────────────────────────────────────────────────────


def encode_industry(industry_text: str) -> int:
    """
    Map a free-text industry string to one of 10 buckets.
    Keyword match first; hash fallback for unrecognized values.
    """
    lower = industry_text.lower()
    for keyword, bucket in _INDUSTRY_KEYWORDS.items():
        if keyword in lower:
            return bucket
    # Deterministic hash fallback — unrecognized industries get consistent bucket
    h = int(hashlib.md5(lower.encode()).hexdigest(), 16)
    return h % 9  # buckets 0–8; bucket 9 reserved for catch-all above


def encode_identity(demographics: UserDemographics) -> np.ndarray:
    """
    Convert UserDemographics into a 16-dim identity vector.

    Layout (matches design doc):
        [age_group_emb (4), occupation_emb (4), industry_emb (4),
         language_id (1), region_cluster (1), living_situation (2)]

    Returns: shape (16,), float32, L2-normalized.
    """
    # Age group — 4 dims
    age_emb = np.array(
        _AGE_GROUP_EMBEDDINGS.get(demographics.age_group, [0.5, 0.5, 0.5, 0.5]),
        dtype=np.float32,
    )

    # Occupation — 4 dims
    occ_emb = np.array(
        _OCCUPATION_EMBEDDINGS.get(demographics.occupation, [0.5, 0.5, 0.5, 0.5]),
        dtype=np.float32,
    )

    # Industry — 4 dims via bucket lookup
    industry_bucket = encode_industry(demographics.industry)
    ind_emb = np.array(
        _INDUSTRY_BUCKET_EMBEDDINGS[industry_bucket],
        dtype=np.float32,
    )

    # Language — 1 dim
    lang_scalar = _LANGUAGE_SCALARS.get(
        demographics.language_code.lower(),
        # Unknown language: hash to a scalar so same language → same value
        (
            int(
                hashlib.md5(demographics.language_code.lower().encode()).hexdigest(), 16
            )
            % 100
        )
        / 100.0,
    )

    # Region — 1 dim
    region_scalar = _REGION_SCALARS.get(
        demographics.region_code.upper(),
        (
            int(hashlib.md5(demographics.region_code.upper().encode()).hexdigest(), 16)
            % 100
        )
        / 100.0,
    )

    # Living situation — 2 dims
    living_emb = np.array(
        _LIVING_SITUATION_EMBEDDINGS.get(
            demographics.living_situation.lower(),
            [0.5, 0.5],  # unknown → neutral
        ),
        dtype=np.float32,
    )

    # Concatenate → (16,)
    identity_vec = np.concatenate(
        [
            age_emb,
            occ_emb,
            ind_emb,
            [lang_scalar],
            [region_scalar],
            living_emb,
        ]
    ).astype(np.float32)

    assert identity_vec.shape == (
        Dims.IDENTITY,
    ), f"Identity vector shape mismatch: {identity_vec.shape}"

    # L2-normalize so cosine similarity is meaningful
    return normalize_to_unit(identity_vec)


# ─────────────────────────────────────────────────────────────────────────────
# Behavioral encoder
# ─────────────────────────────────────────────────────────────────────────────


def encode_behavioral(
    features: EntryFeatures,
    baseline: PersonaBaseline,
    streak_days: int = 1,
) -> np.ndarray:
    """
    Build the 4-dim behavioral vector for this entry.

    Layout:
        [streak_norm, hour_weight, memo_length_norm, confidence_weight]

    All dims in [0, 1].

    streak_days: number of consecutive days the user has submitted memos.
                 Caller is responsible for tracking this (stored in UserPersona metadata).
    """
    # Dim 0: streak — normalized against 30 days (a full month of daily use)
    streak_norm = clip_normalize(streak_days, min_val=1.0, max_val=30.0)

    # Dim 1: hour of day — encode_hour_of_day returns [0, 1] already
    hour_weight = encode_hour_of_day(features.hour_of_day)

    # Dim 2: memo length — already normalized in utils
    memo_length_norm = encode_memo_length(features.memo_length_seconds)

    # Dim 3: persona confidence — how established is this user's persona?
    # Grows from 0 → 1 as entry_count increases. τ=5 (see PersonaBaseline)
    confidence = baseline.confidence_weight

    return np.array(
        [streak_norm, hour_weight, memo_length_norm, confidence],
        dtype=np.float32,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Raw feature vector for baseline normalization
# ─────────────────────────────────────────────────────────────────────────────


def _pack_raw_features(
    acoustic_projected: np.ndarray,
    linguistic: LinguisticFeatures,
) -> np.ndarray:
    """
    Pack the 22 scalar features that are tracked in PersonaBaseline.
    These are the values BEFORE EMA, used for per-user normalization.

    Layout (22 dims):
        acoustic_mean_abs (1)  — mean absolute value of projected acoustic vector
        acoustic_std (1)       — std of projected acoustic vector
        valence (1)
        arousal (1)
        agency_score (1)
        distortion_score (1)
        coping_score (1)
        past_orientation (1)
        present_orientation (1)
        future_orientation (1)
        stressor_dist (8)      — full stressor distribution
        urgency_signal (1)
        help_seeking_signal (1)
        = 22 dims total

    We normalize the acoustic block by its own statistics and include
    two summary scalars rather than the full 64-dim vector — the baseline
    stats are used for acoustic *trajectory* detection, not raw features.
    """
    ling = linguistic
    acoustic_summary = np.array(
        [
            float(np.mean(np.abs(acoustic_projected))),
            float(np.std(acoustic_projected)),
        ],
        dtype=np.float32,
    )

    linguistic_scalars = np.array(
        [
            ling.valence,
            ling.arousal,
            ling.agency_score,
            ling.distortion_score,
            ling.coping_score,
            ling.past_orientation,
            ling.present_orientation,
            ling.future_orientation,
        ],
        dtype=np.float32,
    )

    raw = np.concatenate(
        [
            acoustic_summary,  # 2
            linguistic_scalars,  # 8
            ling.stressor_dist,  # 8
            [ling.urgency_signal, ling.help_seeking_signal],  # 2
        ]
    ).astype(np.float32)

    # 2 + 8 + 8 + 2 = 20 dims
    assert raw.shape == (20,), f"Raw feature vector shape mismatch: {raw.shape}"
    return raw


def _pack_linguistic_vector(linguistic: LinguisticFeatures) -> np.ndarray:
    """
    Pack LinguisticFeatures into the 16-dim linguistic vector that feeds
    into the EMA update.

    Layout (matches design doc):
        [valence, arousal, agency, distortion, coping,
         temporal_orientation (3 collapsed to 2 dims — past and future,
         present is implicit as 1 - past - future),
         stressor_dist (8),
         urgency_signal, help_seeking_signal]
        = 1+1+1+1+1+2+8+1+1 = 17... adjusted below.

    Wait — design doc says 16 dims total for the linguistic block.
    The 16 named fields in the design doc are:
        valence, arousal, agency, distortion, coping,
        temporal_orientation (1 scalar: future - past, captures direction),
        stressor x8,
        urgency, help_seeking
        = 5 + 1 + 8 + 2 = 16 ✓

    We collapse temporal to a single scalar: future_orientation - past_orientation.
    Positive = forward-looking. Negative = ruminative.
    """
    ling = linguistic
    temporal_scalar = float(ling.future_orientation - ling.past_orientation)

    vec = np.array(
        [
            ling.valence,
            ling.arousal,
            ling.agency_score,
            ling.distortion_score,
            ling.coping_score,
            temporal_scalar,
            *ling.stressor_dist,  # 8 dims
            ling.urgency_signal,
            ling.help_seeking_signal,
        ],
        dtype=np.float32,
    )

    assert vec.shape == (
        Dims.LINGUISTIC,
    ), f"Linguistic vector shape mismatch: {vec.shape} — expected ({Dims.LINGUISTIC},)"
    return vec


# ─────────────────────────────────────────────────────────────────────────────
# The Persona Engine
# ─────────────────────────────────────────────────────────────────────────────


class PersonaEngine:
    """
    Stateless updater — takes a UserPersona and an EntryFeatures, returns
    the same persona object with all vectors updated in place.

    Stateless means you can share one instance across all users.
    All state lives in UserPersona.

    Usage:
        engine = PersonaEngine()

        # On each new voice memo:
        engine.update(
            persona=user_persona,
            features=entry_features,
            projected_acoustic=extractor.project(features.acoustic.embedding),
            streak_days=compute_streak(user_persona),
        )
    """

    def update(
        self,
        persona: UserPersona,
        features: EntryFeatures,
        projected_acoustic: np.ndarray,
        streak_days: int = 1,
    ) -> UserPersona:
        """
        Full persona update for one voice memo entry.

        Args:
            persona:            the UserPersona to update (mutated in place)
            features:           extracted features from the new entry
            projected_acoustic: wav2vec2 embedding projected to 64 dims
                                (output of AcousticExtractor.project())
            streak_days:        consecutive days of submissions for this user

        Returns:
            the same persona object (mutated), for chaining convenience.
        """
        assert projected_acoustic.shape == (Dims.ACOUSTIC,), (
            f"Expected projected acoustic shape ({Dims.ACOUSTIC},), "
            f"got {projected_acoustic.shape}"
        )

        # ── Step 1: Identity vector ───────────────────────────────────────
        # Only compute on first entry, or if demographics change.
        # Identity almost never changes — don't re-encode every entry.
        if persona.entry_count == 0 or np.all(persona.vectors.identity == 0):
            persona.vectors.identity = encode_identity(persona.demographics)

        # ── Step 2: Update baseline running stats (Welford) ───────────────
        raw_features = _pack_raw_features(projected_acoustic, features.linguistic)

        (
            persona.baseline.feature_mean,
            persona.baseline.feature_std,
            persona.baseline.n_samples,
        ) = update_running_stats(
            mean=persona.baseline.feature_mean,
            std=persona.baseline.feature_std,
            n=persona.baseline.n_samples,
            new_value=raw_features,
        )

        # ── Step 3: Per-user normalization ────────────────────────────────
        # On the very first entry, baseline std is zero — skip normalization.
        # From entry 2 onward, normalize against the user's own history.
        if persona.baseline.n_samples > 1:
            normalized_raw = per_user_normalize(
                raw_features,
                persona.baseline.feature_mean,
                persona.baseline.feature_std,
            )
            # Clip to [-3, 3] — beyond 3 std deviations is noise, not signal
            normalized_raw = np.clip(normalized_raw, -3.0, 3.0)
            # Re-scale to [0, 1] for the EMA update
            # (EMA vectors are in [0,1] space per the linguistic features)
            normalized_raw = (normalized_raw + 3.0) / 6.0
        else:
            normalized_raw = raw_features

        # ── Step 4: EMA update — acoustic ────────────────────────────────
        # Acoustic short/long use the projected 64-dim vector directly.
        # Normalization for acoustic happens implicitly via L2 norm in extractor.
        confidence = persona.baseline.confidence_weight

        persona.vectors.acoustic_short = ema_update(
            current=persona.vectors.acoustic_short,
            new_value=projected_acoustic,
            alpha=CONFIG.ema.acoustic_short,
            confidence_weight=confidence,
        )
        persona.vectors.acoustic_long = ema_update(
            current=persona.vectors.acoustic_long,
            new_value=projected_acoustic,
            alpha=CONFIG.ema.acoustic_long,
            confidence_weight=confidence,
        )

        # ── Step 5: EMA update — linguistic ──────────────────────────────
        # Pack the 16-dim linguistic vector and EMA-update it.
        linguistic_vec = _pack_linguistic_vector(features.linguistic)

        persona.vectors.linguistic_short = ema_update(
            current=persona.vectors.linguistic_short,
            new_value=linguistic_vec,
            alpha=CONFIG.ema.linguistic_short,
            confidence_weight=confidence,
        )
        persona.vectors.linguistic_long = ema_update(
            current=persona.vectors.linguistic_long,
            new_value=linguistic_vec,
            alpha=CONFIG.ema.linguistic_long,
            confidence_weight=confidence,
        )

        # ── Step 6: EMA update — stressor distribution ───────────────────
        # Kept as a clean separate EMA on the raw 8-dim stressor dist.
        # This is what matching uses — cleaner than slicing linguistic_short.
        persona.stressor_dist = ema_update(
            current=persona.stressor_dist,
            new_value=features.linguistic.stressor_dist.astype(np.float32),
            alpha=CONFIG.ema.linguistic_short,
            confidence_weight=confidence,
        )
        # Re-normalize to sum to 1 (EMA can drift slightly)
        stressor_sum = persona.stressor_dist.sum()
        if stressor_sum > 1e-9:
            persona.stressor_dist /= stressor_sum

        # ── Step 7: EMA update — behavioral ──────────────────────────────
        behavioral_vec = encode_behavioral(features, persona.baseline, streak_days)

        persona.vectors.behavioral = ema_update(
            current=persona.vectors.behavioral,
            new_value=behavioral_vec,
            alpha=CONFIG.ema.behavioral,
            confidence_weight=confidence,
        )

        # ── Step 8: Update metadata ───────────────────────────────────────
        persona.entry_count += 1
        persona.last_entry_time = features.timestamp

        return persona

    def initialize_identity(self, persona: UserPersona) -> UserPersona:
        """
        Encode and set the identity vector without processing an entry.
        Call this at onboarding, right after demographics are collected.
        """
        persona.vectors.identity = encode_identity(persona.demographics)
        return persona


# ─────────────────────────────────────────────────────────────────────────────
# Convenience: build a fresh UserPersona from demographics
# ─────────────────────────────────────────────────────────────────────────────


def create_persona(user_id: str, demographics: UserDemographics) -> UserPersona:
    """
    Factory — creates a fresh UserPersona with identity vector pre-encoded.
    Call this at onboarding.

    The persona starts with zero vectors everywhere except identity.
    All EMA vectors fill in after the first entry.
    """
    from persona.core.models import PersonaVectors, PersonaBaseline, StageState

    # RAW_FEATURE_DIM = 20: 2 acoustic summary + 8 linguistic + 8 stressor + 2 urgency
    RAW_FEATURE_DIM = 20

    persona = UserPersona(
        user_id=user_id,
        demographics=demographics,
        vectors=PersonaVectors(),
        baseline=PersonaBaseline(
            feature_mean=np.zeros(RAW_FEATURE_DIM, dtype=np.float32),
            feature_std=np.ones(RAW_FEATURE_DIM, dtype=np.float32),
        ),
        stage=StageState(),
    )
    persona.vectors.identity = encode_identity(demographics)
    return persona


# ─────────────────────────────────────────────────────────────────────────────
# Quick smoke test
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import time
    from persona.core.models import (
        AcousticFeatures,
        EntryFeatures,
        LinguisticFeatures,
        RawEntry,
        Stage,
        AgeGroup,
        OccupationCategory,
    )

    print("=" * 60)
    print("Persona Engine — smoke test")
    print("=" * 60)

    # 1. Build demographics
    demographics = UserDemographics(
        age_group=AgeGroup.LATE_20S,
        occupation=OccupationCategory.EARLY_CAREER,
        industry="software engineering",
        language_code="ne",
        region_code="NP",
        living_situation="family",
    )

    # 2. Create persona
    persona = create_persona(user_id="test_user_001", demographics=demographics)

    print(f"\nIdentity vector (16 dims):")
    print(f"  {np.round(persona.vectors.identity, 3)}")
    print(f"  norm: {np.linalg.norm(persona.vectors.identity):.4f}  (should be ~1.0)")

    # 3. Build a mock entry
    rng = np.random.RandomState(42)
    mock_acoustic_projected = rng.randn(64).astype(np.float32)
    mock_acoustic_projected /= np.linalg.norm(mock_acoustic_projected)

    mock_linguistic = LinguisticFeatures(
        valence=0.35,
        arousal=0.60,
        agency_score=0.40,
        distortion_score=0.55,
        coping_score=0.30,
        past_orientation=0.50,
        present_orientation=0.30,
        future_orientation=0.20,
        stressor_dist=np.array(
            [0.0, 0.6, 0.1, 0.1, 0.1, 0.0, 0.1, 0.0], dtype=np.float32
        ),
        urgency_signal=0.20,
        help_seeking_signal=0.40,
    )

    mock_acoustic_raw = AcousticFeatures(
        embedding=rng.randn(768).astype(np.float32),
        duration_sec=75.0,
    )

    entry = EntryFeatures(
        user_id="test_user_001",
        timestamp=time.time(),
        day_number=1,
        acoustic=mock_acoustic_raw,
        linguistic=mock_linguistic,
        memo_length_seconds=75.0,
        hour_of_day=22,
    )

    # 4. Run engine
    engine = PersonaEngine()

    print(f"\nRunning 3 entries...")
    for i in range(3):
        entry.day_number = i + 1
        entry.timestamp = time.time() + i * 86400
        engine.update(
            persona=persona,
            features=entry,
            projected_acoustic=mock_acoustic_projected,
            streak_days=i + 1,
        )
        print(f"\n  Entry {i+1}:")
        print(f"    entry_count:       {persona.entry_count}")
        print(f"    confidence_weight: {persona.baseline.confidence_weight:.4f}")
        print(
            f"    acoustic_short[:4]: {np.round(persona.vectors.acoustic_short[:4], 4)}"
        )
        print(f"    linguistic_short:  {np.round(persona.vectors.linguistic_short, 3)}")
        print(f"    stressor_dist:     {np.round(persona.stressor_dist, 3)}")
        print(f"    behavioral:        {np.round(persona.vectors.behavioral, 3)}")
        print(f"    trajectory[:4]:    {np.round(persona.vectors.trajectory[:4], 4)}")
        print(f"    trajectory_stress: {persona.trajectory_stress:.4f}")
        print(f"    trajectory_recov:  {persona.trajectory_recovery:.4f}")

    print(
        f"\nFull vector shape: {persona.vectors.full_vector.shape}  (should be (100,))"
    )
    print(
        f"State vector shape: {persona.vectors.state_vector.shape}  (should be (80,))"
    )
    print("\nSmoke test passed.")
